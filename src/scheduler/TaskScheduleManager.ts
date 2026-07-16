import schedule, {Job, JobCallback} from 'node-schedule';

export class TaskScheduleManager {
    private static scheduleList: ScheduleData[] = [];

    /**
     *
     */
    public static run() {
        this.cancel();
        this.scheduleList.forEach((item) => {
            item['job'] = schedule.scheduleJob(item['batchjob'], item['jobCallback']);
        });
    }

    /**
     *
     */
    public static cancel() {
        this.scheduleList.forEach((item) => {
            if (item['job']) item['job'].cancel();
        });
    }

    /**
     * 스케줄 추가
     * @param jobName
     * @param batchjob
     * @param jobCallback 비즈니스 로직 (JobLogger로 래핑된 함수 권장)
     */
    public static add(jobName: string, batchjob: string | Date, jobCallback: (...args: any[]) => any) {
        const wrappedCallback = async (...args: any[]) => {
            try {
                await jobCallback(...args);
            } catch (error: any) {
                console.error(`[Scheduler] ${jobName} 에러:`, error);
            }
        };

        this.scheduleList.push({jobName, batchjob, jobCallback: wrappedCallback});
    }
}
