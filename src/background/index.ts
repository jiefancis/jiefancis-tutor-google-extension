import "@plasmohq/messaging/background"
import {Cmd, ResponseMessage} from "~background/MessageModel";
import {
    TAB_STATUS_ENUM,
    BACKGROUND_MESSAGE_EVENT_LIEPIN,
    STORE_USER_INFO_KEY,
    TUTOR_TOKEN_UUID,
    TUTOR_SCREENSHOT_INTERVAL,
    TUTOR_DEFAULT_WIN_RESIZE,
    TUTOR_MEDIUM_WIN_RESIZE,
    TUTOR_MAX_WIN_RESIZE
} from '~constants/index';
import {taskApi} from "~background/api/TaskApi";
import {gptHiringApi} from "~background/api/GptHiringApi";
import {bossGpt} from "~background/api/BossGpt";
import {authApi} from "~background/api/AuthApi";
import {GptCheckResumeResult} from "~background/api/Model";
import {resumeApi} from "~background/api/ResumeApi";
import {fileApi} from "~background/api/FileApi";
import {hiringMessageApi} from "~background/api/HiringMessageApi";
import UserApi from '~background/api/UserApi';
import { EventEnum } from '~constants/event'
import { nanoid } from 'nanoid'
import { useGlobalState } from '~store/global'


let currentTabId = -1;
let runningJobInfo = null;

let uuid = ''
let winId = ''

let timer = null
let isScreenShot = false;

// const store = useGlobalState()
// let times = 30

const queryActiveTabs = async () => {
    // const tabs = await chrome.tabs.query({ active: true})
    const tabs = await chrome.tabs.query({})
    return tabs?.filter(tab => tab.windowId !== winId) || []
}




