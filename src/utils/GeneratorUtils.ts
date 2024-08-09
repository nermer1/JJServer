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
}
