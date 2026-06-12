import {Schema} from 'mongoose';
import CommonSchema from './CommonSchema.js';

class MenuSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

// 하나의 메뉴 아이템 (재귀적 구조 지원)
const menuItemSchema = new Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    icon: { type: String },
    tutorialId: { type: String },
    requiredPermission: { type: Schema.Types.Mixed }, // string | string[]
}, { _id: false });

// 하위 메뉴를 위한 자기 참조 (재귀 구조)
menuItemSchema.add({ items: [menuItemSchema] });

// 전체 메뉴 트리 스키마 (보통 단일 문서 1개만 운용)
const menuTreeSchemaDefinition = new Schema({
    portalName: { type: String, default: 'default', unique: true, description: '여러 사이트/포탈을 운용할 경우를 대비한 식별자' },
    navMain: [menuItemSchema],
    navMain2: [menuItemSchema],
    projects: [menuItemSchema]
}, {
    timestamps: true
});

const Menus = new MenuSchema('menus', menuTreeSchemaDefinition);

export {Menus};
