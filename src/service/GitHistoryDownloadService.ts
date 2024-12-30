import axios, {AxiosResponse} from 'axios';
import {Request, Response, NextFunction} from 'express';
import {generatorUtils as generator} from '../utils/UnietangUtils.js';
import {dateUtil} from '../utils/UnietangUtils.js';

class GitHistoryDownloadService {
    // 경로, 토큰은 설정 값으로 받아와야 겠음
    private gitlabBaseUrl = 'http://gitlab/gitlab/api/v4/projects/';
    //private gitlabBaseUrl = 'http://unidocu/gitlab-test/api/v4/projects/';
    private projectId = '';
    private accessToken = '';

    public async getExcelBuffer(req: Request): Promise<Buffer> {
        const {projectId, fromDate, toDate} = req.body;
        this.projectId = await this.getProjectId(projectId);

        const response: AxiosResponse<any> = await axios.get(`${this.gitlabBaseUrl}${this.projectId}/repository/commits`, {
            headers: {
                'PRIVATE-TOKEN': this.accessToken
            },
            params: {
                ref_name: 'master',
                since: new Date(fromDate).toISOString(),
                until: new Date(toDate).toISOString()
            }
        });

        response.data.forEach((commit: any) => {
            commit.created_at = dateUtil.formatDate(new Date(commit.created_at), 'yyyy-MM-dd hh:mm:dd');
        });

        const excelInfo: ExcelDataType = {
            headers: [
                {header: '관리자', key: 'author', width: 20, data_header: 'author_name'},
                {header: '수정 시간', key: 'createdAt', width: 20, data_header: 'created_at'},
                {header: '수정내용 [접수번호] 내용', key: 'title', width: 100, data_header: 'title'}
            ],
            sheetName: 'GitLab History',
            data: response.data
        };
        return generator.exportToExcel(excelInfo);
    }

    private async getProjectId(name: string): Promise<string> {
        const response: AxiosResponse<any> = await axios.get(`${this.gitlabBaseUrl}?search=${name}`, {
            headers: {
                'PRIVATE-TOKEN': this.accessToken
            },
            params: {
                ref_name: 'master'
            }
        });

        if (response.data.length === 0) throw new Error('project not found');

        return response.data[0].id;
    }
}

export default new GitHistoryDownloadService();
