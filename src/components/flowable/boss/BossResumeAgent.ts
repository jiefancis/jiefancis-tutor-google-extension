import {clickElementHighlight, inputElement, sleep} from "~components/flowable/DomUtil";
import {Mutex, MutexInterface} from "async-mutex";
import {AgentStatus} from "~components/flowable/boss/AgentStatus";
import {Cmd, ResponseMessage} from "~background/MessageModel";
import {getTaskInfoByServer} from "~store/JobInfoStore";
import {FileUploadInfo, GptCheckResumeResult, ResumeInfo, TaskInfo} from "~background/api/Model";
import {ENUM_PLATFORM, ResumeStatusEnum} from "~constants";
import Releaser = MutexInterface.Releaser;

/**
 * 简历agent
 */
export class ResumeAgent {
    /**
     * 监听document变化
     * @private {MutationObserver}
     */
    private documentObserver: MutationObserver = new MutationObserver((mutations: MutationRecord[]) => {

    });

    /**
     * 推荐列表dom
     * @private {Document}
     */
    private recommendsDom: Document = document;

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
     * 设置打招呼锁 等待设置完成后进行下一步
     * @private {Mutex}
     */
    private setGreetingLock: Mutex = new Mutex();

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

    /**
     * 当前候选人id
     * @private {string}
     */
    private currentGeekId: string = null;

    /**
     * 开始执行agent
     */
    async start() {
        try {
            if (this.status === AgentStatus.RUNNING) {
                return;
            }
            await this.setGreeting();
            await clickElementHighlight(document.querySelector(".menu-recommend > dt > a") as HTMLElement, 2, 3);
            this.status = AgentStatus.RUNNING;
            this.observeDocument();
            await this.execute();
            await sleep(3000);
            await this.filterCandidate(this.recommendsDom.querySelector(".recommend-list-wrap") as HTMLElement);
        } catch (e) {
            this.status = AgentStatus.ERROR;
            this.checkResumeFinish();
            console.error(e);
        }
    }

    /**
     * 打招呼话术设置
     */
    private async setGreeting() {
        // 点击账号设置
        await clickElementHighlight(document.querySelector('.link-msgset'), 3, 3);

        await sleep(3000);

        //获取到设置页面的iframe
        const frameBoxDom = (document.querySelector('.frame-box iframe') as HTMLIFrameElement).contentDocument;

        await this.setGreetingLock.acquire().then(async (releaser: Releaser) => {
            let frameBoxDomObserver = new MutationObserver((mutations: MutationRecord[]) => {
                mutations.forEach((mutation) => this.handleGreetingMutation(mutation, frameBoxDomObserver, frameBoxDom));
            });

            frameBoxDomObserver.observe(frameBoxDom, {childList: true, subtree: true});
            // 点击打招呼话术设置
            await clickElementHighlight(frameBoxDom.querySelectorAll('.set-nav li')[2] as HTMLElement, 3, 3);
            while (true) {
                await sleep(1000);
                if (!this.setGreetingLock.isLocked()) {
                    break;
                }
            }
        });

    }

