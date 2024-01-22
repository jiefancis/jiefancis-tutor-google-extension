export class Cmd {
    static GPT_GET_BOSS_REPLY_MESSAGE = "getBossReplyMessage";
    static GPT_CHECK_RESUME = "checkResume";
    static DOM_CLICK = "domClick";
    static CLOSE_CURRENT_TAB = 'closeCurrentTab';
    static GPT_SHORTEN_SENTENCE = 'gptShortenSentence';
    static SERVER_SEND_VERIFY_CODE = 'serverSendVerifyCode';
    static SERVER_LOGIN = 'serverLogin';
    static SERVER_TASK_SAVE = 'serverTaskSave';
    static SERVER_TASK_LIST = 'serverTaskList';
    static SERVER_TASK_DETAIL = 'serverTaskDetail';
    static SERVER_SHORTEN_SENTENCE = 'serverShortenSentence';
    static SERVER_GET_BOSS_REPLY_MESSAGE = 'serverGetBossReplyMessage';
    static SERVER_CHECK_RESUME = 'serverCheckResume';
    static SERVER_RESUME_SAVE = 'serverResumeSave';
    static SERVER_FILE_UPLOAD = 'serverFileUpload';
    static SERVER_ADD_HIRING_MESSAGE = 'serverAddHiringMessage';
    static SERVER_GET_HIRING_MESSAGES = 'serverGetHiringMessages';
    static SERVER_RESUME_UPDATE_STATUS = 'serverResumeUpdateStatus';
    static SERVER_RESUME_UPDATE_CONTACT = 'serverResumeUpdateContact';
    static SERVER_RESUME_GET_STATUS = 'serverResumeGetStatus';
    static SERVER_TASK_DELETE = 'serverTaskDelete';
    static SERVER_GET_JOB_LABELS = 'serverJobLables';
    static SERVER_GET_RECORD_LIST = 'serverGetRecordList';

    static SERVER_GET_USERINFO = 'serverGetUserInfo';
    static SERVER_SAVE_USERINFO = 'serverSaveUserInfo';

    static CREATE_lIEPIN_WINDOW = 'createLPWindow';
    static LIEPIN_CHAT_FLOW_START = 'lpChatFlowStart';
    static UPDATE_STORAGE_USERINFO = 'updateStorageUserInfo';
    static GET_STORAGE_USERINFO = 'getStorageUserInfo';
    static GET_TUTOR_TOKEN_UUID = 'tutor:token:uuid';

    static UPDATE_WIN = 'background--update-win';
    static SCREEN_SHOT_START = 'background--screen-shot-start';
    static SCREEN_SHOT_STOP = 'background--screen-shot-stop';
    static OPEN_POPUP = 'background--open-popup';
    static SCREEN_SHOT_UPLOAD = 'background--screen-shot-upload';
    static TUTOR_WIN_CLOSE = 'background--tutor-win-close';
}

export class ResponseMessage {

    public cmd: string;
    public data: any;

    constructor(cmd: string, data: any) {
        this.cmd = cmd;
        this.data = data;
    }

}
