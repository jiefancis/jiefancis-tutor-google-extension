export class CheckResume {
    /**
     * 在线简历内容
     */
    input: string;

    /**
     * 要招的职位名字
     */
    jobTitle: string;

    /**
     * 候选人需要满足的条件
     */
    filterCriteria: string;

    constructor(input: string, jobTitle: string, filterCriteria: string) {
        this.input = input;
        this.jobTitle = jobTitle;
        this.filterCriteria = filterCriteria;
    }
}
