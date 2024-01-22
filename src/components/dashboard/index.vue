<template>
    <div :class="[
        'dashboard-layout',
        isOpenLibrary ? 'dashboard-layout-open' : ''
    ]">
        <img class="dashboard-container-header-close" :src="CloseIcon" @click="handleChangeWindowShow"/>
        <Chat v-if="isShowChat"/>
        <Home v-else/>
        <Library v-if="isOpenLibrary"/>
        <!-- <Gallery v-show="isShowGallery"/> -->
    </div>

</template>

<script>
import { defineComponent, reactive, ref, watch, nextTick, provide } from 'vue'
import Job from '~components/dashboard/job/index.vue'
import Recod from '~components/dashboard/record/index.vue'
import Login from '~components/dashboard/login/index.vue'
import Message from '~components/message/index.vue'
import Chat from '~components/dashboard/chat/index.vue'
import Home from '~components/dashboard/home/index.vue'
import Library from '~components/dashboard/library/index.vue'
// import Gallery from '~components/dashboard/gallery/index.vue'

import { STORE_IS_LOGIN_KEY, GLOBAL_UPDATE_MESSAGE_KEY, TUTOR_SCREENSHOT_INTERVAL } from '~constants/index'
import { storageWatch } from '~utils/index'
import { useGlobalState } from '~store/global'
import html2canvas from 'html2canvas'
import {fileApi} from "~background/api/FileApi";
import MessageListener from '~utils/messageListener'
import { EventEnum } from '~constants/event';
import {Cmd, ResponseMessage} from "~background/MessageModel";

import logo from "data-base64:~assets/icon.png"
import TSHiring from "data-base64:~assets/TSHiring.png"
import JobIcon from "data-base64:~assets/job.png"
import LogIcon from "data-base64:~assets/log.png"
import MineIcon from "data-base64:~assets/mine.png"
import Logout from '~components/dashboard/logout/index.vue'
import Setting from '~components/dashboard/job/setting.vue'
import CloseIcon from "data-base64:~assets/close-icon.svg"

export default defineComponent({
    name: 'Dashboard',
    components: {
        Job,
        Logout,
        Setting,
        Recod,
        Login,
        Message,
        Chat,
        Home,
        Library
    },
    props: {
        changeWindowShow: {
            type: Function
        }
    },
    setup(props) {
        // const storeIsLogin = JSON.parse(localStorage.getItem(STORE_IS_LOGIN_KEY) || 'false');
        // const isLogined = ref(storeIsLogin)
        const timer = ref(null)
        const {isOpenLibrary, isScreenShot, setIsScreenShot ,recordTime, isShowChat, isShowGallery  } = useGlobalState()
       

        watch(isOpenLibrary, (newVal) => {
            if(newVal) {
                chrome.runtime.sendMessage({
                    cmd: Cmd.UPDATE_WIN,
                    data: { type: 'medium' }
                })
            } else {
                chrome.runtime.sendMessage({
                    cmd: Cmd.UPDATE_WIN,
                    data: { type: 'default' }
                })
            }
            
        })

        const handleChangeWindowShow = () => {
            // setShowWindow(false)
            props?.changeWindowShow?.()
            chrome.runtime.sendMessage({ cmd: Cmd.TUTOR_WIN_CLOSE })
        }

        const handleScreenShot = () => {
            html2canvas(document.body).then(async (canvas) => {
                const base64 = canvas.toDataURL('image/png')
                const filename = Date.now() + '.png'
                const res = await chrome.runtime.sendMessage({
                    cmd: Cmd.SCREEN_SHOT_UPLOAD, 
                    data: {filename, base64},
                    url: location.href,
                    title: document.title
                })
                // const res = await fileApi.uploadFile()
                console.log('截图base64', res)
            });
        }
        // const screenShotInterval = () => {
        //     timer.value = setTimeout(() => {
        //         if(isScreenShot.value) {
        //             handleScreenShot()
        //             screenShotInterval()
        //         }
        //     }, TUTOR_SCREENSHOT_INTERVAL)
        // }
    
        watch(isScreenShot, (newVal) => {
            if(newVal) {
                chrome.runtime.sendMessage({cmd: Cmd.SCREEN_SHOT_START })
            } else {
                // clearTimeout(timer.value)
                chrome.runtime.sendMessage({cmd: Cmd.SCREEN_SHOT_STOP })
            }
        })
        // const handleShot = (message, sender, sendResponse) => {
        //     if(message.isScreenShot) {
        //         screenShotInterval()
        //     } else {
                
        //     }
        // }
        
        const messageListener = new MessageListener()
        // messageListener.on(EventEnum.screen_shot, handleShot)
        messageListener.on(Cmd.SCREEN_SHOT_START, handleScreenShot)
        messageListener.on(Cmd.SCREEN_SHOT_STOP, () => setIsScreenShot(false))
        chrome.runtime.onMessage.addListener(messageListener.listener())



        return {
            handleChangeWindowShow,

            isOpenLibrary,
            isShowChat,
            isShowGallery,

            logo,
            TSHiring,
            JobIcon,
            LogIcon,
            MineIcon,
            CloseIcon,
        }
    }
})
</script>