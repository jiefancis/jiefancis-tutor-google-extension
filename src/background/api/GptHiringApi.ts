import {post} from "~components/fetch";


class GptHiringApi {


    /**
     * 获取回复消息
     * @param taskId    任务ID
     * @param platform  平台
     * @param conversationId    会话ID
     */
    public getReplyMessage = async (taskId: string, platform: number, conversationId: string) => {
        const apiResult = await post('/gpt/hiring/reply', {taskId: taskId, platform: platform, conversationId: conversationId});
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }

    /**
     * 检查简历
     * @param taskId    任务ID
     * @param conversationId    会话ID
     * @param resume    简历
     */
    public checkResume = async (taskId: string, conversationId: string, resume: string) => {
        const apiResult = await post('/gpt/hiring/checkResume', {taskId: taskId, conversationId: conversationId, resume: resume});
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }


    /**
     * 缩减并润色语句
     * @param sentence 语句
     * @param num   限制字数
     */
    public shortenSentence = async (sentence: string, num: string): Promise<string> => {
        const apiResult = await post('/gpt/hiring/shortenSentence', {sentence: sentence, num: num});
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }
}

export const gptHiringApi = new GptHiringApi();
