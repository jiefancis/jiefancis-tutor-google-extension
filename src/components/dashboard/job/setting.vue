<template>
    <Mask>
        <div class="dashboard-job-running-setting abs-center">
            <div class="dashboard-job-setting-header">
                {{ 
                    step === 1 ? '请选择一个简历筛选方式运行' : '请选择运行平台与设置运行次数'    
                }}
            </div>
            <div v-show="step === 1">
                <div class="dashboard-job-setting-first" >
                    <div @click="() => handleSelectedOne(index)"
                        :class="[
                            'dashboard-job-setting-first-item',
                            activeOneIndex === index ? 'dashboard-job-setting-first-item-active' : ''
                        ]"
                        v-for="(item, index) in conditionOne" :key="index">
                        <div class="dashboard-job-setting-first-item-title">{{  item.title }}</div>
                        <div class="dashboard-job-setting-first-item-desc">{{ item.desc }}</div>
                    </div>
                </div>
                <div class="dashboard-logout-message-bottom margin-top-40" v-show="step === 1">
                    <div class="dashboard-logout-message-bottom-btn" @click="handleCancel">
                        取消
                    </div>
                    <div :class="[
                        'dashboard-logout-message-bottom-btn',
                        activeOneIndex !== -1 ? 'btn-out' : 'btn-disabled'
                    ]"
                        @click="handleNextStep"
                    >
                        下一步
                    </div>
                </div>
            </div>
            <div v-show="step === 2">
                <div class="dashboard-job-setting-second">
                    <div class="dashboard-job-setting-second-platform">
                        <div class="dashboard-job-setting-second-platform-label">运行平台可多选</div>
                        <div :class="[
                                'dashboard-job-setting-second-platform-item',
                                platform[index] ? 'dashboard-job-setting-second-platform-item-active' : ''
                            ]"
                            v-for="(item, index) in conditionTwo" :key="index"
                            @click="() => handleSelectedTwo(item, index)"
                        >
                            <img class="dashboard-job-setting-second-platform-item-img no-border" :src="item.icon"/>
                            <div class="dashboard-job-setting-second-platform-item-name">{{ item.title }}</div>
                            <img class="dashboard-job-setting-second-platform-item-img" :src="SelectedIcon" v-show="platform[index]"/>
                            <div class="dashboard-job-setting-second-platform-item-img" v-show="!platform[index]"></div>
                        </div>
                        <div class="dashboard-job-setting-second-platform-label margin-top-16">设置本次运行次数</div>
                        <div class="dashboard-job-setting-second-count">
                            <div class="dashboard-job-setting-second-count-input">
                                <div class="in-input-text-div">
                                    <input placeholder="运行次数 (1-999)"  ref="input" v-model="runningCount" class="in-input-text"/>
                                </div>
                            </div>
                            <div class="dashboard-job-setting-second-times-btn" @click="handleResetCount">重置</div>
                        </div>
                        <!-- <div class="dashboard-job-setting-second-platform-item" v-for="(item, index) in conditionTwo" :key="index">
                            
                        </div> -->
                    </div>
                    <!-- <div @click="() => handleSelectPlatform(index)"
                        :class="[
                            'dashboard-job-setting-first-item',
                            activeTwoIndex === index ? 'dashboard-job-setting-first-item-active' : ''
                        ]"
                        v-for="(item, index) in conditionTwo" :key="index">
                        <div class="dashboard-job-setting-first-item-title">{{  item.title }}</div>
                        <div class="dashboard-job-setting-first-item-desc">{{ item.desc }}</div>
                    </div> -->
                </div>
                <div class="dashboard-logout-message-bottom" v-show="step === 2">
                    <div class="dashboard-logout-message-bottom-btn" @click="handlePrevStep">
                        上一步
                    </div>
                    <div :class="[
                            'dashboard-logout-message-bottom-btn',
                            runningCount && (platform[0] || platform[1]) ? 'btn-out' : 'btn-disabled'
                        ]"
                        @click="handleRungingJob"
                    >
                        开始筛选
                    </div>
                </div>
            </div>
            
            
        </div>
    </Mask>

</template>

<script setup>
import { ref, defineEmits, onMounted } from 'vue'
import Mask from '~components/mask/index.vue'
import { useGlobalState } from '~store/global'

import { ElInput, ElMessage } from 'element-plus';
import BossIcon from "data-base64:~assets/boss.svg"
import LiepinIcon from "data-base64:~assets/liepin.svg"
import SelectedIcon from "data-base64:~assets/selected.svg"
import { Cmd, ResponseMessage } from '~background/MessageModel';
import { set } from 'vue-demi';

const emits = defineEmits(['showSettingModal'])

const { currentTaskId, setIsTaskRunning } = useGlobalState()

const conditionOne = ref([
    {
        title: '筛选系统推荐候选人',
        desc: '自动筛选平台推荐的候选人，并自动收藏达标简历',
        type: 2
    },
    {
        title: '筛选并回复已打招呼候选人',
        desc: '自动筛选跟我打招呼的候选人，自动回复达标候选人并收藏其简历',
        type: 3
    },
])
const conditionTwo = ref([
    {
        title: 'boss',
        type: 1,
        icon: BossIcon,
    },
    {
        title: '猎聘',
        type: 2,
        icon: LiepinIcon,
    },
])

const detailInfo = ref(null)
const runningCount = ref('')
const activeOneIndex = ref(-1)
const activeTwoIndex = ref(-1)
const step = ref(1)
const platform = ref([false, false])


onMounted(async () => {
    await queryTaskDetail()
})

const handleSelectedOne = (index) => {
    activeOneIndex.value = index
}
const handleSelectedTwo = (item, index) => {
    platform.value[index] = !platform.value[index]
    
}
const handleSelectPlatform = (index) => {
    activeTwoIndex.value = index
}

const handleNextStep = () => {
    step.value = 2
}
const handlePrevStep = () => {
    step.value = 1
}

const handleCancel = () => {
    setIsTaskRunning(false)
    emits('showSettingModal', false)
}

const handleRungingJob = async () => {
    console.log('runningCount.value', runningCount.value, platform.value.every(val => !val))
    if(!runningCount.value) {
        ElMessage({ type: 'error', message: '请输入运行次数！'})
        return
    }
    if(!runningCount.value > 999) {
        ElMessage({ type: 'error', message: '最多运行999次'})
        return
    }
    if(platform.value.every(val => !val)) {
        ElMessage({ type: 'error', message: '请选择要运行的平台'})
        return
    }
    
    detailInfo.value.resumeFilterMethod = conditionOne.value[activeOneIndex.value].type
    detailInfo.value.runTimes = runningCount.value
    console.log('开始运行1', detailInfo.value)
    const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_SAVE, detailInfo.value))
    console.log('开始运行', res)
    if(res) {
        setIsTaskRunning(true)
        if(platform.value[1]) {
            await chrome.runtime.sendMessage(new ResponseMessage(Cmd.CREATE_lIEPIN_WINDOW, {...detailInfo.value, liepin: true}))
        }
        emits('showSettingModal', false)
    }
    

}

const handleResetCount = () => {
    runningCount.value = ''
}

const queryTaskDetail = async () => {
    const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_DETAIL, { id: currentTaskId?.value }))
    console.log(currentTaskId?.value, '查询任务详情', res)
    if(res?.id) {
        detailInfo.value = res
        if(res?.runTimes) {
            runningCount.value = res?.runTimes
        }
        if(res?.resumeFilterMethod) {
            activeOneIndex.value = conditionOne.value.findIndex(item => item.type === res?.resumeFilterMethod)
        }
    }
}

</script>