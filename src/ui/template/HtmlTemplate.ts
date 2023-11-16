import mustache from 'mustache';
import path from 'path';
import fs from 'fs/promises';

export default class HtmlTemplate {
    public async templateFromFile(filePath: string, data: any) {
        const html = await fs.readFile(path.join('', `./${filePath}.mustache`));
        return this.template(html.toString(), data);
    }

    private template(html: string, data: any) {
        return mustache.render(html, data);
    }
}