    private async handleGreetingMutation(mutation: MutationRecord, frameBoxDomObserver: MutationObserver, frameBoxDom: Document): Promise<void> {
        const addedNode = mutation.addedNodes[0] as HTMLElement;
        const targetNode = mutation.target as HTMLElement;

        if ('childList' === mutation.type && addedNode && targetNode
            && 'greeting-tab' === addedNode.className
            && 'greeting-container set-content' === targetNode.className) {
            // 打招呼设置页面出现
            for (let tabElement: HTMLElement of (addedNode.querySelectorAll('.tab-content .list-tab p') as NodeListOf<HTMLElement>)) {
                if ('自定义' === tabElement.innerText) {
                    try {
                        //点击自定义打招呼话术
                        await clickElementHighlight(tabElement, 3, 3);

                        let sayHello = (await getTaskInfoByServer() as TaskInfo).sayHello;

                        if (sayHello.length > 100) {
                            // BOSS直聘打招呼话术限制100字,超过100字需要缩减
                            let shortenNum = 0;
                            while (true) {
                                if (shortenNum > 5) {
                                    console.error('缩减打招呼话术失败,优化后话术字数大于100', sayHello);
                                }
                                sayHello = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_SHORTEN_SENTENCE, {
                                    sentence: sayHello,
                                    num: 100
                                })) as string;

                                shortenNum++;
                                if (sayHello.length > 0 && sayHello.length <= 100) {
                                    // 缩减成功
                                    break;
                                }
                            }
                        }
                        //输入打招呼话术
                        await inputElement(addedNode.querySelector('.tab-content .item-content .input'), sayHello);

                        //点击保存
                        await clickElementHighlight(addedNode.querySelector('.tab-content .confrim-btn .btn'), 3, 3);
                        await sleep(3000);
                    } finally {
                        frameBoxDomObserver.disconnect();
                        this.setGreetingLock.release();
                    }
                    break;
                }
            }
        } else if ('childList' === mutation.type && addedNode && targetNode
            && 'greeting-open' === addedNode.className && 'greeting-container set-content' === targetNode.className) {
            // 没有打开打招呼话术设置开关, 需要点击switch
            await clickElementHighlight(frameBoxDom.querySelector('.account-container .switch span input'), 3, 3);
        }
    }

    /**
     * 监听document变化
     * @private {Promise<void>}
     */
    private observeDocument() {
        this.documentObserver = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach((mutation) => {
                const addedNodeFirst = mutation.addedNodes[0] as HTMLElement;
                if (
                    mutation.type === "childList" &&
                    mutation.addedNodes.length > 0 &&
                    addedNodeFirst.className ===
                    "boss-popup__wrapper boss-dialog boss-dialog__wrapper business-block-dialog business-block-wrap circle"
                ) {
                    // 弹窗
                    if (!(addedNodeFirst.querySelector(".order-need") as HTMLElement)) {
                        // 支付弹窗
                        this.checkResumeFinish();
                    }
                }
            });
        });
        this.documentObserver.observe(document, {childList: true, subtree: true});
    }

    /**
     * 执行agent
     * @private {Promise<void>}
     */
    private async execute() {
        // 等待推荐列表的iframe加载完成
        await sleep(1000);
        this.recommendsDom = (document.querySelector('[name="recommendFrame"]') as HTMLIFrameElement)
            .contentDocument as Document;
        this.recommendsDomObserver.disconnect();
        this.recommendsDomObserver = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach((mutation) => this.handleRecommendsMutation(mutation, this.recommendsDom));
        });
        this.recommendsDomObserver.observe(this.recommendsDom, {childList: true, subtree: true});
    }

    /**
     * 处理推荐列表dom变化
     * @param mutation  变化
     * @param recommendsDom 推荐列表dom
     * @private
     */
    private async handleRecommendsMutation(mutation: MutationRecord, recommendsDom: Document) {
        let targetElement = mutation.target as HTMLElement;
        let addedNodeFirst = mutation.addedNodes[0] as HTMLElement;

        if (
            mutation.type === "childList" &&
            mutation.addedNodes.length > 0 &&
            addedNodeFirst.className === "list-wrap card-list-wrap" &&
            targetElement.className === "recommend-list-wrap"
        ) {
            // 推荐列表变动
            // 过滤候选人
            await this.filterCandidate(targetElement);
        } else if (
            mutation.type === "childList" &&
            mutation.addedNodes.length > 0 &&
            addedNodeFirst.className === "resume-dialog"
        ) {
            // 弹出简历 开始筛选简历
            await this.checkResume(recommendsDom);
        }
    }

    /**
     * 过滤候选人
     * @param targetElement 目标元素
     * @private {Promise<void>}
     */
    private async filterCandidate(targetElement: HTMLElement) {
        let candidateElements = targetElement.querySelectorAll(".card-inner") as NodeListOf<HTMLElement>;
        let sliceCandidateElements = this.sliceNodeList(candidateElements, this.currentCandidateCheckCursor);
        await sleep(3000);
        let recommendsDom = (document.querySelector('[name="recommendFrame"]') as HTMLIFrameElement)
            .contentDocument as Document;

        for (let i = 0; i < sliceCandidateElements.length; i++) {
            await this.clickResume(recommendsDom, sliceCandidateElements[i]);
        }
        this.currentCandidateCheckCursor = candidateElements.length - 1;
    }

    /**
     * 检查简历
     * @param recommendsDom 推荐列表dom
     * @private {Promise<void>}
     */
    private async checkResume(recommendsDom: Document): Promise<void> {
        try {
            recommendsDom.querySelector('.resume-warning').remove();
            const jobInfo = await getTaskInfoByServer();
            let response: GptCheckResumeResult = null;
            let resumeText = null;
            let resumePageElement = null;
            let geekName = null;
            while (true) {
                resumePageElement = recommendsDom.querySelector("#resume-page .resume-item-content") as HTMLElement;
                resumeText = resumePageElement.innerText;
                geekName = (recommendsDom.querySelector('.geek-name') as HTMLElement).innerText;
                response = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_CHECK_RESUME, {
                    taskId: jobInfo.id,
                    resume: resumeText
                })) as any;
                if (response !== null) {
                    break;
                }
            }

            console.log('%c筛选简历结果: %s', 'color: red;', JSON.stringify(response));

            const resumeTextDownloadUrl = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_FILE_UPLOAD,
                new FileUploadInfo('resume.txt', resumeText)));
            console.log('%c简历文本下载地址: %s', 'color: red;', resumeTextDownloadUrl);

            const resumeInfo = new ResumeInfo(jobInfo.id, this.currentGeekId, null, ENUM_PLATFORM.BOSS, response.score,
                response.qualified ? ResumeStatusEnum.SUITABLE : ResumeStatusEnum.UNSUITABLE,
                geekName, null, null, jobInfo.jobTitle, response.reason, resumeTextDownloadUrl, ''
            );

            let saveResumeResult = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_RESUME_SAVE, resumeInfo));
            if (saveResumeResult === null) {
                throw new Error('保存简历失败');
            }

            if (response.qualified) {
                // 接受简历
                await this.acceptResume(recommendsDom);
            }

            // 关闭简历弹窗
            await clickElementHighlight(recommendsDom.querySelector('.resume-custom-close'), 3, 3);
        } finally {
            this.doCheckResumeLock.release();
        }
    }

    /**
     * 拒绝简历
     * @param reason    原因
     * @param recommendsDom
     * @private {Promise<void>}
     */
    private async rejectResume(reason: string, recommendsDom: Document) {
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
    private async acceptResume(recommendsDom: Document) {
        // 点击打招呼按钮
        await clickElementHighlight(recommendsDom.querySelector("#resume-page .btn-greet") as HTMLElement, 3, 3);

        await clickElementHighlight(recommendsDom.querySelector("#resume-page .dialog-chat-greeting .btn") as HTMLElement, 2, 3);
    }

    /**
     * 点击简历
     * @param recommendsDom 推荐列表dom
     * @param element   简历元素
     * @private {Promise<void>}
     */
    private async clickResume(recommendsDom: Document, element: HTMLElement) {
        await this.doCheckResumeLock.acquire().then(async () => {
            this.currentGeekId = element.getAttribute("data-geekid") as string;
            await clickElementHighlight(element.querySelector(".name-wrap .name") as HTMLElement, 3, 3);
        });
    }

    /**
     * 检查简历任务完成
     * @private {void}
     */
    private checkResumeFinish() {
        this.status = AgentStatus.FINISH;
        // 关闭dom监听
        this.documentObserver.disconnect();
        // 关闭推荐列表iframe dom监听
        this.recommendsDomObserver.disconnect();
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
