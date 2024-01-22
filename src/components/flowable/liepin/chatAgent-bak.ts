import {
    clickElementHighlight,
    getRandomInt,
    inputElement, remoteClickElementHighlight,
    sleep
} from "~/components/flowable/DomUtil";
import {AgentStatus} from "~/components/flowable/liepin/AgentStatus";
import {
    addChatMessage,
    ConversationStatus,
    getChatMessages, getConversation,
    getConversationStatus, setConversationCandidateIntro,
    setConversationStatus
} from "~/store/ConversationStore";
import {E_CANCELED, Mutex} from "async-mutex";

import {Cmd, ResponseMessage} from "~background/MessageModel";
import {getJobInfo} from "~store/JobInfoStore";
import{
    VisibilityStateEnum,
    SINGLE_CHAT_SCROLL_HIGHT,
    XPATH_LIEPIN_RESUME,
    XPATH_LIEPIN_PHONE,
    XPATH_LIEPIN_WEIXIN,
    XPATH_LIEPIN_CONFIRM_BTN,
    XPATH_LIEPIN_COLLECT_RESUME_BTN,
    XPATH_LIEPIN_SEND_MESSAGE_BTN,
    XPATH_LIEPIN_TEXTAREA,
    STORE_LIEPIN_CURRENT_CONVERSACTIONID
} from '~constants/index'
import { getElementByXPath, setFormElementValue } from "~/components/flowable/DomUtil";
import { Message as messageInstance, storeActiveConversationId } from '~utils'
import * as _ from 'lodash-es'

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

    /**
     * 未知消息
     */
    static UNKNOWN = "unknown"

    /**
     * 猎聘
     */
    // 别人发送的消息
    static RECEIVE_MESSAGE = '__im_UI__txt receive'
    // 我发送的消息
    static SEND_MESSAGE = '__im_UI__txt send'
    // 人选发送了简历
    static RESUME_MESSAGE = '__im_basic__send-resume-card'
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
     * 监听用户列表有新消息
     */
    private chatUserListObserver: MutationObserver
    /**
     * 待处理的消息
     */
    private pendingQueue: Array<any>

    private jobInfo = {}

    private loadingAllMessage: boolean = false;

    private status: string = AgentStatus.READY;

    private chatMutex: Mutex = new Mutex();

    private sendChatMutex: Mutex = new Mutex();

    constructor(private sendButtonSelector?: string, private inputBoxSelector?: string) {
    }

    /**
     * 监听页面显示隐藏
     */
    private documentVisibilityChange = () => {
        document.addEventListener('visibilitychange', async () => {
            if(document.visibilityState === VisibilityStateEnum.VISIBLE) {
                await sleep(2000)
                if(this.chatMutex?.isLocked()) {
                    this.chatMutex.release()
                }
                // const flowFinishStatus = getLiepinResumeFlowStatus();
                // if(this.status === AgentStatus.RUNNING) {
                //     if(flowFinishStatus === true) {
                //         this.checkResumeFinish()
                //         return;
                //     }

                //     this.doCheckResumeLock.release()
                //     this.scrollToView()
                // }
            }
        })
    }

    async start() {
        try {
            if (this.status === AgentStatus.RUNNING) {
                return;
            }
            // this.jobInfo = message
            this.status = AgentStatus.RUNNING;
            await sleep(2000)
            this.observeChat();
            this.observeUserList()
            this.documentVisibilityChange()
            await this.execute();
            this.status = AgentStatus.FINISH;
        } catch (e) {
            this.status = AgentStatus.ERROR;
            console.error(e);
        }
    }

    stop() {
        this.chatContainerObserver.disconnect();
    }

    /**
     * 滚动视图
     */
    private scrollIntoView() {
        document.querySelector('[data-overlayscrollbars-viewport="scrollbarHidden"]').scrollBy(0, SINGLE_CHAT_SCROLL_HIGHT)
    }

    private observeChat() {
        const that = this;
        this.chatContainerObserver = new MutationObserver(_.debounce((mutations: MutationRecord[]) => that.handleMutation(mutations), 300));
        this.chatContainerObserver.observe(document.querySelector('.__im_pro__chatwin') as HTMLElement, { // '.__im_pro__wrap.move-show-chatwin' // .__im_pro__chatwin
            childList: true,
            subtree: true,
            attributes: false
        });
    }
    
    private observeUserList() {
        const that = this;
        this.chatUserListObserver = new MutationObserver((mutations: MutationRecord[]) => that.handleUserMutation(mutations))
        this.chatUserListObserver.observe(document.querySelector('#im-aside') as HTMLElement, { // '.__im_pro__wrap.move-show-chatwin' // .__im_pro__chatwin
            childList: true,
            subtree: true,
            attributes: false
        });
    }

    private handleUserMutation(mutations: MutationRecord[]) {
        this.startChat(document)
    }

    private async execute() {
        // this.observeChat();
        let chatContainerElement = document.querySelector('.__im_pro__wrap.move-show-chatwin') as HTMLElement; // '.__im_pro__wrap.move-show-chatwin' // .__im_pro__chatwin
        await this.startChat(chatContainerElement || document);
    }
    /**
     * 获取当前沟通列表中，未读消息的用户列表
     */
    private getUnreadMessageUserList = (containerElement: HTMLElement | Document = document) => {
        let chatUserElements = Array.from(containerElement.querySelectorAll('.__im_pro__list-item') as NodeListOf<HTMLElement>).filter(item => !item.querySelector('.__im_pro__contact-title')?.innerText?.includes('求职者投递')) as HTMLElement[];
        let unreadUserMessageList = chatUserElements.filter(ele => +ele.querySelector('.__im_basic__avatar').querySelector('div').innerText > 0)
        return unreadUserMessageList || [];
    }
    /**
     * 筛选不同岗位的聊天列表
     * title：：岗位关键字
     */
    // private filterByJobTitle(title: string) {
    //     let chatUserElements = Array.from(document.querySelectorAll('.__im_pro__list-item') as NodeListOf<HTMLElement>).filter(item => !item.querySelector('.__im_pro__contact-title')?.innerText?.includes('求职者投递')) as HTMLElement[];
        
    //     const doms = chatUserElements.filter(ele => ele?.querySelector('.__im_pro__contact-title-title')?.innerText?.includes('title'))
        
    //     return doms
    // }

    /**
     * 加载更多
     */
    private async loadMore() {
        const listDom = document.querySelector('[data-overlayscrollbars-viewport="scrollbarHidden"]') as HTMLElement;
        const scrollHeight = +listDom?.scrollHeight;
        scrollHeight && listDom.scrollBy(0, scrollHeight)
        // await sleep(2000)
        // this.startChat(document)
    }

    /**
     * 开始遍历沟通列表
     */
    private async startChat(containerElement: HTMLElement | Document) {
        
            // let chatUserElements = Array.from(containerElement.querySelectorAll('.__im_pro__list-item') as NodeListOf<HTMLElement>).filter(item => !item.querySelector('.__im_pro__contact-title')?.innerText?.includes('求职者投递')) as HTMLElement[];
            let chatUserElements = this.getUnreadMessageUserList(containerElement)
            console.log('startChat', chatUserElements.length)
            if (chatUserElements.length > 0) {
                for (let i = 0; i < chatUserElements.length; i++) {
                    const chatUserElement = chatUserElements[i];
                    await this.chatMutex.acquire().then(async () => {
                        chatUserElement?.scrollIntoView?.()
                        await clickElementHighlight(chatUserElement, 2, 1, false);
                        // 一个候选人格子的高度是62
                        // this.scrollIntoView()
                    });
                }
                await sleep(1000)
                // this.loadMore()
            } else {
                const has = document.querySelector('.ant-badge')?.querySelectorAll?.('.current')?.length > 0;
                if(has) {
                   this.loadMore() 
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
     * 获取当前正在沟通候选人的conversationId
     */
    private getActiveConversationId() {
        var dataInfo = document.querySelector('.__im_pro__list-item.active')?.getAttribute?.('data-info');
        var conversactionId = dataInfo && JSON.parse(decodeURIComponent(dataInfo))?.to_imid as string;
        return conversactionId;
    }

    /**
     * 加载所有消息
     */
    private async loadAllMessages() {
        let resumeDom = document.querySelector('.__im_basic__new-job-resume-card');
        if(!resumeDom) {
            this.loadingAllMessage = true;
            const scrollHeight = +(document.querySelector('.__im_pro__msg-list-content') as HTMLElement)?.offsetHeight;
            document.querySelectorAll('[data-overlayscrollbars-viewport="scrollbarHidden"]')[1].scrollBy(0, -scrollHeight)
            await sleep(500)
            this.loadAllMessages()
        } else {
            this.chatContainerScrollToBottom()   
        }
    }
    /**
     * 聊天内容滚动到底部
     */
    private chatContainerScrollToBottom() {
        this.loadingAllMessage = false;
        const scrollContainer = document.querySelector('.__im_pro__msg-list-content')
        const len = scrollContainer.children.length
        scrollContainer.children[len-1].scrollIntoView()
    }

    /**
     * 点击候选人聊天框最终会在这触发
     * @param mutation  变化
     * @private
     */
    private async handleMutation(mutations: MutationRecord[]) {
        console.log('触发几次？？', mutations)
        try {
            if(this.loadingAllMessage) { return }
            let bool = Array.from(mutations).some((mutation: MutationRecord) => {
                let addNode = mutation.addedNodes[0] as HTMLElement;
                let targetElement = mutation.target as HTMLElement;
                
                return mutation.type === 'childList' && addNode && targetElement.className.includes('__im_')
            })

            await sleep(1000)
            const [isLastMessageSendByUser, lastMessageType] = this.isLastMessageSendByUser();
            console.log('最后一条消息是用户最发来的？：%s，', bool, isLastMessageSendByUser)
            if ( bool && isLastMessageSendByUser) {
                // 等待聊天框加载完成 避免获取不到conversionId
                await sleep(1500);
                // 触发了新的聊天会话
                let conversationId = this.getActiveConversationId();

                if(getConversationStatus(conversationId) === ConversationStatus.UNSUITABLE) {
                    await sleep(2000)
                    this.chatMutex.release()
                    return
                }
                await this.loadAllMessages()

                await this.recordMessage(conversationId);

                await this.sendChatMutex.acquire().then(async () => {
                            await this.handleMessage(conversationId)
                        }).then(() => {
                            // this.sendChatMutex.release();
                        }).catch(async (e) => {
                            await sleep(1000)
                            if (e !== E_CANCELED) {
                                messageInstance?.showMessageTip?.({type: 'error', message: e.message})
                                console.error(e);
                                return;
                            }
                            // 锁被主动取消了不执行任何逻辑
                        }).finally(() => {
                            // this.sendChatMutex.release();
                            this.status = AgentStatus.RUNNING
                        })

                // await this.sendChatMutex.runExclusive(async () => {
                //         await this.handleMessage(conversationId)
                //       }).then(() => {
                //             // this.chatMutex.release();
                //             this.sendChatMutex.release();
                //         }).catch(async (e) => {
                //             await sleep(1000)
                //             // this.chatMutex.release();
                //             this.sendChatMutex.release();
                //             if (e !== E_CANCELED) {
                //                 messageInstance?.showMessageTip?.({type: 'error', message: e.message})
                //                 console.error(e);
                //                 return;
                //             }
                //             // 锁被主动取消了不执行任何逻辑
                //         }).finally(() => {
                //             this.status = AgentStatus.RUNNING
                //         })
                
            } else {
                this.recordMessage(this.getActiveConversationId())
                console.log('释放锁')
                await sleep(2000)
                this.chatMutex.release()
            }
        } catch (e) {
            console.error(e);
        }

    }

    /**
     * 开始处理消息
     */
    private async handleMessage(conversationId: string) {
        let isFirst = this.isSelfSendFirstMessage(conversationId)
        console.log('我主动发起沟通的：', isFirst)
        if(isFirst) {
            await this.handleFirstSendByMyself(conversationId)
        } else {
            console.log('候选人主动发消息，回复消息开始')
            // 候选人主动发消息
            await this.handleFirstSendByFriend(conversationId)
        }
        
    }

    /**
     * flow-one：我主动发消息
     */
    private async handleFirstSendByMyself(conversationId:string) {
        
        const isLastSendBySelf = this.isLastMessageBySelf(conversationId)
        console.log('最后一条消息是我回复的吗？', isLastSendBySelf)
        if(isLastSendBySelf) {
            await sleep(2000)
            this.sendChatMutex.release()
            this.chatMutex.release();
            return;
        }
        // 对方回复了消息
        // 是否向对方索要过简历 or 对方是否发送过简历
        const hasRequestedResume = this.hasRequestResume()
        const [hasReceiveResume, resumeDom] = this.hasReceiveResume(conversationId)
        
        // 回复消息
        await this.replyToMessage(conversationId)
        await sleep(1000)

        if(hasRequestedResume || hasReceiveResume) {
            await this.clickViewResume(resumeDom)
        }

        this.sendChatMutex.release()
        this.chatMutex.release()
    }
    /**
     * flow：候选人主动发消息
     */
    private async handleFirstSendByFriend(id: string) {
        const [bool, resumeDom] = this.hasReceiveResume(id)
        // 候选人发送过简历，直接查看简历
        if(bool) {
            await sleep(1000)
            this.clickViewResume(resumeDom)
            // clickElementHighlight(resumeDom, 2,1, false)
        } else {
            await this.replyToMessage(id)
        }
    }
    /**
     * 查看简历
     */
    private async clickViewResume(resumeDom: HTMLElement | null) {
        if(resumeDom) {
            if(this.status !== AgentStatus.CHECK_RESUME) {
                this.status = AgentStatus.CHECK_RESUME
                const conversationId = this.getActiveConversationId()
                storeActiveConversationId(conversationId)
                clickElementHighlight(resumeDom, 2, 1, false)
                await sleep(1000)
            }
            
        }
    }

    /**
     * 请求简历
     * @private {Promise<void>}
     */
    private async requestResume(conversationId: string) {
        let chatMessages = getChatMessages(conversationId);
        // 是否发送了简历？
        let hasSendResume = chatMessages.find(message => message.sender === ChatMessageType.RESUME_MESSAGE);
        console.log('候选人发送了简历？', hasSendResume)
        if(!!hasSendResume) {
            const [bool, resumeDom] = this.hasReceiveResume(conversationId)
            await this.clickViewResume(resumeDom)
        } else {
            // 索要简历
            await sleep(1500)
            const resumeBtnDom = getElementByXPath(XPATH_LIEPIN_RESUME) as HTMLElement;
            if(resumeBtnDom?.innerText !== '看简历') {
                clickElementHighlight(resumeBtnDom,2,1,false)
                await sleep(1500)
                // 确认按钮
                const confirmBtn = document.querySelector('.ant-modal-content .ant-btn.ant-btn-primary') as HTMLElement;
                clickElementHighlight(confirmBtn,2,1,false)
                await sleep(1000)
            }
        }
        
    }
    /**
     * 请求交换手机
     */
    private async requestPhone(){
        // 手机号
        const phoneBtnDom = getElementByXPath(XPATH_LIEPIN_PHONE) as HTMLElement;
        clickElementHighlight(phoneBtnDom,2,1,false)
        await sleep(1500)
        // 确认
        // const confirmBtnDom = getElementByXPath(XPATH_LIEPIN_CONFIRM_BTN) as HTMLElement;
        const confirmBtn = document.querySelector('.ant-modal-content .ant-btn.ant-btn-primary') as HTMLElement;
        clickElementHighlight(confirmBtn,2,1,false)
    }
    /**
     * 向对方要过简历
     */
    private hasRequestResume() {
        const tips = document.querySelectorAll('.__im_basic__message');
        const len = tips.length;
        for(let i = 0; i < len; i++) {
            const innerText = tips[i]?.innerText;
            if(innerText?.includes?.('向对方索要简历')) {
                return true
            }
        }
        return false
    }
    /**
     * 候选人是否发送过简历
     */
    private hasReceiveResume(conversationId?: string) {
        // if(conversationId) {
        //     const messages = getChatMessages(conversationId)
        // }
        
        const receiveMessages = this.queryReceiveMessages()
        const len = receiveMessages?.length;
        let bool = false;
        let resumeDom = null;
        for(let i = 0; i < len; i++) {
            if(receiveMessages[i]?.innerText?.includes('这是我的简历')) {
                bool = true;
                resumeDom = receiveMessages[i]?.querySelector('.__im_basic__send-resume-card')
                break;
            }
        }
        return [bool, resumeDom];
    }
    /**
     * 提取候选人发送的消息列表
     */
    private queryReceiveMessages() {
        const nodes = document.querySelectorAll('.__im_pro__message.__im_pro__message-wrapper.hasAvatar') as NodeListOf<HTMLElement>;
        
        const receiveMessages = Array.from(nodes).filter(node => node.querySelectorAll('.__im_pro__message-receive')?.[0]).filter(ele => ele)
        
        return receiveMessages
    }
    /**
     * 向候选人要过手机号
     */
    private queryPhone() {
        const tips = document.querySelectorAll('.__im_basic__message');
        const len = tips.length;
        let bool = false;
        let phone = '';
        for(let i = 0; i < len; i++) {
            const innerText = tips[i]?.innerText;
            if(innerText?.includes?.('的手机号：')) {
                bool = true;
                phone = innerText.split('手机号：')?.[1]?.slice(0,11)
            }
            if(innerText?.includes?.('向对方索要手机号')) {
                bool = true;
            }
        }
        return [bool, phone]
    }
    /**
     * 候选人主动发送交换手机号
     */
    private hasReceivePhone() {
        const msgs = this.queryReceiveMessages()
        const len = msgs?.length;
        let bool = false;
        for(let i = 0; i < len; i++) {
            if(msgs[i]?.innerText?.includes('为了方便联系，可以交换手机号吗？')) {
                bool = true;
                break;
            }
        }
        return bool;
    }
    /**
     * 候选人主动发送交换微信号
     */
    private hasReceiveWeixin() {
        const msgs = this.queryReceiveMessages()
        const len = msgs?.length;
        let bool = false;
        for(let i = 0; i < len; i++) {
            if(msgs[i]?.innerText?.includes('为了方便联系，可以交换微信号吗？')) {
                bool = true;
                break;
            }
        }
        return bool;
    }

    /**
     * 候选人是否发送了简历
     * @private {Promise<void>}
     */
    private async candidateIsSendResume() {
        let messageElements = document.querySelectorAll('.__im_pro__message') as NodeListOf<HTMLElement>;
        for (let childElement: HTMLElement of messageElements) {
            const resumeElm = childElement.querySelector('.__im_basic__send-resume-card') as HTMLElement
            if(resumeElm) {

            }
            let messageType = this.getMessageTypeByElement(resumeElm);
            if (ChatMessageType.RESUME_MESSAGE === messageType) {
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
    // private async recordMessage(conversationId: string, messageIndex: number, messageElement: HTMLElement) {
    private async recordMessage(conversationId: string) {
        if(!conversationId) return
        // let children = messageElement.children as HTMLCollectionOf<HTMLElement>;
        await sleep(1000)
        const nodes = document.querySelectorAll('.__im_pro__message.__im_pro__message-wrapper.hasAvatar') as NodeListOf<HTMLElement>;

        for (let i = 0; i < nodes.length; i++) {
            let element = nodes.item(i) as HTMLElement;
            const dom = ((element?.querySelector('.__im_UI__txt-content') || 
                            element?.querySelector('.__im_basic__send-resume-card-info-title') || 
                            element?.querySelector('.__im_basic__universal-card-content')
                        ) as HTMLElement)
            let message = dom?.innerText || '';

            let messageType = this.getMessageTypeByElement(element);

            let sender = [
                ChatMessageType.SEND_MESSAGE,
                ChatMessageType.RECEIVE_MESSAGE,
                ChatMessageType.RESUME_MESSAGE,
            ].includes(messageType) ? messageType : ChatMessageType.SYSTEM;
            addChatMessage(conversationId, i, i, new ChatMessage(i, i, sender, messageType, message));
        }
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
     * @param id    聊天会话id
     * @private {Promise<void>}
     */
    private async checkResume(id: string) {
        // 点击查看简历
        let viewResumeBtn = document.querySelector('.item-friend .hyperLink .card-btn');

        // 滚动到查看简历按钮
        viewResumeBtn.scrollIntoView();
        await remoteClickElementHighlight(viewResumeBtn, 3, 3);
        await sleep(getRandomInt(3000, 5000));
        // 取到简历的iframe dom
        const resumeDom = document.querySelector('.attachment-iframe').contentDocument as Document;

        let jobInfo = getJobInfo();

        let resume = (resumeDom.querySelector('#viewer') as HTMLElement).innerText;
        let response = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.GPT_CHECK_RESUME, {
            jobTitle: jobInfo.jobTitle,
            jobRequirement: jobInfo.filterCriteria,
            resume: resume
        })) as any;

        // console.log('%c筛选简历结果: %s', 'color: red;', JSON.stringify(response));

        // 关闭简历弹窗 fuck 这里弹出来有两个弹窗 控制台只会显示一个
        let closeElements = document.querySelectorAll('.dialog-wrap .boss-popup__close .icon-close') as NodeListOf<HTMLElement>;
        for (let closeElement of closeElements) {
            await clickElementHighlight(closeElement, 2, 3);
        }

        if (response.isQualified) {
            // 简历符合要求 收藏候选人
            await this.collectCandidate();
            // 交换微信
            await this.exchangeWechat();

            setConversationCandidateIntro(id, response.reason);
            setConversationStatus(id, ConversationStatus.SUITABLE)
            return true;
        }
        setConversationCandidateIntro(id, response.reason);
        setConversationStatus(id, ConversationStatus.UNSUITABLE);
        // 简历不符合要求
        await this.unSuitableResume();
        return false;
    }

    /**
     * 简历不合适
     * @private {Promise<void>}
     */
    private async unSuitableResume() {
        let unSuitableElements = document.querySelectorAll('.operate-exchange-right .operate-btn');

        for (let element of unSuitableElements) {
            if ('不合适' === element.innerText) {
                (document.querySelector('.operate-exchange-right .reason-list') as HTMLElement).style.display = 'block';
                let reasonBtnElements = document.querySelectorAll('.operate-exchange-right .reason-list .reason-item');
                for (let btn: HTMLElement of reasonBtnElements) {
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
        let collectBtnElements = document.querySelectorAll('.rightbar-box .rightbar-item .icon .tip') as NodeListOf<HTMLElement>;
        for (let element: HTMLElement of collectBtnElements) {
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
            const condition = [ChatMessageType.SEND_MESSAGE, ChatMessageType.RECEIVE_MESSAGE]?.includes(message.sender)
            if(condition) {
                return message.sender === ChatMessageType.SEND_MESSAGE;
            }
        }
    }
    /**
     * 最后一条消息是否是自己发送的
     * @param conversationId    聊天会话id
     * @private {Promise<boolean>}
     */
    private isLastMessageBySelf(conversationId: string) {
        let chatMessages = getChatMessages(conversationId);
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            if (ChatMessageType.SEND_MESSAGE === chatMessages[i].sender) {
                return true;
            }
            if ([ChatMessageType.RECEIVE_MESSAGE, ChatMessageType.RESUME_MESSAGE]?.includes(chatMessages[i].sender)) {
                return false;
            }
        }
    }
    /**
     * 最后一条消息是否是候选人发送
     */
    private isLastMessageSendByUser() {
        const nodes = document.querySelectorAll('.__im_pro__message.__im_pro__message-wrapper.hasAvatar') as NodeListOf<HTMLElement>;
        let len = nodes.length - 1;
        let messageType = ChatMessageType.UNKNOWN;
        let bool = false;

        if(!nodes?.length) {
            return []
        }
        for(let i = len; i >= 0; i--) {
            const sender = (nodes[i]?.querySelector?.('.__im_UI__txt') || nodes[i]?.querySelector?.('.__im_basic__send-resume-card'))?.className;
            console.log('：：sender：：', sender, sender === ChatMessageType.RECEIVE_MESSAGE)
            if([
                 ChatMessageType.SEND_MESSAGE,
                 ChatMessageType.RECEIVE_MESSAGE,
                 ChatMessageType.RESUME_MESSAGE
                ].includes(sender))
            {
                bool = [ChatMessageType.RECEIVE_MESSAGE, ChatMessageType.RESUME_MESSAGE].includes(sender)
                messageType = sender 
                break;
            }
        }
        return [bool, messageType]
    }

    /**
     * 获取候选人发送的最后一条消息
     */
    // private getFriendLastMessage(conversactionId: string) {
    //     const messages = getChatMessages(conversactionId);
    //     let len = messages.length;
    //     let lastMessage = '';
    //     while(len--) {
    //         if(messages[len]?.sender === ChatMessageType.RECEIVE_MESSAGE) {
    //             lastMessage = messages[len]?.message
    //             break;
    //         }
    //     }
    //     return lastMessage;
    // }

    // /**
    //  * 是否是最后一条消息
    //  * @param messageElement    消息元素
    //  * @private {boolean}
    //  */
    // private isLastMessage(messageElement: HTMLElement): boolean {
    //     try {
    //         let messageSize = document.querySelectorAll('.chat-message-list .message-item').length;
    //         let messageIndex = this.getElementIndex(messageElement);
    //         return messageIndex === messageSize - 1;
    //     } catch (e) {
    //         console.error('isLastMessage', messageElement, e);
    //         return false;
    //     }
    // }

    // /**
    //  * 获取元素在nodes中的索引
    //  * @param element   元素
    //  * @private {number}
    //  */
    // private getElementIndex(element: HTMLElement): number {
    //     let index = 0;
    //     while (element) {
    //         index++;
    //         element = element.previousElementSibling as HTMLElement;
    //     }
    //     return index - 1;
    // }

    private getMessageTypeByElement(element: HTMLElement) {
        if(!element) {
            return ChatMessageType.UNKNOWN;
        }
        const messageTextEle = element.querySelector('.__im_UI__txt');
        const resumeEle = element.querySelector('.__im_basic__send-resume-card')
        // let messageType = element && this.getMessageType(element.getAttribute('class') as string);
        const messageEle = messageTextEle || resumeEle
        const messageType = messageEle && this.getMessageType(messageEle.getAttribute('class') as string) || ChatMessageType.UNKNOWN;
        return messageType
    }

    private getMessageType(className: string): string {
        switch (className) {
            case ChatMessageType.SEND_MESSAGE:
                return ChatMessageType.SEND_MESSAGE;
            case ChatMessageType.RECEIVE_MESSAGE:
                return ChatMessageType.RECEIVE_MESSAGE;
            case ChatMessageType.RESUME_MESSAGE:
                return ChatMessageType.RESUME_MESSAGE;
            case ChatMessageType.SYSTEM:
                return ChatMessageType.SYSTEM;
            // case ChatMessageType.TEXT:
            //     return ChatMessageType.TEXT;
            // case ChatMessageType.MYSELF_MESSAGE:
            //     return ChatMessageType.MYSELF_MESSAGE;
            // case ChatMessageType.FRIEND_MESSAGE:
            //     return ChatMessageType.FRIEND_MESSAGE;
        }
        return ChatMessageType.UNKNOWN;
    }

    // private async beforeReplyCheckResume(conversationId: string) {
    //     let resumeStatus: number = this.findAndHandleResume(conversationId);
    //     if (resumeStatus === 0 && this.isLastMessageBySelf(conversationId)) {
    //         // 没有请求过简历,并且最后一条消息是自己发送的消息, 则请求简历
    //         await this.requestResume(conversationId);
    //     }

    //     return resumeStatus;
    // }

    // /**
    //  * 查找并处理简历
    //  * @param conversationId    聊天会话id
    //  * @private {Promise<void>}
    //  * @return 0: 没有发送简历 1: 发送了简历 2: 简历不符合要求
    //  */
    // private async findAndHandleResume(conversationId: string): number {
    //     let messageElements = document.querySelectorAll('.chat-message-list .message-item') as NodeListOf<HTMLElement>;

    //     let isSendResume = 0;
    //     for (let childElement: HTMLElement of messageElements) {

    //         let messageType = this.getMessageTypeByElement(childElement.children[0] as HTMLElement);
    //         if (ChatMessageType.FRIEND_MESSAGE === messageType) {
    //             // 检查是否是发送简历的卡片
    //             if (!this.isSelfSendFirstMessage(conversationId)) {
    //                 // 候选人主动打招呼 看是否有发送简历
    //                 const cardTitleElement = childElement.querySelector('.message-card-top-title') as HTMLElement;

    //                 // TODO 强文本判断 有更好的办法再优化
    //                 // 对方想发送附件简历给您，您是否同意
    //                 if (cardTitleElement && '对方想发送附件简历给您，您是否同意' === cardTitleElement.innerText) {
    //                     // 接收简历
    //                     await this.receiveResume();
    //                     if (ConversationStatus.CHECKING === getConversationStatus(conversationId)) {
    //                         // 检查简历是否符合要求
    //                         if (!await this.checkResume(conversationId)) {
    //                             return 2;
    //                         }
    //                     }
    //                 }

    //                 let previewResumeElement = childElement.querySelector('.message-card-buttons') as HTMLElement;
    //                 if (previewResumeElement && '点击预览附件简历' === previewResumeElement.innerText) {
    //                     if (ConversationStatus.CHECKING === getConversationStatus(conversationId)) {
    //                         // 检查简历是否符合要求
    //                         if (!await this.checkResume(conversationId)) {
    //                             return 2;
    //                         }
    //                     }
    //                     isSendResume = 1;
    //                 }

    //             }

    //         }
    //     }
    //     return isSendResume;
    // }

    // /**
    //  * 获取用户发送的最后一条消息
    //  */
    // private getLastMessageByFriend(conversationId) {
    //     let chatMessages = getChatMessages(conversationId);
    //     let lastMessage = '';
    //     const len = chatMessages?.length - 1;
    //     if(chatMessages[len]?.sender === ChatMessageType.RECEIVE_MESSAGE) {
    //         return chatMessages[len]?.message
    //     }
    //     for(let i = len; i >= 0; i--) {
    //         if(chatMessages[i].sender === ChatMessageType.RECEIVE_MESSAGE) {
    //             lastMessage = chatMessages[i]?.message
    //             break;
    //         }
    //     }

    //     return lastMessage
    // }

    private async replyToMessage(conversationId: string) {
        let chatMessages = getChatMessages(conversationId);
        if (chatMessages.length === 0) {
            return;
        }
        if (this.isLastMessageBySelf(conversationId)) {
            // 如果最后一条消息是我发送的消息，则不再回复
            // console.log('%c最后一条消息是我发送的消息, 不再回复', 'color: blue;');
            await sleep(2000)
            // this.chatMutex.release()
            return;
        }
        // console.log('%c候选人: %s', 'color: green;', chatMessages[chatMessages.length - 1].message);
        let reply = await this.generateReply(conversationId, chatMessages);
        console.log('%cai回复: %s', 'color: blue;', reply);
        const inputBox = getElementByXPath(XPATH_LIEPIN_TEXTAREA) as HTMLInputElement;
        const sendButton = getElementByXPath(XPATH_LIEPIN_SEND_MESSAGE_BTN) as HTMLElement;
        
        
        // if (inputBox && sendButton) {
            setFormElementValue(inputBox, reply);
            await sleep(1000)
            clickElementHighlight(sendButton, 2,1, false)
            // 添加回复的消息,防止执行过recordMessage函数后的线程获取不到最新的消息
            await addChatMessage(conversationId, chatMessages.length - 1, 0,
                new ChatMessage(chatMessages.length - 1, 0, ChatMessageType.MYSELF_MESSAGE, ChatMessageType.MYSELF_MESSAGE, reply));

            await this.requestResume(conversationId);
            await sleep(1000)
            // 是否向对方索要过手机 or 对方发送过手机号
            const [boolPhone, phone] = this.queryPhone()
            if(phone) {
                // 提交手机号
            }
            if(!boolPhone && !phone) {
                await this.requestPhone()
            }
            
            // // 释放锁
            // await sleep(1000)
            // this.chatMutex.release()
        // }

    }

    private async generateReply(conversationId: string, chatMessages: ChatMessage[]): Promise<string> {
        const conversation = getConversation(conversationId);

        return await chrome.runtime.sendMessage(new ResponseMessage(Cmd.GPT_GET_BOSS_REPLY_MESSAGE, {
            candidateIntro: conversation.candidateIntro,
            companyIntro: getJobInfo().sayHello,
            messages: chatMessages
        }));
    }
}


