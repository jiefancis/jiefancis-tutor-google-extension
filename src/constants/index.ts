export * from '~constants/enum'

export * from '~constants/xpath'

export * from '~constants/api'

export const RECOMMENT_USER_LIMIT = 20; // 猎聘网下最多查看30个牛人简历

export const STORE_IS_LOGIN_KEY = 'tshiring:user:login'

export const STORE_USER_INFO_KEY = 'tshiring:store:userinfo'

export const STORE_RESUME_FLOW_FINISH_KEY = 'liepin:resume:finished';

export const STORE_LIEPIN_CHAT_FLOW_RUNING = 'liepin:chat:runing'; // 猎聘流程进行中

export const STORE_LIEPIN_CURRENT_CONVERSACTIONID = 'liepin:chat:current:conversactionId'; // 当前正在沟通的聊天对话id

export const SINGLE_RECOMMEND_SCROLL_HIGHT = 164; // 猎聘推荐牛人列表

export const SINGLE_CHAT_SCROLL_HIGHT = 62; // 猎聘沟通列表滚动高度

export const BACKGROUND_MESSAGE_EVENT_LIEPIN = 'START_LIEPIN_FLOW';

export const GLOBAL_UPDATE_MESSAGE_KEY = 'updateMessage';

export const TUTOR_TOKEN_UUID = 'tutor::token::uuid' 

export const TUTOR_ROLE_USER = 'user'
export const TUTOR_ROLE_TUTOR = 'tutor'
export const TUTOR_ROLE_TIP = 'tutor:reply:pending'
export const TUTOR_SCREENSHOT_INTERVAL = 3000

export const TUTOR_DEFAULT_WIN_RESIZE = { width: 400, height: 700 }
export const TUTOR_MEDIUM_WIN_RESIZE = { width: 1300, height: 700 }
export const TUTOR_MAX_WIN_RESIZE = { width: 1900, height: 920 }