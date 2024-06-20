import axios from 'axios';
import {generatorUtils as generator} from '../utils/UnietangUtils.js';

class GitHistoryDownloadService {
    public async getExcelBuffer(): Promise<Buffer> {
        const gitlabBaseUrl = 'http://unidocu-scm/gitlab/api/v4';
        const projectId = '567';
        const accessToken = 'glpat-h5TDEcXQyuqjXqcRKHNs';
        try {
            const response = await axios.get(`${gitlabBaseUrl}/projects/${projectId}/repository/commits`, {
                headers: {
                    'PRIVATE-TOKEN': accessToken
                },
                params: {
                    ref_name: 'master',
                    since: new Date('2024-01-01').toISOString(),
                    until: new Date('2024-06-13').toISOString()
                }
            });

            return generator.exportToExcel(response.data);
        } catch (error) {
            console.error('Error fetching GitLab history:', error);
            throw error;
        }
    }
}

export default new GitHistoryDownloadService();
