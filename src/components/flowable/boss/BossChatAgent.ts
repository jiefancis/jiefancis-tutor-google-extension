import {
    clickElementHighlight,
    getRandomInt,
    inputElement,
    remoteClickElementHighlight,
    sleep
} from "~/components/flowable/DomUtil";
import {AgentStatus} from "~/components/flowable/boss/AgentStatus";
import {ConversationStatus, getChatMessages, getConversationStatus} from "~/store/ConversationStore";
import {E_CANCELED, Mutex} from "async-mutex";

import {Cmd, ResponseMessage} from "~background/MessageModel";
import {getTaskInfoByServer} from "~store/JobInfoStore";
import {
    FileUploadInfo,
    GptCheckResumeResult,
    HiringChatMessage,
    ResumeGetStatusReq,
    ResumeInfo,
    ResumeUpdateStatusReq,
    TaskInfo
} from "~background/api/Model";
import {
    ENUM_PLATFORM,
    HiringChatMessageSenderTypeEnum,
    HiringChatMessageTypeEnum,
    ResumeStatus,
    ResumeStatusEnum
} from "~constants";

export class ChatMessageType {
    /**
     * 消息时间
     */
    static MESSAGE_TIME = "message-time";

    /**
     * 简历介绍
     */
    static RESUME_INTRO = "item-resume";

    /**
     * 系统消息
     */
    static SYSTEM = "item-system";

    /**
     * 文本消息
     */
    static TEXT = "text";

    /**
     * 我发送的消息
     */
    static MYSELF_MESSAGE = "item-myself";

    /**
     * 好友发送的消息
     */
    static FRIEND_MESSAGE = "item-friend";

    static IMAGE = "text bgf";

    /**
     * 未知消息
     */
    static UNKNOWN = "unknown"

}

export class ChatMessage {

    /**
     * 消息索引, 消息在聊天框中message-item对应的索引位置
     * @private
     */
    public messageItemIndex: number;

    /**
     * 消息在message-item中的索引位置
     */
    public messageIndex: number;

    public sender: string;

    public messageType: string;

    public message: string;

    constructor(messageItemIndex: number, messageIndex: number, sender: string, messageType: string, message: string) {
        this.messageItemIndex = messageItemIndex;
        this.messageIndex = messageIndex
        this.sender = sender;
        this.messageType = messageType;
        this.message = message;
    }
}

/**
 * 聊天agent
 */
export class ChatAgent {

    /**
     * 监听聊天会话节点的变化
     * @private {MutationObserver}
     */
    private chatContainerObserver: MutationObserver = new MutationObserver(() => {
    });

    /**
     * 监听左侧用户列表的变化
     * @private {MutationObserver}
     */
    private userContainerObserver: MutationObserver = new MutationObserver(() => {
    });

    private status: string = AgentStatus.READY;

    private chatMutex: Mutex = new Mutex();

    private sendChatMutex: Mutex = new Mutex();

    /**
     * 流程当前处理到的conversationId
     * @private {string}
     */
    private currentConversationId: string;


    async start(): Promise<void> {
        try {
            if (this.status === AgentStatus.RUNNING) {
                return;
            }
            // 点击沟通
            await clickElementHighlight(document.querySelector('.menu-chat a'), 2, 3);

            this.status = AgentStatus.RUNNING;
            this.observeChat();
            await this.execute();
            this.status = AgentStatus.FINISH;
        } catch (e) {
            this.status = AgentStatus.ERROR;
            console.error(e);
        }
    }

    stop() {
        this.userContainerObserver.disconnect();
        this.chatContainerObserver.disconnect();
    }

