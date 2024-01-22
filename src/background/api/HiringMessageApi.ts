import {HiringChatMessage} from "~background/api/Model";
import {post} from "~components/fetch";

class HiringMessageApi {

    /**
     * 添加消息
     * @param chatMessage   消息
     */
    public addHiringMessage = async (chatMessage: HiringChatMessage) => {
        const apiResult = await post('/hiringChatMessage/add', chatMessage);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
    }

    public getHiringMessages = async (platform: number, conversationId: string) => {
        const apiResult = await post('/hiringChatMessage/getMessages', {platform: platform, conversationId: conversationId});
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data as HiringChatMessage[];
    }

}

export const hiringMessageApi = new HiringMessageApi();
