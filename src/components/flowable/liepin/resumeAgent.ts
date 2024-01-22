import {clickElementHighlight, getRandomInt, inputElement, sleep} from "~components/flowable/DomUtil";
import {Mutex} from "async-mutex";
import {AgentStatus} from "~components/flowable/liepin/AgentStatus";
import {openAI} from "~components/openai/Openai";
import {checkResumePrompt} from "~components/openai/AiPrompt";
import OpenAI from "openai/index";
import {Cmd, ResponseMessage} from "~background/MessageModel";
import {getJobInfo, getLiepinResumeFlowStatus, setLiepinResumeFlowStatus, removeLiepinResumeFlowStatus } from "~store/JobInfoStore";
import { remoteClickElementHighlight, getElementByXPath } from '~components/flowable/DomUtil'
import { setConversationStatus, ConversationStatus } from '~/store/ConversationStore';
import { 
    VisibilityStateEnum,
    RECOMMENT_USER_LIMIT,
    STORE_RESUME_FLOW_FINISH_KEY,
    SINGLE_RECOMMEND_SCROLL_HIGHT,
    STORE_LIEPIN_CHAT_FLOW_RUNING,
    XPATH_LIEPIN_COLLECT_RESUME_BTN,
    XPATH_LIEPIN_COLLECT_GROUP_BTN
} from '~constants/index'
import { CreateLoading, getStoreActiveConversationId } from '~utils'
import { ElMessage, ElLoading } from 'element-plus'
import * as _ from 'lodash-es'
import html2canvas from 'html2canvas';

// let viewCount = 0
/**
 * 简历agent
 */
export class ResumeAgent {
    private jobInfo = null
    private times = 20
    private loadingService = null
    /**
     * 监听document变化
     * @private {MutationObserver}
     */
    private documentObserver: MutationObserver = new MutationObserver((mutations: MutationRecord[]) => {
        mutations.forEach(async (mutation) => {
            const addedNodeFirst = mutation.addedNodes[0] as HTMLElement;
            if (
                mutation.type === "childList" &&
                mutation.addedNodes.length > 0
            ) {
                if(addedNodeFirst?.className?.includes?.('__im_UI__-modal-close')) {
                    // 关闭弹窗
                    await this.closeDialogAfterChat()
                }

                // 沟通需要付费
                if(document.querySelector('.chat-card-dialog-container .pay-title')?.innerText === '支付费用') {
                    this.status = AgentStatus.FINISH
                    setLiepinResumeFlowStatus(true)
                    await this.closeCurrentTab()
                }

            }
        });
    })

    /**
     * 沟通牛人后会弹一个弹框
     */
    private async closeDialogAfterChat() {
        await sleep(1500)
        const dialogDom = document.querySelector('.__im_UI__-modal-close') as HTMLElement;
        if(dialogDom) {
            await clickElementHighlight(dialogDom, 3, 3);
        }
    }

    /**
     * 监听页面显示隐藏
     */
    private documentVisibilityChange = () => {
        document.addEventListener('visibilitychange', async () => {
            if(document.visibilityState === VisibilityStateEnum.VISIBLE) {
                const flowFinishStatus = getLiepinResumeFlowStatus();
                if(flowFinishStatus === true) {
                    this.checkResumeFinish()
                }
                if(this.status === AgentStatus.RUNNING) {
                    await sleep(2000)
                    this.doCheckResumeLock.release()
                    this.scrollToView()
                }
            }
        })
    }

    /**
     * 滚动牛人列表
     */
    private scrollToView() {
        window.scrollBy(0, SINGLE_RECOMMEND_SCROLL_HIGHT)
    }

    /**
     * 推荐列表dom
     * @private {Document}
     */
    // private recommendsDom: Document = document;
    private recommendsDom: HTMLDivElement;

    /**
     * 推荐列表dom变化监听
     * @private {MutationObserver}
     */
    private recommendsDomObserver: MutationObserver = new MutationObserver((mutations: MutationRecord[]) => {
    });

    /**
     * 检查简历锁
     * @private {Mutex}
     */
    private doCheckResumeLock: Mutex = new Mutex();

    /**
     * 当前检查的候选人游标
     * @private {number}
     */
    private currentCandidateCheckCursor: number = 0;

    /**
     * 状态
     * @private {string}
     */
    public status: string = AgentStatus.READY;

    constructor(private jobTitle: string, private filterCriteria: string, jobInfo: any = {}) {
        this.jobInfo = jobInfo
    }

