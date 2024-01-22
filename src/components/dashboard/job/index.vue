<template>
    <div class="dashboard-job">
        <div class="dashboard-job-container" v-show="jobList?.length">
            <div class="dashboard-job-container-list">
                <div 
                    v-for="(job, index) in jobList"
                    :class="[
                        'dashboard-job-container-item',
                        isRunning(index) ? 'dashboard-job-container-item-active' : ''
                    ]"
                >
                    <div class="job-item-icon">
                        <img :class="[isRunning(index) ? 'job-item-icon-loading' : '']" :src="isRunning(index) ? LoadingIcon : JobIcon" />
                    </div>
                    
                    <div class="job-item-right">
                        <div class="job-item-title">{{ job.jobTitle }}</div>
                        <div class="job-item-desc desc">{{ isRunning(index) ? '正在运行中...' : '点击运行筛选任务' }}</div>
                    </div>
                    <div class="operate-list">
                        <div class="operate-item">
                            <img class="operate-item-icon" :src="CloseRunningIcon" v-show="isRunning(index)" @click="() => handleSettingClose(index)"/>
                            <img class="operate-item-icon" :src="SettingIcon"  v-show="!isRunning(index)" @click="() => handleSetting(index)"/>
                        </div>
                        <div class="operate-item" @click="() => toggleJob(index, job?.id)">
                            <img class="operate-item-icon" :src="isRunning(index) ? StopIcon : StartIcon" />
                        </div>
                    </div>
                    <Setting 
                        ref="settingRef"
                        :id="job?.id"
                        v-show="settingIdx === index"
                        @changeWindowShow="() => changeWindowShow(job.id)"
                        @handleDeleteJob="() => handleDeleteJobSetting(job?.id)"/>
                </div>
            </div>
        </div>
        <Empty v-show="!jobList.length" />

        <Mask v-show="isShowCloseModal">
            <div class="dashboard-logout-message">
                <div class="dashboard-logout-message-header">
                    <div class="dashboard-logout-message-header-title">结束简历筛选</div>
                    <div class="dashboard-logout-message-header-desc">您有正在运行的任务，结束筛选会终止本次简历筛选</div>
                </div>
                <div class="dashboard-logout-message-bottom">
                    <div class="dashboard-logout-message-bottom-btn" @click="handleCancel">
                        取消
                    </div>
                    <div class="dashboard-logout-message-bottom-btn btn-out" @click="handleCloseJob">
                        结束
                    </div>
                </div>
            </div>
        </Mask>

        <Mask v-show="isShowDeleteModal">
            <div class="dashboard-logout-message">
                <div class="dashboard-logout-message-header">
                    <div class="dashboard-logout-message-header-title">删除此招聘任务</div>
                    <div class="dashboard-logout-message-header-desc">该任务删除后不可恢复，但不影响已运行过的日志</div>
                </div>
                <div class="dashboard-logout-message-bottom">
                    <div class="dashboard-logout-message-bottom-btn" @click="() => setIsShowDeleteModal(false)">
                        取消
                    </div>
                    <div class="dashboard-logout-message-bottom-btn btn-out" @click="handleDeleteJob">
                        删除
                    </div>
                </div>
            </div>
        </Mask>

        <div class="dashboard-job-create" @click="handleCreateJob">
            <img class="dashboard-job-create-icon" :src="CreateJobIcon" />
            <div class="dashboard-job-create-text" >新建任务</div>
        </div>
    </div>
    <FloatingWindow
        :jobId="currentId"
        :isShowWindow="isShowWindow"
        v-show="isShowWindow" 
        :changeWindowShow="changeWindowShow" 
        @refreshTaskList="fetchTaskList"
    />
    <div class="move-box-mask" v-show="isShowWindow"></div>
</template>

<script setup>
import FloatingWindow from '~components/dashboard/FloatingWindow.vue';
import Setting from '~components/dashboard/setting/index.vue';
import Mask from '~components/mask/index.vue'
import Empty from '~components/dashboard/empty/index.vue'
import { post as postApi } from '~components/fetch'
import { API_CODE_ENUM } from '~constants/index';
import {Cmd, ResponseMessage} from "~background/MessageModel";
import { useGlobalState } from '~store/global'

