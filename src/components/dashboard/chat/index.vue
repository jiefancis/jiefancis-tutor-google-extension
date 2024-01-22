<template>
    <div class="dashboard-chat">
        <div class="dashboard-chat-header flex">
            <img class="dashboard-chat-header-icon" 
                :src="isOpenLibrary ? TukuOpenIcon : TukuIcon"
                @click="handleOpenLibrary"
            />
            <div class="dashboard-chat-header-record flex flex-default abs-center" v-show="isScreenShot">
                <div class="dashboard-chat-header-record-left">
                    <div class="dashboard-chat-header-record-left-time">
                        {{ recordTimeFormat }}
                    </div>
                    <div class="dashboard-chat-header-record-left-ing">记录中</div>
                </div>
                <img class="dashboard-chat-header-icon" :src="CloseRecordIcon" @click="handleStopRecord">
            </div>
            <div class="dashboard-chat-header-record-other flex flex-default abs-center" v-show="!isScreenShot">
                <img class="dashboard-chat-header-logo" :src="Logo">
                <img class="dashboard-chat-header-ts-icon" :src="TutorIcon">
            </div>
            <div class="dashboard-chat-header-operate">
                <img class="dashboard-chat-header-icon mr-12" :src="SettingIcon" @click="handleSetting"/>
                <img class="dashboard-chat-header-icon" style="opacity: 0;" :src="CloseIcon"/>
                <Setting v-show="visibleSettingModal" @callback="() => visibleSettingModal = false"/>
            </div>
        </div>
        <div class="dashboard-chat-container-wrap" ref="chatContainerRef" @scroll="handleLoadingMore">
            <div class="dashboard-chat-container" v-show="!isClearChat"> <!--v-show="messages.length" -->
                <!-- <div class="dashboard-chat-container-time dashboard-chat-message-tip">昨天 11:12</div> -->
                <!-- <div class="dashboard-chat-container-time dashboard-chat-message-tip" v-show="showLoadingMore">正在加载中...</div> -->
                <!-- <Problem v-model:choose="problem" @choose="handleInputFocus"/> -->
                <div class="dashboard-chat-container-message" v-for="(message, index) in messages" :key="index">
                    <div v-show="message.role === TUTOR_ROLE_USER"
                        class="dashboard-chat-container-message-item fr dashboard-chat-container-message-item-self">
                        {{ message.message }}
                    </div>
                    <div v-show="message.role === TUTOR_ROLE_TUTOR"
                        class="dashboard-chat-container-message-item fl dashboard-chat-container-message-item-reply">
                        {{ message.message }}
                    </div>
                    
                    <div v-show="message.role === TUTOR_ROLE_TIP"
                        class="dashboard-chat-container-message-item fl dashboard-chat-container-message-item-loading">
                        处理中...
                    </div>
                </div>
                <Problem v-model:choose="problem" v-show="!messages.length" @choose="handleInputFocus"/>
            </div>
            <img class="dashboard-chat-scrollToBottom" :src="bottomIcon" v-show="isShowScrollToBottom" @click="handleScrollToBottom"/>
            <Empty v-show="isClearChat">
                <template #title>没有相关记录</template>
                <template #subTitle>快向小虾进行提问吧</template>
            </Empty>
        </div>
        <div class="dashboard-chat-footer">
            <el-input
                ref="inputRef"
                v-model="problemText"
                @keypress="handleSend"
                :autosize="{ minRows: 1, maxRows: 5 }"
                resize='none'
                type="textarea"
                placeholder="提问关于你的学习，或在电脑中所看到的"
                :disabled="enablePrompt"
            />
        </div>
    </div>
    <Toast v-show="isShowToast" @cancel="handleToastCancel" @confirm="handleToastConfirm">
        <template #title>确定后将清空所有对话记录</template>
        <template #subTitle>清空后不可恢复</template>
        <template #confirm>确定清空</template>
    </Toast>
</template>

<script setup>
import { ref, watch, computed, nextTick, render } from 'vue'
import { ElInput } from 'element-plus'
import Problem from '~components/dashboard/problems/index.vue'
import Setting from '~components/dashboard/setting/index.vue'
import Toast from '~components/dashboard/toast/index.vue'
import Empty from '~components/dashboard/empty/index.vue'

