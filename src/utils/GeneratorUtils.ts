import ExcelJS from 'exceljs';

export default class GeneratorUtils {
    public static exportToExcel(info: ExcelDataType): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(info.sheetName);

        worksheet.columns = info.headers;

        info.data.forEach((commit: any) => {
            const hihi = info.headers.reduce((a, b) => {
                a[b.key] = commit[b.data_header];
                return a;
            }, {} as ObjType);

            worksheet.addRow(hihi);
        });

        return workbook.xlsx.writeBuffer() as Promise<Buffer>;
    }

    public static generateRandomString(length = 6, pattern = /[a-zA-Z0-9]/) {
        const chars = GeneratorUtils.extractCharactersFromRegex(pattern);
        if (!chars.length) throw new Error('Invalid character pattern');

        return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    public static extractCharactersFromRegex(pattern: RegExp) {
        const allChars = String.fromCharCode(...Array.from({length: 94}, (_, i) => i + 33)); // Printable ASCII (33~126)
        return allChars.split('').filter((char) => pattern.test(char));
    }
}
