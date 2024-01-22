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
                        <img :src="isRunning(index) ? LoadingIcon : JobIcon" />
                    </div>
                    
                    <div class="job-item-right">
                        <div class="job-item-title">{{ job.title }}</div>
                        <div class="job-item-desc desc">{{ isRunning(index) ? '正在运行中...' : job.desc }}</div>
                    </div>
                    <div class="operate-list">
                        <div class="operate-item">
                            <img class="operate-item-icon" :src="CloseRunningIcon" v-show="isRunning(index)" @click="() => handleSettingClose(index)"/>
                            <img class="operate-item-icon" :src="SettingIcon"  v-show="!isRunning(index)" @click="() => handleSetting(index)"/>
                        </div>
                        <div class="operate-item" @click="() => toggleJob(index)">
                            <img class="operate-item-icon" :src="isRunning(index) ? StopIcon : StartIcon" />
                        </div>
                    </div>
                    <Setting 
                        ref="settingRef"
                        v-show="settingIdx === index"
                        @changeWindowShow="changeWindowShow"
                        @handleDeleteJob="() => setIsShowDeleteModal(true)"/>
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
    <FloatingWindow v-show="isShowWindow" :changeWindowShow="changeWindowShow"/>
    <div class="move-box-mask" v-show="isShowWindow"></div>
</template>

<script>
import FloatingWindow from '~components/dashboard/FloatingWindow.vue';
import Setting from '~components/dashboard/setting/index.vue';
import Mask from '~components/mask/index.vue'
import Empty from '~components/dashboard/empty/index.vue'
import { post as postApi } from '~components/fetch'
import { API_CODE_ENUM } from '~constants/index';

import { defineComponent, ref, computed } from 'vue';
import StartIcon from "data-base64:~assets/start.svg"
import StopIcon from "data-base64:~assets/stop.svg"
import LoadingIcon from "data-base64:~assets/loading.svg"
import SettingIcon from "data-base64:~assets/setting.svg"
import CloseRunningIcon from "data-base64:~assets/close-running.svg"
import JobIcon from "data-base64:~assets/job-icon.svg"
import CreateJobIcon from "data-base64:~assets/create-job.svg"
import CloseIcon from "data-base64:~assets/close-icon.svg"
import { onClickOutside } from '@vueuse/core'
import { ElMessage } from 'element-plus';

export default defineComponent({
    components: {FloatingWindow, Setting, Mask, Empty},
    props: {
        changeWindowShow: {
            type: Function
        }
    },
    setup(props, { emit }) {
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
        // ====================== methods ======================

        const queryTaskList = async () => {
            try{
                const res = await postApi('/task/list', { current: 1 })
                if(res.code === API_CODE_ENUM.OK) {
                    jobList.value = res?.data?.records
                } else {
                    ElMessage.error(res.msg)
                }
            } catch(error) {
                ElMessage.error(error.msg)
            }
        }
        // queryTaskList()

        const setIsShowDeleteModal = (bool) => {
            isShowDeleteModal.value = bool
        }
        const handleDeleteJob = () => {
            setIsShowDeleteModal(false)
        }
        const toggleJob = (idx) => {
            console.log('idx:::', idx)

            if(activeIndex.value === idx) {
                activeIndex.value = -1
            } else {
                activeIndex.value = idx
                emit('showSettingModal', true)
            }
            settingIdx.value = -1
            // const jobInfo = jobList[idx];
            
            // if(jobInfo.status === 0) {
            //     jobList.forEach(job => job.status = 0)
            //     jobInfo.status = 1
            // } else {

            // }
        }

        const handleCreateJob = () => {
            isShowWindow.value = true
        }
        const changeWindowShow = (bool = false) => {
            isShowWindow.value = bool
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
            isShowCloseModal.value = true
        }

        return {
            jobList,
            activeIndex,
            toggleJob,
            handleSetting,
            handleSettingClose,
            settingIdx,
            isShowWindow,
            changeWindowShow,
            handleCreateJob,
            isRunning,
            handleCloseDashboard,
            settingRef,
            isShowCloseModal,
            isShowDeleteModal,
            setIsShowDeleteModal,
            handleCancel,
            handleCloseJob,
            handleDeleteJob,
            queryTaskList,

            CloseRunningIcon,
            StartIcon,
            StopIcon,
            LoadingIcon,
            SettingIcon,
            JobIcon,
            CreateJobIcon,
            CloseIcon,
        }
    }
})
</script>