import { useGlobalState } from '~store/global';
import { Cmd } from "~background/MessageModel";
import { TUTOR_ROLE_USER, TUTOR_ROLE_TUTOR, TUTOR_ROLE_TIP } from '~constants/index'
import { sleep, timerFn } from '~utils'
import * as _ from 'lodash-es'
import { useTimeoutPoll } from '@vueuse/core'
import { get, post, del as delApi, postStream } from '~components/fetch'

import TukuIcon from 'data-base64:~assets/icon-tuku.svg'
import TukuOpenIcon from 'data-base64:~assets/icon-tuku-open.svg'
import SettingIcon from 'data-base64:~assets/icon-settings.png'
import CloseIcon from "data-base64:~assets/close-icon.svg"
import CloseRecordIcon from "data-base64:~assets/close-recording.svg"
import Logo from 'data-base64:~assets/logo.svg'
import TutorIcon from "data-base64:~assets/ts-tutor.svg"
import bottomIcon from 'data-base64:~assets/toggle.svg';

const {
    isShowChat,
    isOpenLibrary,
    setIsOpenLibrary,
    isScreenShot,
    setIsScreenShot,
    isShowToast,
    setIsShowToast,
    isClearChat,
    setIsClearChat,
    recordTimeFormat,
    setMessage,
} = useGlobalState()

const chatContainerRef = ref()
const inputRef = ref()
const problem = ref(null)
const problemText = ref('')
const timer = ref(0)
const isShowScrollToBottom = ref(false)
const pageNum = ref(1)
const showLoadingMore = ref(false)
const messages = ref([])
const visibleSettingModal = ref(false)
const enablePrompt = ref(false)
const { isActive, pause, resume } = useTimeoutPoll(() => {
    timer.value += 1
}, 1000)

// const timerStr = computed(() => timerFn(timer.value))

const chatScrollBottom = () => {
    chatContainerRef.value?.scrollBy?.(0, 1000)
}
const scrollIntoView = (elm) => {
    elm?.scrollIntoView?.(true)
}

const queryFirstMessagesElm = (len = 0) => {
    return document.querySelectorAll('.dashboard-chat-container-message')[len]
}

const queryMessageList = async (pageNo = 1, pageSize = 10) => {
    showLoadingMore.value = !(pageNo === 1)
    const res = await get(`/tutor/v1/messages?pageNo=${pageNo}&pageSize=${pageSize}&sort=id,asc`)
    if(res.code === 0) {
        if(pageNum.value !== 1 && (pageNum.value === res.data.pageNo || res.data?.records?.length === 0)) {
            showLoadingMore.value = false
            setMessage({ type: 'warning', message: '无更多消息'})
            return
        }
        // if((pageNum.value !== 1 && pageNum.value === res.data.pageNo) || res.data?.records?.length === 0) {
        //     showLoadingMore.value = false
        //     setMessage({ type: 'warning', message: '无更多消息'})
        //     return
        // }
        pageNum.value = res.data.pageNo
        
        if(pageNo === 1) {
            messages.value = res.data.records;
        } else {
            scrollIntoView(queryFirstMessagesElm())
            messages.value = [...res.data.records, ...messages.value]
            nextTick(() => {
                scrollIntoView(queryFirstMessagesElm(res.data.records?.length))
            })
        }
    }
    await sleep(300)
    if(pageNo === 1) {
        chatScrollBottom()
    } else {
        showLoadingMore.value = false
    }
    
}

const handleMessages = (content) => {
    let len = messages.value.length - 1;
    if(messages.value[len].role === TUTOR_ROLE_TIP) {
        messages.value[len].role = TUTOR_ROLE_TUTOR
    }
    messages.value[len].message = content
    chatScrollBottom()
    
}
const reader = (response, content) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fileContent = '';

    function processStreamResult(result) {
        try {
            const chunk = decoder.decode(result.value);
            buffer += chunk.split('event:message').filter(msg => !!msg).join('')
            console.log(chunk, 'chunk--buffer', buffer)
            const lines = buffer.split('\n');
            buffer = lines.pop();

            lines.forEach(line => {
                if (line.trim().length > 0) {
                    const jsonData = line.split('data:')[1]
                    const eventData = JSON.parse(jsonData);
                    fileContent += eventData.message;
                    handleMessages(fileContent)
                }
            });

            if (!result.done) {
                return reader.read().then(processStreamResult);
            } else {
                enablePrompt.value = true
                console.log('result.done', result.done)
            }
        } catch(err) {
            enablePrompt.value = true
        }
        
    }

    return reader.read().then(processStreamResult);
}
const prompt = async () => {
    const prompt = problemText.value
    resetProbelm()
    enablePrompt.value = false
    const res = await postStream('/tutor/v1/prompt', { prompt })
    reader(res)
    
}

