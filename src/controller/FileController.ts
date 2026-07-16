import {Request, Response} from 'express';
import fs from 'fs';
import path from 'path';
import {Files} from '../schemas/files.js';
import ApiReturn from '../structure/ApiReturn.js';
import logger from '../utils/logger.js';
import SystemSettingsCacheService from '../service/SystemSettingsCacheService.js';
import {DBLogger} from '../utils/DBLogger.js';

class FileController {
    /**
     * 파일 업로드 후 메타데이터 DB 저장
     */
    public async uploadFile(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();
        const {fileGroupId} = req.params;

        if (!req.file) {
            apiReturn.setReturnErrorMessage('업로드된 파일이 없거나 확장자/용량 제한에 의해 차단되었습니다.');
            res.status(400).json(apiReturn);
            return;
        }

        try {
            // 미들웨어(multer)를 통해 이미 파일은 디스크에 저장된 상태
            // Multer(busboy)가 기본적으로 파일명을 latin1으로 디코딩하기 때문에, 한글 파일명이 깨지는 현상을 방지하기 위해 utf8로 재디코딩합니다.
            const decodedOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

            const fileData = {
                fileGroupId,
                originalName: decodedOriginalName,
                savedName: req.file.filename,
                size: req.file.size,
                mimeType: req.file.mimetype,
                uploaderId: (req as any).user?.userId || 'SYSTEM'
            };

            const newFile = await Files.create(fileData);

            // DB에 업로드 로그 기록
            await DBLogger.log({
                category: 'FILE',
                action: '파일 업로드',
                target: 'files',
                actionType: 'CREATE',
                userId: (req as any).user?.userId || 'SYSTEM',
                details: {
                    fileId: newFile._id,
                    fileGroupId,
                    originalName: newFile.originalName,
                    size: newFile.size
                },
                status: 'SUCCESS'
            });

            apiReturn.setReturnMessage('파일이 성공적으로 업로드 되었습니다.');
            apiReturn.put('file', newFile);
            res.json(apiReturn);
        } catch (error: any) {
            logger.error(`[FileController] 업로드 DB 저장 실패: ${error.message}`);

            // DB 에러 시 업로드된 찌꺼기 파일 삭제
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) logger.error(`[FileController] 임시 파일 삭제 실패: ${err.message}`);
                });
            }

            apiReturn.setReturnErrorMessage('파일 업로드 처리 중 서버 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }

    /**
     * 특정 파일 그룹(fileGroupId)에 속한 파일 리스트 조회
     */
    public async getFilesByGroup(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();
        const {fileGroupId} = req.params;

        try {
            // 휴지통(DELETED)에 들어간 파일은 제외하고 목록을 넘겨줍니다.
            const files = await Files.find({fileGroupId, status: {$ne: 'DELETED'}})
                .sort({uploadDate: -1})
                .lean();

            apiReturn.setReturnMessage('파일 목록 조회 성공');
            apiReturn.put('files', files);
            res.json(apiReturn);
        } catch (error: any) {
            logger.error(`[FileController] 파일 목록 조회 실패: ${error.message}`);
            apiReturn.setReturnErrorMessage('파일 목록 조회 중 서버 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }

    /**
     * 특정 파일 그룹(fileGroupId)의 파일들을 저장 확정(SAVED) 상태로 변경
     */
    public async confirmFiles(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();
        const {fileGroupId} = req.params;

        try {
            await Files.updateMany(
                {fileGroupId, status: { $ne: 'DELETED' }},
                {$set: {status: 'SAVED'}}
            );

            apiReturn.setReturnMessage('파일들이 성공적으로 저장 확정되었습니다.');
            res.json(apiReturn);
        } catch (error: any) {
            logger.error(`[FileController] 파일 상태 확정 실패: ${error.message}`);
            apiReturn.setReturnErrorMessage('파일 상태 확정 중 서버 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }

    /**
     * 파일 다운로드
     */
    public async downloadFile(req: Request, res: Response): Promise<void> {
        const {fileId} = req.params;

        try {
            const fileRecord = await Files.findById(fileId);
            if (!fileRecord) {
                res.status(404).json({message: '파일 메타데이터를 찾을 수 없습니다.'});
                return;
            }

            const basePath = SystemSettingsCacheService.getRequired('FILE_UPLOAD_PATH');
            const filePath = path.join(basePath, fileRecord.fileGroupId, fileRecord.savedName);

            if (!fs.existsSync(filePath)) {
                logger.error(`[FileController] 파일이 디스크에 존재하지 않음: ${filePath}`);
                res.status(404).json({message: '파일이 서버 디스크에 존재하지 않습니다.'});
                return;
            }

            // 에디터 이미지 로드 등 불필요한 다운로드 로그 방지 (헤더 또는 쿼리 파라미터 확인)
            const isImageLoad = req.headers['sec-fetch-dest'] === 'image';
            const isSkipLog = req.query.skipLog === 'true';

            if (!isImageLoad && !isSkipLog) {
                // DB에 다운로드 로그 기록
                await DBLogger.log({
                    category: 'FILE',
                    action: '파일 다운로드',
                    target: 'files',
                    actionType: 'READ',
                    userId: (req as any).user?.userId || 'UNKNOWN',
                    details: {
                        fileId: fileRecord._id,
                        fileGroupId: fileRecord.fileGroupId,
                        originalName: fileRecord.originalName,
                        size: fileRecord.size
                    },
                    status: 'SUCCESS'
                });
            }

            // 다운로드 시 원래 이름(originalName)으로 저장되게 헤더 강제 세팅 (한글 깨짐 방지 위해 encodeURIComponent 사용)
            const encodedName = encodeURIComponent(fileRecord.originalName).replace(/'/g, '%27');
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
            res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');

            // 파일 스트림 전송
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } catch (error: any) {
            logger.error(`[FileController] 파일 다운로드 에러: ${error.message}`);
            res.status(500).json({message: '파일 다운로드 중 에러가 발생했습니다.'});
        }
    }

    /**
     * 파일 삭제 (Soft Delete: 상태를 DELETED로 변경하여 휴지통 이동)
     */
    public async deleteFile(req: Request, res: Response): Promise<void> {
        const {fileId} = req.params;
        const apiReturn = new ApiReturn();

        try {
            const fileRecord = await Files.findByIdAndUpdate(
                fileId,
                {$set: {status: 'DELETED'}},
                {new: true} // 업데이트된 문서를 반환받아 로깅에 사용
            );

            if (!fileRecord) {
                apiReturn.setReturnErrorMessage('파일 메타데이터를 찾을 수 없습니다.');
                res.status(404).json(apiReturn);
                return;
            }

            // DB에 삭제 로그 기록
            await DBLogger.log({
                category: 'FILE',
                action: '파일 삭제 (Soft Delete)',
                target: 'files',
                actionType: 'DELETE',
                userId: (req as any).user?.userId || 'UNKNOWN',
                details: {
                    fileId: fileRecord._id,
                    fileGroupId: fileRecord.fileGroupId,
                    originalName: fileRecord.originalName
                },
                status: 'SUCCESS'
            });

            apiReturn.setReturnMessage('파일이 삭제 처리(휴지통 이동) 되었습니다.');
            res.json(apiReturn);
        } catch (error: any) {
            logger.error(`[FileController] 파일 삭제 에러: ${error.message}`);
            apiReturn.setReturnErrorMessage('파일 삭제 중 서버 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }

    /**
     * 임시 파일(찌꺼기) 강제 정리 핵심 로직 (스케줄러 내부 호출용)
     */
    public async executeGarbageCollection(hoursOld: number = 24): Promise<any> {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

        // 지워야 할 대상 검색:
        // 1. 상태가 'TEMP' 이고, 업로드된 지(uploadDate) hoursOld 시간이 지난 찌꺼기 파일
        // 2. 상태가 'DELETED' 이고, 삭제된 지(updatedAt) hoursOld 시간이 지난 휴지통 파일
        const targetFiles = await Files.find({
            $or: [
                {status: 'TEMP', uploadDate: {$lt: cutoffDate}},
                {status: 'DELETED', updatedAt: {$lt: cutoffDate}}
            ]
        });

        if (targetFiles.length === 0) {
            return {deletedCount: 0, hoursOld, deletedFiles: []};
        }

        const basePath = SystemSettingsCacheService.getRequired('FILE_UPLOAD_PATH');
        let deletedCount = 0;
        const deletedFilesList: any[] = [];

        for (const fileRecord of targetFiles) {
            const filePath = path.join(basePath, fileRecord.fileGroupId, fileRecord.savedName);

            // 1. 디스크에서 물리적 파일 삭제
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // 2. DB에서 메타데이터 삭제
            await Files.findByIdAndDelete(fileRecord._id);
            deletedCount++;
            deletedFilesList.push({originalName: fileRecord.originalName, size: fileRecord.size});
        }

        logger.info(`[File GC] 임시 파일 정리 완료: 총 ${deletedCount}개 삭제 (기준: ${hoursOld}시간 전)`);

        // 스케줄러 매니저가 로그를 찍을 수 있도록 상세 정보만 반환 (로깅 책임 위임)
        return {
            hoursOld,
            deletedCount,
            deletedFiles: deletedFilesList
        };
    }

    /**
     * [관리자 API] 임시 파일(찌꺼기) 강제 정리 수동 호출
     */
    public async cleanupTempFiles(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();
        // 옵션: 몇 시간 이전의 파일을 지울 것인지 (기본 24시간)
        const hoursOld = req.body.hoursOld !== undefined ? parseInt(req.body.hoursOld, 10) : 24;

        try {
            const result = await this.executeGarbageCollection(hoursOld);

            if (result.deletedCount === 0) {
                apiReturn.setReturnMessage('정리할 임시 파일이 없습니다.');
            } else {
                apiReturn.setReturnMessage(`${result.deletedCount}개의 임시 파일이 성공적으로 정리되었습니다.`);
            }
            res.json(apiReturn);
        } catch (error: any) {
            logger.error(`[FileController] 임시 파일 정리 에러: ${error.message}`);
            apiReturn.setReturnErrorMessage('임시 파일 정리 중 에러가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }
}

export default new FileController();