chrome.runtime.onMessage.addListener((message: ResponseMessage, sender, sendResponse) => {
    try {
        console.log('background message', message, message.cmd === Cmd.SCREEN_SHOT_START);
        switch (message.cmd) {
            case Cmd.GPT_GET_BOSS_REPLY_MESSAGE:
                bossGpt.getReplyMessage(message.data.candidateIntro, message.data.companyIntro, message.data.messages).then((reply: string) => {
                    sendResponse(reply);
                });
                break;
            case Cmd.GPT_CHECK_RESUME:
                bossGpt.checkResume(message.data.jobTitle, message.data.jobRequirement, message.data.resume).then((response: any) => {
                    sendResponse(response);
                });
                break;
            case Cmd.GPT_SHORTEN_SENTENCE:
                bossGpt.shortenSentence(message.data.sentence, message.data.num).then((response: any) => {
                    sendResponse(response);
                });
                break;
            case Cmd.DOM_CLICK:
                const tabId = sender.tab.id;
                const x = message.data.x;
                const y = message.data.y;
                chrome.debugger.attach({tabId}, '1.3', () => {
                    sendMouseEvent({tabId, type: 'mousePressed', x, y})
                    sendMouseEvent({tabId, type: 'mouseReleased', x, y})
                    chrome.debugger.detach({tabId});
                    console.log('remote click element success', tabId, x, y);
                    sendResponse(true);
                });
                break;
            case Cmd.CLOSE_CURRENT_TAB:
                chrome.tabs.remove(currentTabId)
                sendResponse(true);
                break;
            case Cmd.SERVER_SEND_VERIFY_CODE:
                authApi.sendVerifyCode(message.data.phone).then((code) => {
                    sendResponse(code);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_LOGIN:
                authApi.login(message.data.phone, message.data.verifyCode).then(() => {
                    sendResponse(true);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;

            case Cmd.SERVER_TASK_SAVE:
                taskApi.saveTask(message.data).then(() => {
                    sendResponse(true);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_TASK_DELETE:
                taskApi.deleteTask(message.data?.id).then(() => {
                    sendResponse(true);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_TASK_LIST:
                taskApi.getTasks(message.data).then((page) => {
                    sendResponse(page);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_TASK_DETAIL:
                if(message.data.id !== -1) {
                    taskApi.detailTask(message.data.id).then((task) => {
                        sendResponse(task);
                    }).catch((e) => {
                        console.error(e);
                        sendResponse(null);
                    });
                }
                
                break;
            case Cmd.SERVER_SHORTEN_SENTENCE:
                gptHiringApi.shortenSentence(message.data.sentence, message.data.num).then((response: string) => {
                    sendResponse(response);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_GET_BOSS_REPLY_MESSAGE:
                gptHiringApi.getReplyMessage(message.data.taskId, message.data.platform, message.data.conversationId).then((reply: string) => {
                    sendResponse(reply);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_CHECK_RESUME:
                gptHiringApi.checkResume(message.data.taskId, message.data.conversationId, message.data.resume).then((response: GptCheckResumeResult) => {
                    sendResponse(response);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_RESUME_SAVE:
                resumeApi.saveResume(message.data).then(() => {
                    sendResponse(true);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_FILE_UPLOAD:
                fileApi.uploadFile(message.data).then((response) => {
                    sendResponse(response);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_ADD_HIRING_MESSAGE:
                hiringMessageApi.addHiringMessage(message.data).then((response) => {
                    sendResponse(true);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_GET_HIRING_MESSAGES:
                hiringMessageApi.getHiringMessages(message.data.platform, message.data.conversationId).then((response) => {
                    sendResponse(response);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_RESUME_UPDATE_STATUS:
                resumeApi.updateResumeStatus(message.data).then((response) => {
                    sendResponse(true);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_RESUME_UPDATE_CONTACT:
                resumeApi.updateResumeContact(message.data).then((response) => {
                    sendResponse(true);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_RESUME_GET_STATUS:
                resumeApi.getResumeStatus(message.data).then((response) => {
                    sendResponse(response);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.CREATE_lIEPIN_WINDOW:
                runningJobInfo = message?.data || {};
                if(runningJobInfo?.liepin) {
                    chrome.windows.create({url: 'https://lpt.liepin.com/'})
                }
                sendResponse(true);
                break;
            case Cmd.SERVER_GET_JOB_LABELS:
                taskApi.queryJobLabels().then((data) => {
                    sendResponse(data);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            case Cmd.SERVER_GET_RECORD_LIST:
                resumeApi.queryTableList(message?.data).then((data) => {
                    sendResponse(data);
                }).catch((e) => {
                    console.error(e);
                    sendResponse(null);
                });
                break;
            
            case Cmd.SERVER_GET_USERINFO:
                UserApi.getUserInfo().then(data => {
                    sendResponse(data)
                }).catch(e => {
                    console.error('getUserInfo::',e, e?.msg)
                    sendResponse(null);
                })
                break;
            case Cmd.SERVER_SAVE_USERINFO:
                UserApi.saveUserInfo(message?.data).then(data => {
                    sendResponse(data)
                }).catch(e => {
                    console.error('saveUserInfo::',e, e?.msg)
                    sendResponse(null);
                })
                break;
            case Cmd.UPDATE_STORAGE_USERINFO:
                chrome.storage.local.set({
                    [STORE_USER_INFO_KEY]: message?.data
                });
                sendResponse(true)
                break;
            case Cmd.GET_STORAGE_USERINFO:
                chrome.storage.local.get([STORE_USER_INFO_KEY]).then(res => {
                    sendResponse(res?.[STORE_USER_INFO_KEY] || null)
                })
                break;
            case Cmd.GET_TUTOR_TOKEN_UUID:
                sendResponse(genUUID())
                break;
            case Cmd.UPDATE_WIN:
                updateWin(message.data)
                break;
            case Cmd.SCREEN_SHOT_START:
                record()
                break;
            case Cmd.SCREEN_SHOT_STOP:
                stopRecord();
                break;
            case Cmd.SCREEN_SHOT_UPLOAD:
                fileApi.uploadScreenShot(message.data).then(sendResponse).catch(sendResponse)
                break;
            case Cmd.TUTOR_WIN_CLOSE:
                chrome.windows.remove(winId, () => {
                    winId = null
                    sendResponse(true)
                })
                break;
                
        }
    } catch (e) {
        console.error(e);
        sendResponse(null);
    }
});

/**
 * 猎聘预览简历，新开tab页面，监听页面加载
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tab.status === TAB_STATUS_ENUM.COMPLETE) {
        currentTabId = tabId;
        if(tab.url?.includes('liepin.com')) {
            const res = await chrome.storage.local.get([STORE_USER_INFO_KEY])
            console.log("Value currently is " + res.key, res);

            const response = await chrome.tabs.sendMessage(tabId, { 
                event: BACKGROUND_MESSAGE_EVENT_LIEPIN,
                ...runningJobInfo,
                // [STORE_USER_INFO_KEY]: 
            });
        }
    }
})

const sendMouseEvent = ({tabId, type, x, y}) => {
    chrome.debugger.sendCommand({tabId}, 'Input.dispatchMouseEvent', {
        type,
        x,
        y,
        button: 'left',
        clickCount: 1 // 这个参数很重要，表示点击次数，如果不设置或者为0，则无法触发点击事件
    })
}


const sendMessageByTabId = async (id, message) => {
    return await chrome.tabs.sendMessage(id, message)
}

chrome.action.onClicked.addListener(tabInfo => {
    sendMessageByTabId(tabInfo.id, {event: EventEnum.open_popup })
    if(!winId) {
        createWin()
    }
})

const genUUID = () => {
    if(!uuid) {
        chrome.storage.local.get([TUTOR_TOKEN_UUID]).then((res) => {
            uuid = res?.[TUTOR_TOKEN_UUID]
            if(!uuid) {
                uuid = nanoid()
                chrome.storage.local.set({ [TUTOR_TOKEN_UUID]: uuid})
            }
          });
    }
    return uuid;
} 
chrome.runtime.onInstalled.addListener(() => {
    genUUID()
})

const WINTH = 400
const HRIGHT = 700
// windows
function createWin() {
    if(!winId) {
        chrome.windows.create({
            width: WINTH,
            height: HRIGHT,
            type: 'popup',
            url: chrome.runtime.getURL('devtools.html#')
        }, (window) => {
            winId = window.id
            chrome.tabs.sendMessage(window.id, {
                event: Cmd.OPEN_POPUP
            })
        })
    }
    
}

function updateWin(options) {
    let size = TUTOR_DEFAULT_WIN_RESIZE;
    switch(options.type) {
        case 'medium':
            size = TUTOR_MEDIUM_WIN_RESIZE;
            break;
        case 'max':
            size = TUTOR_MAX_WIN_RESIZE;
    }

    chrome.windows.update(winId, {
        width: WINTH,
        height: HRIGHT,
        focused: true,
        ...size
    })
}
chrome.windows.onRemoved.addListener((wid) => {
    console.log('chrome.windows.onRemoved', wid)
    if(wid === winId) {
        winId = null
    }
})


async function record() {
    isScreenShot = true;
    const tabs = await queryActiveTabs()
    
    timer = setTimeout(() => {
        if(isScreenShot && tabs.length) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {event: tab.active ? Cmd.SCREEN_SHOT_START : Cmd.SCREEN_SHOT_STOP })
            })
            record()
        }
    }, TUTOR_SCREENSHOT_INTERVAL)
}

function stopRecord() {
    isScreenShot = false;
    clearTimeout(timer)
}