watch(problem, (newVal) => {
    if(newVal) {
        problemText.value = newVal
    } 
    // else {
    //     inputRef.value.blur()
    // }
})

watch(isShowChat, (newVal) => {
    if(newVal) {
        queryMessageList()
    }
}, { immediate: true})

watch(isScreenShot, (newVal) => {
    console.log('是否开启屏幕记录?', newVal)
    if(newVal) {
        console.log('是否开启屏幕记录?--开始计时', newVal)
        resume()
    } else {
        console.log('是否开启屏幕记录?--暂停结束计时', newVal)
        pause()
        timer.value = 0;
    }
}, { immediate: true})

const handleOpenLibrary = () => {
    setIsOpenLibrary(!isOpenLibrary.value)
}

const resetProbelm = () => {
    problem.value = ''
    problemText.value = ''
}

const handleInputFocus = () => {
    inputRef.value.focus()
}
const handleSend = async (e) => {
    if(e.which === 13) {
        setIsClearChat(false)
        e.preventDefault()
        messages.value.push({
            role: "user",
            message: problemText.value ,
            createTime: Date.now()
        }, {
            role: TUTOR_ROLE_TIP,
            message: '',
            createTime: Date.now()
        })
        nextTick(() => {
            inputRef.value.blur()
            chatScrollBottom()
        })
        await prompt()
    }
}

const handleSetting = () => {
    visibleSettingModal.value = !visibleSettingModal.value
}

const handleToastCancel = () => {
    setIsShowToast(false)
}
const handleToastConfirm = async () => {
    
    const res = await delApi('/tutor/v1/messages')
    console.log('确定删除记录', res)
    if(res.code === 0) {
        setIsClearChat(true)
        setIsShowToast(false)
        messages.value = []
    }
}

const handleStopRecord = () => {
    setIsScreenShot(false)
}

const handleScrollToBottom = () => {
    scrollIntoView(queryFirstMessagesElm(messages.value.length - 1))
    isShowScrollToBottom.value = false
}
const handleLoadingMore = _.throttle(async (e, ...args) => {
    const scrollTop = chatContainerRef.value?.scrollTop;
    const scrollHeight = chatContainerRef.value?.scrollHeight;
    if(scrollTop <= 0) {
        queryMessageList(pageNum.value + 1)
    }
    // const wrapElm = chatContainerRef.value;
    isShowScrollToBottom.value = (scrollHeight - scrollTop) > 550
}, 300)

</script>
<!-- <script>
import { defineComponent } from 'vue'
import Problem from '~components/dashboard/problems/index.vue'
import TukuIcon from 'data-base64:~assets/icon-tuku.svg'
import SettingIcon from 'data-base64:~assets/icon-settings.png'
import CloseIcon from "data-base64:~assets/close-icon.svg"
import CloseRecordIcon from "data-base64:~assets/close-recording.svg"

export default defineComponent({
    components: {
        Problem
    },
    setup() {
        
        return {
            TukuIcon,
            SettingIcon,
            CloseIcon,
            CloseRecordIcon
        }
    }
})
</script> -->

<style>

.dashboard-chat .el-textarea__inner {
    background: #3a3a3c !important;
    font-size: 13px;
    height: 100px;
    resize: none !important;
    color: #fff !important;
}
.dashboard-chat .el-textarea__inner::placeholder{
    color: rgba(235, 235, 245, 0.30) !important;
    font-size: 13px;
}
.dashboard-chat .el-textarea__inner:focus,
.dashboard-chat .el-textarea__inner,
.dashboard-chat .el-textarea__inner:hover{
    box-shadow: none !important;
}

.dashboard-chat-container-wrap::-webkit-scrollbar{
    display: block;
    width: 3px;
    height: 3px;
    background: #000;
}
.dashboard-chat-container-wrap::-webkit-scrollbar-thumb {
    display: block;
    width: 3px;
    height: 3px;
    background: #aaa;
}

.dashboard-chat-scrollToBottom{
    position: absolute;
    bottom: 80px;
    right: 20px;
    width: 30px;
    height: 30px;
    background: #3a3a3c;
    border-radius: 50%;
    text-align: center;
    line-height: 30px;
    transform: rotate(90deg);
    cursor: pointer;
}
</style>