    /**
     * 筛选岗位
     */
    private getTargetTab() {
        const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab'));
        const storeJobInfo = this.jobInfo || getJobInfo();
        const ele = tabs.find(ele => ele.textContent?.toLowerCase?.()?.includes(storeJobInfo?.jobTitle?.toLowerCase?.()))
        return ele
    }
    /**
     * 当前岗位是否已选中
     */
    isTabSelected(tabDom) {
        return tabDom?.className?.includes('ant-tabs-tab-active')
    }
    /**
     * 开始执行agent
     */
    async start(times, jobInfo) {
        try {
            if (this.status === AgentStatus.RUNNING) {
                return;
            }
            if(times) {
                this.times = times
            }
            this.jobInfo = jobInfo
            this.currentCandidateCheckCursor = 0;
            // 推荐菜单
            await clickElementHighlight(document.querySelector('[data-selector="home"]') as HTMLElement, 1, 1);
            // 岗位
            const tabDom = this.getTargetTab();
            await clickElementHighlight(tabDom as HTMLElement, 2, 3);
            this.status = AgentStatus.RUNNING;
            this.documentVisibilityChange()
            this.observeDocument();
            await this.execute();
            await sleep(1000);
            await this.filterCandidate();
        } catch (e) {
            this.status = AgentStatus.ERROR;
            this.checkResumeFinish();
            console.error(e);
        }
    }

    /**
     * 监听document变化
     * @private {Promise<void>}
     */
    observeDocument() {
        this.documentObserver.observe(document, {childList: true, subtree: true});
    }
    /**
     * 获取牛人列表
     * @private {Promise<void>}
     */
    private getUserList() {
        return Array.from(document.querySelectorAll('.resumecard-new-li-wrap'))
    }
    /**
     * 执行agent
     * @private {Promise<void>}
     */
    private async execute() {
        await sleep(1000);
        this.recommendsDom = (document.querySelector('.recommand-resumes') as HTMLDivElement)
        this.recommendsDomObserver.disconnect();
        this.recommendsDomObserver = new MutationObserver((mutations: MutationRecord[]) => {
            // mutations.forEach((mutation) => this.handleRecommendsMutation(mutation, this.recommendsDom));
            const list = mutations.filter(mutation => {
                let addedNodeFirst = mutation.addedNodes[0] as HTMLElement;

                return (
                    mutation.type === "childList" &&
                    mutation.addedNodes.length > 0 &&
                    addedNodeFirst.className?.includes('.new-resume-item-wrap')
                )
            })
            
            this.handleRecommendsMutation(list)
        });
        if(this.recommendsDom) {
            this.recommendsDomObserver.observe(this.recommendsDom, {childList: true, subtree: true});
        }
    }

    /**
     * 处理推荐列表dom变化
     * @param mutation  变化
     * @param recommendsDom 推荐列表dom
     * @private
     */
    private async handleRecommendsMutation(mutations: MutationRecord[]) {
            // 推荐列表变动
            // 过滤候选人
            await this.filterCandidate();
        
    }
    // private async handleRecommendsMutation(mutation: MutationRecord, recommendsDom: HTMLDivElement) {
    //     let targetElement = mutation.target as HTMLElement;
    //     let addedNodeFirst = mutation.addedNodes[0] as HTMLElement;

    //     if (
    //         mutation.type === "childList" &&
    //         mutation.addedNodes.length > 0 &&
    //         addedNodeFirst.className?.includes('.new-resume-item-wrap') //&&
    //     ) {
    //         // 推荐列表变动
    //         // 过滤候选人
    //         await this.filterCandidate(targetElement);
    //     }
    // }
    /**
     * 过滤候选人
     * @param targetElement 目标元素
     * @private {Promise<void>}
     */
    private async filterCandidate() {
        let count = this.times;

        let candidateElements = document.querySelectorAll('.new-resume-item-wrap') as NodeListOf<HTMLElement>;
        if(this.currentCandidateCheckCursor + 1 > this.times) {
            return
        }
        let recommendsDom = (document?.querySelector?.('.recommand-resumes') as HTMLDivElement) || document;

        let i = this.currentCandidateCheckCursor;
        const len = candidateElements?.length;
        while(i < len) {
            this.currentCandidateCheckCursor++
            await this.clickResume(recommendsDom, candidateElements[i], i);
            i++
            if(i+1 > this.times) {
                setLiepinResumeFlowStatus(true)
                break;
            }
        }
        
        // await sleep(1000)
        // this.checkResumeFinish()
    }
    // private async filterCandidate(targetElement?: HTMLElement) {
    //     let count = this.times;

