import { ENUM_RESUME, ENUM_PLATFORM } from '~constants/index'
import { isLiepinResumePage } from '~utils'
import { ElMessage } from 'element-plus'
class Message {
    private flowInstance
    public listener(flowInstance?: any){
        this.flowInstance = flowInstance
        chrome.runtime.onMessage.addListener(this.messageHandler)
    }

    public remove() {
        chrome.runtime.onMessage.removeListener(this.messageHandler)
    }

    private messageHandler(message: any, sender, sendResponse) {
        console.log('liepin简历消息监听888', message, sender)
        if(message?.type === ENUM_RESUME.PREVIEW && 
            message?.platform === ENUM_PLATFORM.LIEPIN && 
            isLiepinResumePage()
        ) {
            this.flowInstance?.checkResume?.()
        }
    }

    showMessageTip({type = 'success', message}: { type?: any, message: string}) {
        ElMessage({
            message,
            type
          })
    }
}

export default new Message();