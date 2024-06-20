import ExcelJS from 'exceljs';

export default class GeneratorUtils {
    public static exportToExcel(history: any): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('GitLab History');

        // 헤더 설정
        worksheet.columns = [
            {header: '관리자', key: 'author', width: 20},
            {header: '수정 시간', key: 'createdAt', width: 20},
            {header: '수정내용 SM_Ent [접수번호] 내용', key: 'title', width: 100}
        ];

        // 데이터 추가
        history.forEach((commit: any) => {
            worksheet.addRow({
                id: commit.id,
                title: commit.title,
                author: commit.author_name,
                createdAt: commit.created_at
            });
        });

        // 엑셀 파일을 버퍼로 변환하여 반환
        return workbook.xlsx.writeBuffer() as Promise<Buffer>;
    }
}
