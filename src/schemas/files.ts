import mongoose, {Schema, Document, Model} from 'mongoose';

export interface IFile extends Document {
    fileGroupId: string; // 첨부파일 그룹 ID (프론트엔드에서 폼 제출 시 엮을 ID)
    originalName: string; // 원본 파일명 (다운로드 시 사용)
    savedName: string; // 저장된 고유 파일명 (UUID)
    size: number; // 파일 크기 (bytes)
    mimeType: string; // MIME 타입 (예: application/pdf)
    uploaderId: string; // 업로더 이메일 또는 ID
    uploadDate: Date; // 업로드 일시
    status: 'TEMP' | 'SAVED' | 'DELETED'; // 임시 여부, 저장 여부, 삭제 여부
    updatedAt?: Date; // 상태 변경 일시 (소프트 삭제 시점 등)
}

const fileSchema: Schema = new Schema(
    {
        fileGroupId: {
            type: String,
            required: true,
            index: true // 그룹 ID로 파일 목록을 빠르게 조회하기 위해 인덱스 추가
        },
        originalName: {
            type: String,
            required: true
        },
        savedName: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        mimeType: {
            type: String,
            required: true
        },
        uploaderId: {
            type: String,
            required: true
        },
        uploadDate: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['TEMP', 'SAVED', 'DELETED'],
            default: 'TEMP',
            description: 'TEMP: 임시, SAVED: 확정, DELETED: 삭제(휴지통 대기)'
        }
    },
    {
        collection: 'files', // MongoDB 컬렉션 이름 지정
        timestamps: true // updatedAt 관리를 위해 자동 타임스탬프 활성화
    }
);

export const Files: Model<IFile> = mongoose.model<IFile>('Files', fileSchema);
