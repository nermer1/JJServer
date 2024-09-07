import {Schema} from 'mongoose';
import ApiReturn from '../structure/ApiReturn.js';
import {validatorUtil as validator} from '../utils/UnietangUtils.js';
import CommonSchema from './CommonSchema.js';

class CustomerEtcSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const otpSchema = new Schema(
    {
        secret: {type: String, required: true},
        mobile: {type: String, required: true},
        user: {type: String, required: true}
    },
    {_id: false}
);

const pcSchema = new Schema(
    {
        type: {
            type: String
        },
        hostname: {
            type: String
        },
        ip: {
            type: String,
            validate: {
                validator: (value: string) => validator.isIPv4(value),
                message: 'IPv4 validation failed'
            }
        },
        mac: {
            type: String,
            set: (value: string) => value.toUpperCase(),
            validate: {
                validator: (value: string) => validator.isMacAddress(value),
                message: 'Mac Address validation failed'
            }
        }
    },
    {_id: false}
);

const sshSchema = new Schema(
    {
        text: {
            type: String
        },
        listen_port: {
            type: String
        },
        connect_port: {
            type: String
        },
        ip: {
            type: String
        }
    },
    {_id: false}
);

const unidocuSchema = new Schema(
    {
        mobile_version: {type: String},
        unidocu_version: {type: String}
    },
    {_id: false}
);

const versionControlSchema = new Schema(
    {
        type: {type: String, enum: ['git', 'svn', '']},
        scope: {type: String, enum: ['internal', 'external', 'none', '']}
    },
    {_id: false}
);

const CustomerEtc = new CustomerEtcSchema('customerEtc', {
    code: {type: String},
    otp: [otpSchema],
    unidocu: {type: unidocuSchema, default: () => ({})},
    pc: [pcSchema],
    version_control: {type: versionControlSchema, default: () => ({})},
    ssh: [sshSchema]
});

export {CustomerEtc};
