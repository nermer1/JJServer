import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import crypto from 'crypto';
import SystemSettingsCacheService from '../service/SystemSettingsCacheService.js';
import logger from '../utils/logger.js';

// 위험한 확장자 목록 (소문자로 비교)
const FORBIDDEN_EXTENSIONS = [
    '.exe', '.sh', '.bat', '.cmd', '.msi', 
    '.php', '.jsp', '.asp', '.aspx', 
    '.cgi', '.pl', '.py', '.js', '.vbs'
];

// Multer 스토리지 설정
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        try {
            // 시스템 세팅에서 최상위 업로드 경로 가져오기 (기본값 설정)
            const basePath = SystemSettingsCacheService.get('FILE_UPLOAD_PATH', 'C:/uploads');
            
            // URL 파라미터에서 fileGroupId 추출 (안전 장치로 없으면 default 폴더)
            const fileGroupId = req.params.fileGroupId || 'default';
            
            // 최종 저장 경로: /최상위경로/fileGroupId/
            const uploadPath = path.join(basePath, fileGroupId);
            
            // 폴더가 없으면 생성 (재귀적 생성)
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        } catch (error: any) {
            logger.error(`[Upload Middleware] 업로드 폴더 접근 실패: ${error.message}`);
            cb(error, '');
        }
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // 확장자 추출
        const ext = path.extname(file.originalname);
        // 고유 난수(UUID) 기반 저장 파일명 생성
        const savedName = crypto.randomUUID() + ext;
        cb(null, savedName);
    }
});

// 파일 필터링 설정 (확장자 차단)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // 1. 확장자가 없는 경우 차단
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
        return cb(new Error('확장자가 없는 파일은 업로드할 수 없습니다.'));
    }

    // 2. 위험 확장자 차단
    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
        return cb(new Error(`보안상 금지된 확장자(${ext})입니다.`));
    }

    cb(null, true); // 성공 시 true
};

// Multer 인스턴스 생성
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 - 1 // 10MB 미만 제한
    }
});
