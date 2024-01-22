<template>
    <div class="dashboard-job-setting">
        <div class="dashboard-job-setting-item" v-for="(setting, index) in settingList" @click="handleSettingAction(setting)">
            <img class="dashboard-job-setting-item-icon" :src="setting.icon" />
            <div :class="[
                'dashboard-job-setting-item-text',
                index ? 'dashboard-job-setting-item-text-color' : ''
            ]">{{ setting.text }}</div>
        </div>
    </div>
</template>
<script>
import { defineComponent, ref } from 'vue';
import { useGlobalState } from '~store/global'

import HomeIcon from 'data-base64:~assets/icon-home.svg'
import ClearIcon from "data-base64:~assets/icon-clearAll.svg"

export default defineComponent({
    setup(props, { emit }) {
        const settingList = ref([
            {
                text: '返回首页',
                icon: HomeIcon,
                operate: 1,
            },
            {
                text: '清空对话记录',
                icon: ClearIcon,
                operate: 2,
            },
        ])

        const { setIsShowChat, setIsOpenLibrary, setIsShowToast } = useGlobalState()

        const handleSettingAction = (setting) => {
            if(setting?.operate === 1) {
                setIsShowChat(false)
                setIsOpenLibrary(false)
            } else {
                setIsShowToast(true)
            }
            emit('callback', true)
        }
        return {
            settingList,
            handleSettingAction,
        }
    }
})
</script>