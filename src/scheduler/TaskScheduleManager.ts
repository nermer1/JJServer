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
     *
     * @param jobName
     * @param batchjob
     * @param jobCallback
     */
    public static add(jobName: string, batchjob: string | Date, jobCallback: JobCallback) {
        this.scheduleList.push({jobName, batchjob, jobCallback});
    }
}

interface ScheduleData {
    jobName: string;
    batchjob: string | Date;
    jobCallback: JobCallback;
    job?: Job;
}
