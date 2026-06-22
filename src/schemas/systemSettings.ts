import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';
import UniPostCipher from '../cipher/UniPostCipher.js';
import ApiReturn from '../structure/ApiReturn.js';

class SystemSettingsSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType) {
        if (params.data && Array.isArray(params.data.tableData)) {
            for (const item of params.data.tableData) {
                if (item.value) {
                    item.value = UniPostCipher.getInstance().encrypt(item.value);
                }
            }
        }
        return super.insert(params);
    }

    async update(params: DBParamsType) {
        if (params.data && Array.isArray(params.data.tableData)) {
            for (const item of params.data.tableData) {
                if (item.value) {
                    item.value = UniPostCipher.getInstance().encrypt(item.value);
                }
            }
        }
        return super.update(params);
    }

    async findAll(params: DBParamsType) {
        // 부모의 findAll을 호출하여 데이터를 받아옴
        const apiReturn = await super.findAll(params);
        const data = apiReturn.getTableData();

        // 프론트엔드(관리자 화면)에 뿌려줄 때는 복호화해서 평문으로 제공
        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.value) {
                    try {
                        item.value = UniPostCipher.getInstance().decrypt(item.value);
                    } catch (e) {
                        // 아직 암호화되지 않은 기존 평문 데이터의 복호화 실패 시 그대로 유지
                        console.warn(`[SystemSettings] 복호화 실패 (${item.key}), 평문 데이터로 간주합니다.`);
                    }
                }
            }
        }

        apiReturn.setTableData(data);
        return apiReturn;
    }
}

const systemSettingsSchemaDefinition = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        description: "설정 키 (e.g., 'JWT_SECRET', 'SLACK_TOKEN')"
    },
    value: {
        type: String,
        required: true,
        description: '설정 값'
    },
    description: {
        type: String,
        description: '설정에 대한 설명 (어드민 화면 표시용)'
    }
});

// 설정값이 생성/수정/삭제될 때 캐시를 강제로 리로드하여 무중단 적용합니다.
const reloadCache = async () => {
    const SystemSettingsCacheService = (await import('../service/SystemSettingsCacheService.js')).default;
    await SystemSettingsCacheService.loadSettings();
};

systemSettingsSchemaDefinition.post('save', reloadCache);
systemSettingsSchemaDefinition.post('findOneAndUpdate', reloadCache);
systemSettingsSchemaDefinition.post('findOneAndDelete', reloadCache);

const SystemSettings = new SystemSettingsSchema('systemSettings', systemSettingsSchemaDefinition);

export {SystemSettings};

