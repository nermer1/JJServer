import mustache from 'mustache';
import path from 'path';
import fs from 'fs/promises';

export default class HtmlTemplate {
    public async templateFromFile(filePath: string, data: any) {
        // 이미 .mustache 확장자가 붙어있으면 그대로, 아니면 붙여줍니다.
        const finalPath = filePath.endsWith('.mustache') ? filePath : `${filePath}.mustache`;
        const html = await fs.readFile(path.join('', `./${finalPath}`));
        return this.template(html.toString(), data);
    }

    private template(html: string, data: any) {
        return mustache.render(html, data);
    }
}
