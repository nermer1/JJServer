import express from 'express';
import FileController from '../controller/FileController.js';
import {upload} from '../middleware/uploadMiddleware.js';

const router = express.Router();

// 업로드 라우터: 'file'이라는 필드명으로 전송된 단일 파일을 처리
router.post('/upload/:fileGroupId', upload.single('file'), FileController.uploadFile.bind(FileController));

// 특정 파일 그룹의 파일 리스트 메타데이터 조회
router.get('/group/:fileGroupId', FileController.getFilesByGroup.bind(FileController));

// 파일 원본 다운로드
router.get('/download/:fileId', FileController.downloadFile.bind(FileController));

// 개별 파일 삭제 (Soft Delete)
router.delete('/delete/:fileId', FileController.deleteFile.bind(FileController));

// 임시 파일들을 저장 확정(SAVED) 상태로 변경
router.post('/confirm/:fileGroupId', FileController.confirmFiles.bind(FileController));

// [관리자용] 임시 파일 강제 정리 (Garbage Collection)
router.post('/cleanup', FileController.cleanupTempFiles.bind(FileController));

export {router};