    //     let candidateElements = document.querySelectorAll('.new-resume-item-wrap') as NodeListOf<HTMLElement>;
    //     let sliceCandidateElements = this.sliceNodeList(candidateElements, this.currentCandidateCheckCursor);
    //     let recommendsDom = (document?.querySelector?.('.recommand-resumes') as HTMLDivElement) || document;
    //     let i = 0;
    //     const len = sliceCandidateElements.length;
    //     while(i < len) {
    //         console.log(count, this.status, '第几个元素66', i, len)
    //         await this.clickResume(recommendsDom, sliceCandidateElements[i], i);
    //         i++
    //     }
    //     // for (let i = 0; i < 5; i++) {
    //     //     count--
    //     //     console.log(count, this.status, '第几个元素66', i, sliceCandidateElements.length)
    //     //     await this.clickResume(recommendsDom, sliceCandidateElements[i], i);
    //         // if(count <= 0) {
    //         //     this.checkResumeFinish()
    //         // }
    //     // }
        
    //     this.currentCandidateCheckCursor = candidateElements.length - 1;
    //     await sleep(1000)
    //     this.checkResumeFinish()
    // }
    /**
     * 获取猎聘简历文本
     */
    private async getResumeText() {
        await sleep(1000)
        const innerText = document.querySelector("#water-mark-wrap")?.innerText;
        return innerText;
        // const resumeDoms = Array.from(document.querySelector("#water-mark-wrap").children).filter(ele => ele.className.includes('jsx-'))
        // const resumeText = resumeDoms.reduce((prev, next: HTMLElement) => prev + next?.innerText, '')

        // return resumeText
    }

    /**
     * sendToBackground 关闭当前标签页
     */
    private async closeCurrentTab(options = {}) {
        await sleep(1000)
        await window.close()
        // await chrome.runtime.sendMessage(new ResponseMessage(Cmd.CLOSE_CURRENT_TAB, {...options}))
    }

    private async html2canvas () {
        // 展开简历信息
        document.querySelector('.c-btn-more.xpath-resume-highlights-btn')?.click?.()
        await sleep(500)
        html2canvas(document.querySelector("#water-mark-wrap")).then(canvas => {
            // document.body.appendChild(canvas)
        });
    }

    /**
     * 检查简历
     * @param recommendsDom 推荐列表dom
     * @param resumeElement 简历元素
     * @private {Promise<void>}
     */
    async checkResume(recommendsDom: Document | HTMLElement, resumeElement?: HTMLElement) {
        await sleep(1000);

        const id = getStoreActiveConversationId()
        const isPrivatedResume = document.querySelector('#resume_detail_page_wrap')?.querySelector('.c-msg')?.innerText?.includes?.('对方设置了隐私保护，暂不支持查看简历')
        if(isPrivatedResume) {
            setConversationStatus(id, ConversationStatus.UNSUITABLE);
            await this.closeCurrentTab()
            return
        }

        const collectBtn = getElementByXPath(XPATH_LIEPIN_COLLECT_RESUME_BTN) as HTMLElement;
        await sleep(1000)
        if(collectBtn?.innerText === '已收藏') {
            this.closeCurrentTab()
            return
        }
        this.html2canvas()
        // const closeLoading = CreateLoading('简历筛选中，请耐心等待！')
        try {
            let jobInfo = this.jobInfo || getJobInfo();
            let response = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.GPT_CHECK_RESUME, {
                jobTitle: jobInfo.jobTitle,
                jobRequirement: jobInfo.filterCriteria,
                resume: document.querySelector("#water-mark-wrap")?.innerText //(recommendsDom.querySelector("#water-mark-wrap") as HTMLElement).innerText
            })) as any;

            console.log('%c筛选简历结果: %s', 'color: red;', JSON.stringify(response));

            // closeLoading()

