import {STORE_RESUME_FLOW_FINISH_KEY} from '~constants/index'
import {TaskInfo} from "~background/api/Model";
import {Cmd, ResponseMessage} from "~background/MessageModel";

const JOB_INFO_KEY = 'agent.jobInfo';

export const getJobInfo = () => {
    return JSON.parse(localStorage.getItem(JOB_INFO_KEY));
}

export const setJobInfo = (jobInfo: any) => {
    localStorage.setItem(JOB_INFO_KEY, JSON.stringify(jobInfo))
}
export const getTaskInfoByServer = async (): Promise<TaskInfo> => {
    const page = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_LIST, {current: 1}));
    return await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_DETAIL, page.records.length > 0 ? {id: page.records[0].id} : null));
}

export const setJobInfoToServer = async (taskInfo: TaskInfo) => {
    chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_SAVE, taskInfo));
}


// export const LPResumeFlowStatusInfo = {
//     setStore: (key, value) => {
//         localStorage.setItem(STORE_RESUME_FLOW_FINISH_KEY, JSON.stringify(isFinish))
//     }
// }

export const getLiepinResumeFlowStatus = () => {
    const status = localStorage.getItem(STORE_RESUME_FLOW_FINISH_KEY)
    return status ? JSON.parse(status) : false
}

export const setLiepinResumeFlowStatus = (isFinish: boolean) => {
    localStorage.setItem(STORE_RESUME_FLOW_FINISH_KEY, JSON.stringify(isFinish))
}

export const removeLiepinResumeFlowStatus = () => {
    localStorage.removeItem(STORE_RESUME_FLOW_FINISH_KEY)
}
