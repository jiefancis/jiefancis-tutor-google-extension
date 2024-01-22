<template>
    <div class="dashboard-logout" ref="logoutRef">
        <div class="dashboard-logout-info">
            <div class="dashboard-logout-info-avatar">
                <img :src="AvatarIcon"/>
            </div>
            <div class="dashboard-logout-info-phone">{{ userInfo.phone }}</div>
            <div class="dashboard-logout-info-comp">{{ userInfo.companyName }}</div>
        </div>
        <div class="dashboard-logout-button" @click="handleLogout">
            退出登录
        </div>
    </div>
    <Mask v-show="isShowConfirm">
            <div class="dashboard-logout-message">
                <div class="dashboard-logout-message-header">
                    <div class="dashboard-logout-message-header-title">退出登录</div>
                    <div class="dashboard-logout-message-header-desc">您有正在运行的任务，退出会终止简历筛选</div>
                </div>
                <div class="dashboard-logout-message-bottom">
                    <div class="dashboard-logout-message-bottom-btn" @click="handleCancel">
                        取消
                    </div>
                    <div class="dashboard-logout-message-bottom-btn btn-out" @click="handleLogoutConfirm">
                        退出
                    </div>
                </div>
            </div>
        </Mask>
</template>

<script setup>
import { onMounted } from 'vue'
import AvatarIcon from "data-base64:~assets/avatar-black.svg"
import Mask from '~components/mask/index.vue'
import { STORE_IS_LOGIN_KEY, STORE_USER_INFO_KEY} from "~constants/index"
// import { onClickOutside } from '@vueuse/core'
import { Cmd, ResponseMessage } from "~background/MessageModel"
import { useGlobalState } from '~store/global'

import { ref, defineEmits } from 'vue'
import { storageSet, sleep } from '~utils'

const isShowConfirm = ref(false)
const logoutRef = ref(null)
const userInfo = ref({
    phone: '',
    companyName: ''
})

const emits = defineEmits(['update:isShowLogout'])

const { setIsLogined } = useGlobalState()

const setIsShowConfirm = (bool) => {
    isShowConfirm.value = bool
    if(!bool) {
        console.log('关闭弹窗', emits)
        emits('update:isShowLogout', false)
    }
}

const handleLogout = () => {
    setIsShowConfirm(true)
}

const handleCancel = () => {
    setIsShowConfirm(false)
}

const handleLogoutConfirm = async () => {
    localStorage.removeItem(STORE_IS_LOGIN_KEY)
    storageSet(STORE_IS_LOGIN_KEY, false)

    await sleep(500)
    setIsShowConfirm(false)
    setIsLogined(false)
}
// onClickOutside(logoutRef, (event) => setIsShowConfirm(false))

const getUserInfo = async () => {
    const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_GET_USERINFO))
    if(res) {
        console.log('获取用户信息：：', res)
        userInfo.value = res
    }
}

onMounted(async () => {
    await getUserInfo()
})

</script>