            if (response.isQualified) {
                setConversationStatus(id, ConversationStatus.SUITABLE);
                ElMessage.success('简历合格')
                await this.acceptResume(recommendsDom);
                await this.closeDialogAfterChat()
            } else {
                ElMessage.error('简历筛选结果不合适')
                
                setConversationStatus(id, ConversationStatus.UNSUITABLE);
                // await this.closeCurrentTab()
                // await this.rejectResume(response.reason, recommendsDom);
            }
        } finally {
            // closeLoading()
            // this.doCheckResumeLock.release();
            // 关闭当前标签页
            await sleep(2000)
            // await this.closeCurrentTab()
        }
    }

    /**
     * 拒绝简历
     * @param reason    原因
     * @param recommendsDom
     * @private {Promise<void>}
     */
    private async rejectResume(reason: string, recommendsDom: Document | HTMLElement) {
        // 点击不合适按钮
        await clickElementHighlight(recommendsDom.querySelector("#resume-page em.icon-report.iboss-quxiao") as HTMLElement, 3, 3);
        /*
                let reasonElements: NodeListOf<HTMLElement> = document.querySelectorAll(".feedback-list .feedback-item");

                // 点击不合适原因
                let unsuitableBtnElement = reasonElements[reasonElements.length - 1] as HTMLElement;
                await clickElementHighlight(unsuitableBtnElement, 2, 3);

                // 输入原因
                console.log('rejectResume', unsuitableBtnElement, unsuitableBtnElement.nextElementSibling);

                //TODO 输入其他原因 这里有问题 还要观察
                let reasonTextareaElements = document.querySelectorAll(".feedback-wrap .textarea-container textarea");
                for (let reasonTextarea: HTMLElement of reasonTextareaElements) {
                    await inputElement(
                        reasonTextarea as HTMLTextAreaElement,
                        reason
                    );
                }*/

        // 选择求职期望不合
        await clickElementHighlight(document.querySelectorAll('.feedback-list .feedback-item')[0] as HTMLElement, 3, 3);
        /*await inputElement(
            unsuitableBtnElement.nextElementSibling.querySelector("textarea") as HTMLTextAreaElement,
            reason
        );*/
        // 点击提交
        for (let submitBtn of (document.querySelectorAll(".boss-dialog__footer > span") as NodeListOf<HTMLElement>)) {
            await clickElementHighlight(submitBtn, 3, 3);
        }
    }

    /**
     * 接受简历
     * @param recommendsDom 推荐列表dom
     * @private {Promise<void>}
     */
    private async acceptResume(recommendsDom: Document | HTMLElement) {
        this.collectResume()
        await clickElementHighlight(recommendsDom.querySelector(".c-primary.xpath-open-im-btn") as HTMLElement, 3, 3);
        // await clickElementHighlight(recommendsDom.querySelector("#resume-page .dialog-chat-greeting .btn") as HTMLElement, 2, 3);
    }
    /**
     * 收藏候选人（简历）
     */
    private async collectResume() {
        // await sleep(300)
        // 收藏按钮
        const collectBtn = getElementByXPath(XPATH_LIEPIN_COLLECT_RESUME_BTN) as HTMLElement;
        await sleep(500)
        if(collectBtn?.innerText === '收藏') {
            clickElementHighlight(collectBtn, 1,3, false)
            await sleep(2000)
            // 收藏分组
            // const groupBtn = getElementByXPath(XPATH_LIEPIN_COLLECT_GROUP_BTN) as HTMLElement;
            const groupBtn = document.querySelectorAll('.ant-tree-treenode')?.[2]?.querySelector?.('.tree-title') as HTMLElement;
            clickElementHighlight(groupBtn, 1,3, false)
        }
        
        
    }

    /**
     * 点击简历
     * @param recommendsDom 推荐列表dom
     * @param element   简历元素
     * @private {Promise<void>}
     */
    private async clickResume(recommendsDom: Document | HTMLDivElement, element: HTMLElement, index: number) {
        const dom = document.querySelectorAll('.new-resume-item-wrap')?.item(index)
        await this.doCheckResumeLock.acquire().then(async () => {
            await clickElementHighlight(dom as HTMLElement, 2, 3, false);
            // await remoteClickElementHighlight(dom as HTMLElement, 2, 3);
        });
    }

    /**
     * 检查简历任务完成
     * @private {void}
     */
    private checkResumeFinish() {
        this.currentCandidateCheckCursor = 0;
        this.status = AgentStatus.FINISH;
        // 关闭dom监听
        this.documentObserver.disconnect();
        // 关闭推荐列表iframe dom监听
        this.recommendsDomObserver.disconnect();
        removeLiepinResumeFlowStatus();
        if(this.jobInfo?.resumeFilterMethod === 3) {
            this.startChatFlow()
        }
    }

    /**
     * 进入沟通流程
     */
    private async startChatFlow() {
        localStorage.setItem(STORE_LIEPIN_CHAT_FLOW_RUNING, 'true')
        // 直接新开标签页
        await sleep(1000)
        // window.open('https://lpt.liepin.com/im/imresourceload')
        // window.close()
        const chatDom = document.querySelector('[data-selector="IM"] > a');
        clickElementHighlight(chatDom as HTMLElement, 1, 3);
    }


    /**
     * 截取数组
     * @param array 数组
     * @param beginIndex    开始索引
     * @param endIndex  结束索引
     * @private {T[]}
     */
    private sliceNodeList<T extends Node>(array: NodeListOf<T>, beginIndex: number, endIndex?: number): T[] {
        const result: T[] = [];
        endIndex = endIndex || array.length;

        for (let i = beginIndex; i < endIndex; i++) {
            result.push(array[i]);
        }

        return result;
    }
}