import { defineComponent, defineProps, defineEmits, ref, computed, watch } from 'vue';
import StartIcon from "data-base64:~assets/start.svg"
import StopIcon from "data-base64:~assets/stop.svg"
import LoadingIcon from "data-base64:~assets/loading.png"
import SettingIcon from "data-base64:~assets/setting.svg"
import CloseRunningIcon from "data-base64:~assets/close-running.svg"
import JobIcon from "data-base64:~assets/job-icon.svg"
import CreateJobIcon from "data-base64:~assets/create-job.svg"
import CloseIcon from "data-base64:~assets/close-icon.svg"
import { onClickOutside } from '@vueuse/core'
import { ElMessage } from 'element-plus';

const props = defineProps({
    changeWindowShow: {
        type: Function
    }
})

const emit = defineEmits(['showSettingModal'])

const { setCurrentTaskId, isTaskRunning, setIsTaskRunning, isLogined, setMessage } = useGlobalState()

const currentId = ref('')
const jobList = ref([])
const activeIndex = ref(-1)
const settingIdx  = ref(-1)
const isShowWindow = ref(false)
const isShowCloseModal = ref(false)
const isShowDeleteModal = ref(false)
const running = ref(false)
const settingRef = ref()
onClickOutside(settingRef, () => {
    settingIdx.value = -1
})
// ====================== computed ======================

const isRunning = computed(() => {
    return (idx) => {
        return activeIndex.value === idx
    }
})

// ====================== watch ======================
watch(isTaskRunning, (bool) => {
    
    if(!bool) {
        activeIndex.value = -1;
    }
})

watch(isLogined, (bool) => {
    if(bool) {
        fetchTaskList()
    } 
    // else {
    //     activeIndex.value = -1;
    // }
})


// ====================== methods ======================

const setIsShowDeleteModal = (bool) => {
    isShowDeleteModal.value = bool
}
const setCurrentId = (val) => {
    currentId.value = val
    setCurrentTaskId(val)
}

const handleDeleteJobSetting = (id) => {
    setCurrentId(id)
    setIsShowDeleteModal(true)
}
const handleDeleteJob = async () => {
    const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_DELETE, { id: currentId.value }))
    if(res === true) {
        await fetchTaskList()
        setIsShowDeleteModal(false)
    }
}

const toggleJob = (idx, id) => {
    console.log('idx:::', idx)
    if(activeIndex.value === idx) {
        activeIndex.value = -1
        setCurrentId(-1)
    } else {
        if(jobList.value.some((_, index) => isRunning.value?.(index))) {
            setMessage({ type: 'warning', message: '目前还有其它任务在运行中，请先关闭再运行任务！'})
            return
        }
        activeIndex.value = idx
        setCurrentId(id)
        setIsTaskRunning(true)
        emit('showSettingModal', true)
    }
    settingIdx.value = -1
}

const handleCreateJob = () => {
    setCurrentId(-1)
    isShowWindow.value = true
}
const changeWindowShow = (boolOrId = false) => {
    isShowWindow.value = !!boolOrId
    if(typeof boolOrId === 'string') {
        setCurrentId(boolOrId)
    }
    
}

const handleSettingClose = (idx) => {
    isShowCloseModal.value = true
}
const handleSetting = (idx) => {
    if(settingIdx.value === idx) {
        settingIdx.value = -1
    } else {
        settingIdx.value = idx
    }
}

const handleCloseDashboard = () => {
    props?.changeWindowShow?.()
}

const handleCancel = () => {
    isShowCloseModal.value = false
}
const handleCloseJob = () => {
    setIsTaskRunning(false)
    isShowCloseModal.value = false
}

async function fetchTaskList () {
    const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_LIST, { current: 1 }))
    
    if(res?.records) {
        jobList.value = res?.records
    }
    console.log('刷新列表', res)
}
fetchTaskList()



</script>