import {ResumeGetStatusReq, ResumeInfo, ResumeUpdateContactReq, ResumeUpdateStatusReq} from "~background/api/Model";
import {ApiResult, post} from "~components/fetch";

export class ResumeApi {

    /**
     * 保存简历
     * @param resumeInfo    简历信息
     */
    public async saveResume(resumeInfo: ResumeInfo) {
        const apiResult = await post('/resume/save', resumeInfo);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
    }

    /**
     * 更新简历状态
     * @param data  简历状态更新请求
     */
    public async updateResumeStatus(data: ResumeUpdateStatusReq) {
        const apiResult = await post('/resume/updateStatus', data);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
    }

    /**
     * 更新简历联系方式
     * @param data  简历联系方式更新请求
     */
    public async updateResumeContact(data: ResumeUpdateContactReq) {
        const apiResult = await post('/resume/updateContact', data);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
    }


    /**
     * 获取简历状态
     * @param data  简历状态获取请求
     */
    public async getResumeStatus(data: ResumeGetStatusReq) {
        const apiResult = await post('/resume/getStatus', data);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }

    public async queryTableList(data) {
        const apiResult = await post('/resume/list', data);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }
}

export const resumeApi = new ResumeApi();
