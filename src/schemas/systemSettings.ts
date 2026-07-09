import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';
import UniPostCipher from '../cipher/UniPostCipher.js';
import {externalProperty} from '../properties/ServerProperty.js';

class SystemSettingsSchema extends CommonSchema {
    public uniPostCipher = new UniPostCipher(externalProperty.getString('KEY_AES_CONST_HIDDEN'), externalProperty.getString('KEY_AES_IV_CONST_HIDDEN'));

    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType) {
        if (params.data && Array.isArray(params.data.tableData)) {
            for (const item of params.data.tableData) {
                // is_encrypted가 true(문자열 'true' 포함)일 때만 암호화
                if (item.value && (item.is_encrypted === true || item.is_encrypted === 'true')) {
                    item.value = this.uniPostCipher.encrypt(item.value);
                }
            }
        }
        return super.insert(params);
    }

    async update(params: DBParamsType) {
        if (params.data && Array.isArray(params.data.tableData)) {
            for (const item of params.data.tableData) {
                if (item.value && (item.is_encrypted === true || item.is_encrypted === 'true')) {
                    item.value = this.uniPostCipher.encrypt(item.value);
                }
            }
        }
        return super.update(params);
    }

    async findAll(params: DBParamsType) {
        // 부모의 findAll을 호출하여 데이터를 받아옴
        const apiReturn = await super.findAll(params);
        const data = apiReturn.getTableData();

        // 프론트엔드(관리자 화면)에 뿌려줄 때는 암호화 설정된 항목만 복호화해서 평문으로 제공
        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.value && (item.is_encrypted === true || item.is_encrypted === 'true')) {
                    try {
                        item.value = this.uniPostCipher.decrypt(item.value);
                    } catch (e) {
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
    is_encrypted: {
        type: Boolean,
        default: false,
        description: '암호화 저장 여부'
    },
    description: {
        type: String,
        description: '설정에 대한 설명 (어드민 화면 표시용)'
    }
});

const SystemSettings = new SystemSettingsSchema('systemSettings', systemSettingsSchemaDefinition);

export {SystemSettings};