    private observeChat() {
        this.userContainerObserver = new MutationObserver((mutations: MutationRecord[]) => {
            for (let i = 0; i < mutations.length; i++) {
                let mutationRecord = mutations[i];
                const targetElement: HTMLElement = mutationRecord.target as HTMLElement;
                if ('attributes' === mutationRecord.type && 'geek-item selected' === targetElement.className) {
                    // 更新当前聊天会话id
                    this.currentConversationId = targetElement.getAttribute("data-id") as string;
                    console.log(this.currentConversationId);
                }
            }
        });

        this.userContainerObserver.observe(document.querySelector('.user-container') as HTMLElement, {
            childList: true,
            subtree: true,
            attributes: true
        });

        this.chatContainerObserver = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach((mutation) => this.handleMutation(mutation));
        });

        this.chatContainerObserver.observe(document.querySelector('.chat-container') as HTMLElement, {
            childList: true,
            subtree: true,
            attributes: false
        });
    }

    private async execute() {

        this.observeChat();
        let chatContainerElement = document.querySelector('#container .chat-container') as HTMLElement;
        await this.startChat(chatContainerElement);
    }

    private async startChat(containerElement: HTMLElement) {
        while (true) {
            await sleep(5000);
            let chatUserElements = containerElement.querySelectorAll('.geek-item-wrap .geek-item') as NodeListOf<HTMLElement>;
            if (chatUserElements.length > 0) {
                let scrollUserList = document.querySelector('.user-list');

                for (let i = 0; i < chatUserElements.length; i++) {
                    const chatUserElement = chatUserElements[i];
                    await this.chatMutex.acquire().then(async (release) => {
                        let chatAvatarElement = chatUserElement.querySelector('.title') as HTMLElement;
                        this.currentConversationId = chatAvatarElement.parentElement.parentElement.getAttribute("id") as string;
                        await clickElementHighlight(chatAvatarElement, 3, 1);

                        // 一个候选人格子的高度是78
                        scrollUserList.scrollBy(0, 78);
                    });
                }
            }
        }
    }

    /**
     * 是否有未读消息
     * @param chatUserElement  聊天用户元素
     * @private {boolean}
     */
    private isUnreadMessage(chatUserElement: HTMLElement): boolean {
        return chatUserElement.querySelector('.news-count') !== null;
    }

    /**
     * 点击候选人聊天框最终会在这触发
     * @param mutation  变化
     * @private
     */
    private async handleMutation(mutation: MutationRecord) {
        try {
            let addNode = mutation.addedNodes[0] as HTMLElement;
            let targetElement = mutation.target as HTMLElement;
            if (
                addNode && addNode.className === 'message-item'
                && targetElement && targetElement.className === 'chat-message-list') {
                // 当前消息的索引
                let messageIndex = this.getElementIndex(addNode);
                await this.recordMessage(this.currentConversationId, messageIndex, addNode);

                if (this.isLastMessage(addNode)) {
                    let scrollNum = 0;
                    // 滚动到消息最顶部
                    while (!document.querySelector('.chat-message-list .item-resume')) {
                        if (scrollNum === 3) {
                            break;
                        }
                        document.querySelector('.chat-message-list').scrollIntoView();
                        scrollNum++;
                        await sleep(getRandomInt(1000, 3000));
                    }

                    if (addNode.getAttribute('isHandle') === '1') {
                        // 已经处理过的消息
                        return;
                    }
                    addNode.setAttribute('isHandle', '1');

                    await this.sendChatMutex.runExclusive(async () => {

                        // 这里聊天框内每次加入一条消息都会触发, 要注意
                        //this.sendChatMutex.cancel();

                        let resumeStatus = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_RESUME_GET_STATUS, new ResumeGetStatusReq(ENUM_PLATFORM.BOSS, this.currentConversationId)));
                        if (ResumeStatus.SUITABLE === resumeStatus || ResumeStatus.UNSUITABLE === resumeStatus) {
                            // 已经处理过的聊天会话
                            console.log('已经处理过的聊天会话, 会话状态:', resumeStatus);
                            return;
                        }
                        await sleep(1500);

                        try {
                            console.log('%c正在处理聊天会话: %s', 'color: red;', (document.querySelector('.conversation-main .base-info-content .name-box') as HTMLElement).innerText);
                        } catch (e) {
                            console.error(e);
                            await sleep(1000);
                            console.log('%c正在处理聊天会话: %s', 'color: red;', (document.querySelector('.conversation-main .base-info-content .name-box') as HTMLElement).innerText);
                        }

                        resumeStatus = await this.beforeReplyCheckResume(this.currentConversationId);

                        if (resumeStatus === ResumeStatusEnum.UNSUITABLE) {
                            // 简历不符合要求
                            return;
                        }
                        console.log('replyToMessage');

                        // 回复消息
                        await this.replyToMessage(this.currentConversationId);
                    }).then(() => {
                        this.chatMutex.release();
                    }).catch((e) => {
                        this.chatMutex.release();
                        if (e !== E_CANCELED) {
                            console.error(e);
                            return;
                        }
                        // 锁被主动取消了不执行任何逻辑
                    });
                }
            }
        } catch (e) {
            console.error(e);
            chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_RESUME_UPDATE_STATUS, new ResumeUpdateStatusReq(ENUM_PLATFORM.BOSS, this.currentConversationId, ResumeStatus.ERROR)));
        }

    }

    /**
     * 请求简历
     * @private {Promise<void>}
     */
    private async requestResume() {
        let elements = document.querySelectorAll('.chat-conversation .conversation-operate .operate-btn') as NodeListOf<HTMLElement>;

        for (const element of elements) {
            if ('求简历' === element.innerText) {
                if (element.parentElement.querySelector('.operate-btn.disabled') || await this.candidateIsSendResume()) {
                    // 求简历的btn是disabled状态
                    return;
                }
                await remoteClickElementHighlight(element, 3, 3);
                await remoteClickElementHighlight(element.parentElement.querySelector('.boss-btn-primary'), 3, 3);
                return;
            }
        }
    }

    /**
     * 候选人是否发送了简历
     * @private {Promise<void>}
     */
    private async candidateIsSendResume() {
        let messageElements = document.querySelectorAll('.chat-message-list .message-item') as NodeListOf<HTMLElement>;
        for (const childElement of messageElements) {
            let senderType = this.getSenderType(childElement.children[0] as HTMLElement);
            if (HiringChatMessageSenderTypeEnum.CANDIDATE === senderType) {
                const cardTitleElement = childElement.querySelector('.message-card-top-title') as HTMLElement;

                // TODO 强文本判断 有更好的办法再优化
                // 对方想发送附件简历给您，您是否同意
                if (cardTitleElement && '对方想发送附件简历给您，您是否同意' === cardTitleElement.innerText) {
                    // 接收简历
                    return true;
                }

                let previewResumeElement = childElement.querySelector('.message-card-buttons') as HTMLElement;
                if (previewResumeElement && '点击预览附件简历' === previewResumeElement.innerText) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 记录消息
     * @param conversationId    聊天会话id
     * @param messageIndex  消息索引
     * @param messageElement    消息元素
     * @private {Promise<void>}
     */
    private async recordMessage(conversationId: string, messageIndex: number, messageElement: HTMLElement) {
        let senderType = this.getSenderType(messageElement),
            messageType = this.getMessageType(messageElement),
            message: string;

        switch (messageType) {
            case HiringChatMessageTypeEnum.IMAGE:
                // 图片消息
                message = messageElement.querySelector('img').getAttribute('src');
                break;
            case HiringChatMessageTypeEnum.WECHAT:
                // 微信号
                message = (messageElement.querySelector('.contact-copy .message-card-top-title') as HTMLElement).innerText;
                message = message.split('\n')[1];
                await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_RESUME_UPDATE_CONTACT, {
                    platform: ENUM_PLATFORM.BOSS,
                    conversationId: this.currentConversationId,
                    wechat: message
                }));
                break;
            case HiringChatMessageTypeEnum.RESUME:
                // 简历
                message = (messageElement.querySelector('.message-card-top-title') as HTMLElement).innerText;
                break;
            default:
                message = messageElement.innerText;
                break;
        }

        await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_ADD_HIRING_MESSAGE,
            new HiringChatMessage(conversationId, ENUM_PLATFORM.BOSS, messageIndex, senderType, messageType, message)));
    }


    /**
     * 接收简历
     * @private {Promise<void>}
     */
    private async receiveResume() {
        if (document.querySelector('.message-card-wrap .card-btn.disabled')) {
            // 已经接收了简历
            return false;
        }
        await remoteClickElementHighlight(document.querySelectorAll('.message-card-wrap .card-btn')[1] as HTMLElement, 3, 3);
        return true;
    }

    /**
     * 检查简历
     * @param conversationId    聊天会话id
     * @private {Promise<void>}
     */
    private async checkResume(conversationId: string) {
        // 点击查看简历
        const viewResumeBtn = document.querySelector('.item-friend .hyperLink .card-btn') as HTMLElement;

        // 滚动到查看简历按钮
        viewResumeBtn.scrollIntoView();
        await clickElementHighlight(viewResumeBtn, 3, 3);
        await sleep(getRandomInt(5000, 10000));

        // 取到简历的iframe dom
        const resumeDom = (document.querySelector('.attachment-iframe') as HTMLIFrameElement).contentDocument as Document;

        const jobInfo = await getTaskInfoByServer();

        let response: GptCheckResumeResult = null;
        let resumePageElement = null;
        let resumeText = null;

        let geekName = (document.querySelector('.conversation-main .name-box') as HTMLElement).innerText;
        while (true) {
            resumePageElement = resumeDom.querySelector('#viewer') as HTMLElement;
            resumeText = resumePageElement.innerText;

            response = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_CHECK_RESUME, {
                taskId: jobInfo.id,
                resume: resumePageElement.innerText
            })) as any;
            if (response !== null) {
                break;
            }
        }

        console.log('%c筛选简历结果: %s', 'color: red;', JSON.stringify(response));

        const resumeTextDownloadUrl = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_FILE_UPLOAD,
            new FileUploadInfo('resume.txt', resumeText)));
        console.log('%c简历文本下载地址: %s', 'color: red;', resumeTextDownloadUrl);

        const resumeInfo = new ResumeInfo(jobInfo.id, null, conversationId, ENUM_PLATFORM.BOSS, response.score,
            response.qualified ? ResumeStatusEnum.SUITABLE : ResumeStatusEnum.UNSUITABLE,
            geekName, null, null, jobInfo.jobTitle, response.reason, resumeTextDownloadUrl, ''
        );

        let saveResumeResult = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_RESUME_SAVE, resumeInfo));
        if (saveResumeResult === null) {
            throw new Error('保存简历失败');
        }

        // 关闭简历弹窗 fuck 这里弹出来有两个弹窗 控制台只会显示一个
        let closeElements = document.querySelectorAll('.dialog-wrap .boss-popup__close .icon-close') as NodeListOf<HTMLElement>;
        for (let closeElement of closeElements) {
            await clickElementHighlight(closeElement, 2, 3);
        }

        if (response.qualified) {
            // 简历符合要求 收藏候选人
            await this.collectCandidate();
            // 交换微信
            await this.exchangeWechat();
            return true;
        }

        // 简历不符合要求
        await this.unSuitableResume();
        return false;
    }

    /**
     * 简历不合适
     * @private {Promise<void>}
     */
    private async unSuitableResume() {
        let unSuitableElements = document.querySelectorAll('.operate-exchange-right .operate-btn') as NodeListOf<HTMLElement>;

        for (const element of unSuitableElements) {
            if ('不合适' === element.innerText) {
                (document.querySelector('.operate-exchange-right .reason-list') as HTMLElement).style.display = 'block';
                let reasonBtnElements = document.querySelectorAll('.operate-exchange-right .reason-list .reason-item') as NodeListOf<HTMLElement>;
                for (const btn of reasonBtnElements) {
                    if ('其他原因' === btn.innerText) {
                        await remoteClickElementHighlight(btn, 2, 3);
                    }
                }
                return;
            }
        }
    }

    /**
     * 收藏候选人
     * @private {Promise<void>}
     */
    private async collectCandidate() {
        const collectBtnElements = document.querySelectorAll('.rightbar-box .rightbar-item .icon .tip') as NodeListOf<HTMLElement>;
        for (let element of collectBtnElements) {
            if ('收藏' === element.innerText) {
                await clickElementHighlight(element, 2, 3);
            }
        }

    }

    /**
     * 交换微信
     * @private {Promise<void>}
     */
    private async exchangeWechat() {
        let exchangeBtnElements = document.querySelectorAll('.operate-exchange-left .operate-icon-item .operate-btn') as NodeListOf<HTMLElement>;

        for (let exchangeElement of exchangeBtnElements) {
            if ('换微信' === exchangeElement.innerText) {
                await remoteClickElementHighlight(exchangeElement, 3, 3);
                await remoteClickElementHighlight(exchangeElement.parentElement.querySelector('.boss-btn-primary'), 3, 3);
                return;
            }
        }

    }

    /**
     * 是否是自己发送的第一条消息
     * @param id    聊天会话id
     * @private {boolean}
     */
    private isSelfSendFirstMessage(id: string): boolean {
        let chatMessages = getChatMessages(id);
        for (let message of chatMessages) {
            if (message.sender === ChatMessageType.MYSELF_MESSAGE || message.sender === ChatMessageType.FRIEND_MESSAGE) {
                return message.sender === ChatMessageType.MYSELF_MESSAGE;
            }
        }
    }

    /**
     * 是否是最后一条消息
     * @param messageElement    消息元素
     * @private {boolean}
     */
    private isLastMessage(messageElement: HTMLElement): boolean {
        try {
            let messageSize = document.querySelectorAll('.chat-message-list .message-item').length;
            let messageIndex = this.getElementIndex(messageElement);
            return messageIndex === messageSize - 1;
        } catch (e) {
            console.error('isLastMessage', messageElement, e);
            return false;
        }
    }

    /**
     * 获取元素在nodes中的索引
     * @param element   元素
     * @private {number}
     */
    private getElementIndex(element: HTMLElement): number {
        let index = 0;
        while (element) {
            index++;
            element = element.previousElementSibling as HTMLElement;
        }
        return index - 1;
    }

    /**
     * 获取发送者类型
     * @param element   元素
     * @private {number}
     */
    private getSenderType(element: HTMLElement): number {
        if (element.querySelector('.' + ChatMessageType.MYSELF_MESSAGE)) {
            return HiringChatMessageSenderTypeEnum.HIRING;
        }
        if (element.querySelector('.' + ChatMessageType.FRIEND_MESSAGE)) {
            return HiringChatMessageSenderTypeEnum.CANDIDATE;
        }
        return HiringChatMessageSenderTypeEnum.SYSTEM;
    }

    private getMessageType(element: HTMLElement): number {
        // 系统消息
        if (element.querySelector('.text.bgf')) {
            return HiringChatMessageTypeEnum.IMAGE;
        }

        if (element.querySelector('.contact-copy')) {
            // 联系方式, 暂时没区分手机还是微信
            return HiringChatMessageTypeEnum.WECHAT;
        }

        const previewResumeElement = element.querySelector('.text.hyperLink .card-btn') as HTMLElement;
        if (previewResumeElement && '点击预览附件简历' === previewResumeElement.innerText) {
            return HiringChatMessageTypeEnum.RESUME;
        }

        return HiringChatMessageTypeEnum.TEXT;
    }

    private async beforeReplyCheckResume(conversationId: string) {
        let resumeStatus: number = await this.findAndHandleResume(conversationId);
        if (resumeStatus === ResumeStatusEnum.CHECKING && this.isLastMessageBySelf(conversationId)) {
            // 没有请求过简历,并且最后一条消息是自己发送的消息, 则请求简历
            await this.requestResume();
        }

        return resumeStatus;
    }

    /**
     * 查找并处理简历
     * @param conversationId    聊天会话id
     * @private {Promise<void>}
     * @return 0: 没有发送简历 1: 发送了简历 2: 简历不符合要求
     */
    private async findAndHandleResume(conversationId: string): Promise<number> {
        const messageElements = document.querySelectorAll('.chat-message-list .message-item') as NodeListOf<HTMLElement>;

        let isSendResume = ResumeStatus.CHECKING;
        for (const childElement of messageElements) {

            const sendType = this.getSenderType(childElement);
            const messageType = this.getMessageType(childElement);
            if (HiringChatMessageSenderTypeEnum.CANDIDATE === sendType) {
                // 检查是否是发送简历的卡片

                const cardTitleElement = childElement.querySelector('.message-card-top-title') as HTMLElement;

                // TODO 强文本判断 有更好的办法再优化
                // 对方想发送附件简历给您，您是否同意
                if (cardTitleElement && '对方想发送附件简历给您，您是否同意' === cardTitleElement.innerText) {
                    // 接收简历
                    await this.receiveResume();
                    if (ConversationStatus.CHECKING === getConversationStatus(conversationId)) {
                        // 检查简历是否符合要求
                        if (!await this.checkResume(conversationId)) {
                            return ResumeStatus.UNSUITABLE;
                        }
                    }
                }

                if (HiringChatMessageTypeEnum.RESUME === messageType) {
                    const resumeStatus = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_RESUME_GET_STATUS, {
                        platform: ENUM_PLATFORM.BOSS,
                        conversationId: conversationId,
                    }));
                    if (ResumeStatus.CHECKING === resumeStatus) {
                        // 检查简历是否符合要求
                        if (!await this.checkResume(conversationId)) {
                            return ResumeStatus.UNSUITABLE;
                        }
                    }
                    isSendResume = ResumeStatus.SUITABLE;
                }
            }
        }
        return isSendResume;
    }

    private async replyToMessage(conversationId: string) {

        const chatMessages = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_GET_HIRING_MESSAGES, {
            platform: ENUM_PLATFORM.BOSS,
            conversationId: conversationId
        }));

        if (chatMessages.length === 0) {
            return;
        }

        if (this.isLastMessageBySelf_0(chatMessages)) {
            // 如果最后一条消息是我发送的消息，则不再回复
            console.log('%c最后一条消息是我发送的消息, 不再回复', 'color: blue;');
            return;
        }

        const reply = await this.generateReply(conversationId, await getTaskInfoByServer());
        console.log('%c候选人: %s', 'color: green;', chatMessages[chatMessages.length - 1].message);
        console.log('%cBOSS回复: %s', 'color: blue;', reply);
        await inputElement(document.querySelector('#boss-chat-editor-input') as HTMLInputElement, reply);
        await remoteClickElementHighlight(document.querySelector('.conversation-editor .submit-content .submit') as HTMLDivElement, 3, 3);
        await this.requestResume();
    }

    private async generateReply(conversationId: string, taskInfo: TaskInfo): Promise<string> {
        return await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_GET_BOSS_REPLY_MESSAGE, {
            taskId: taskInfo.id,
            platform: ENUM_PLATFORM.BOSS,
            conversationId: conversationId
        }));
    }

    /**
     * 最后一条消息是否是自己发送的
     * @param conversationId    聊天会话id
     * @private {Promise<boolean>}
     */
    private isLastMessageBySelf(conversationId: string) {
        const chatMessages: HiringChatMessage[] = chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_GET_HIRING_MESSAGES, {
            platform: ENUM_PLATFORM.BOSS,
            conversationId: conversationId
        }));

        return this.isLastMessageBySelf_0(chatMessages);
    }

    private isLastMessageBySelf_0(chatMessages: HiringChatMessage[]) {
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            if (HiringChatMessageSenderTypeEnum.HIRING === chatMessages[i].senderType) {
                return true;
            }
            if (HiringChatMessageSenderTypeEnum.CANDIDATE === chatMessages[i].senderType) {
                return false;
            }
        }
    }
}


