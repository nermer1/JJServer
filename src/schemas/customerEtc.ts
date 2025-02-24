import {Schema} from 'mongoose';
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
        mobile: {type: String},
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
            type: String,
            required: true
        },
        listen_port: {
            type: String,
            required: true,
            validate: {
                validator: (value: string) => validator.isPort(value),
                message: 'Port must be between 0 and 65535'
            }
        },
        connect_port: {
            type: String,
            required: true,
            validate: {
                validator: (value: string) => validator.isPort(value),
                message: 'Port must be between 0 and 65535'
            }
        },
        ip: {
            type: String,
            required: true,
            validate: {
                validator: (value: string) => validator.isIPv4(value),
                message: 'IPv4 validation failed'
            }
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

const infoSchema = new Schema(
    {
        data: {type: String, default: ''}
    },
    {_id: false}
);

const CustomerEtc = new CustomerEtcSchema('customerEtc', {
    code: {type: String},
    otp: {type: [otpSchema]},
    unidocu: {type: unidocuSchema, default: () => ({})},
    pc: {type: [pcSchema]},
    version_control: {type: versionControlSchema, default: () => ({})},
    ssh: {type: [sshSchema]},
    info: {type: infoSchema, default: () => ({data: ''})}
});

export {CustomerEtc};
