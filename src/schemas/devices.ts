import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class DevicesSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const OsInfoSchema = new Schema(
    {
        name: {
            // 'Windows 11 Pro', 'macOS Sonoma' 등
            type: String
        },
        serial_number: {
            // OS 제품 키 또는 일련번호
            type: String
        }
    },
    {_id: false}
);

const Devices = new DevicesSchema('devices', {
    asset_number: {
        // 자산 번호
        type: String,
        required: true,
        unique: true
    },
    type: {
        // 기기 종류
        type: String,
        enum: ['PC', 'Notebook', 'Monitor', 'Phone', '내선전화'],
        required: true
    },
    status: {
        // 자산 상태
        type: String,
        enum: ['사용중', '재고', '수리중', '폐기'],
        default: '재고'
    },

    // --- 네트워크 및 OS 정보 ---
    ip_address: {
        // 고정 IP 주소
        type: String,
        default: null
    },
    os_info: OsInfoSchema, // OS 정보 (PC, Notebook에만 사용)

    // --- 관계 정보 ---
    assigned_to: {
        // 사용자 할당 정보
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    parent_asset: {
        // 부모 자산과의 관계
        type: Schema.Types.ObjectId,
        ref: 'Device',
        default: null
    }
});

export {Devices};
