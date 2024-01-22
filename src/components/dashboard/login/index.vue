<template>
    <div class="dashboard-login" ref="logoutRef">
        <div class="dashboard-login-info">
            <img class="dashboard-login-info-avatar" :src="LogoIcon"/>
            <img class="dashboard-login-info-tshiring" :src="TSHiring"/>
            <div class="dashboard-login-info-helper">你的AI招聘助手</div>
        </div>
        <div class="dashboard-login-form-wrapper">
            <div class="dashboard-login-btn login-register-btn btn-light" v-show="!userInfo?.phone && !isShowForm" @click="handleLoginAndRegister">注册/登录</div>

            <div v-show="userInfo?.phone && !isShowForm">
                <div class="dashboard-login-account">当前账号 {{ userInfo?.phone }}</div>
                <div style="height: 24px"></div>
                <div class="dashboard-login-btn btn-light" @click="handleLogin">一键登录</div>
                <div style="height: 16px"></div>
                <div class="dashboard-login-btn btn-default" @click="handleOtherLogin">其他账号登录</div>
            </div>
            <div v-show="isShowForm">
                <div style="color: #fff; font-size: 13px; margin: 0 0 12px 10px;">登录账号</div>
                <Form />
            </div>

        </div>
        <img class="dashboard-container-header-close" :src="CloseIcon" @click="handleChangeWindowShow"/>
        <Message v-bind="message" v-if="message"/>
    </div>
</template>

<script setup>
import Form from '~components/dashboard/login/form.vue'
import Message from '~components/message/index.vue'
import AvatarIcon from "data-base64:~assets/avatar-black.svg"
import CloseIcon from "data-base64:~assets/close-icon.svg"
import LogoIcon from "data-base64:~assets/icon.png"
import TSHiring from "data-base64:~assets/TSHiring.png"
import { STORE_IS_LOGIN_KEY, STORE_USER_INFO_KEY } from '~constants/index'
import { storageSet } from '~utils/index'
// import { onClickOutside } from '@vueuse/core'
import { useGlobalState } from '~store/global'

import { ref, defineEmits } from 'vue'

const isShowConfirm = ref(false)
const logoutRef = ref(null)
const storeIsLogin = JSON.parse(localStorage.getItem(STORE_IS_LOGIN_KEY) || 'false')
const isLogined = ref(storeIsLogin)


const storeUserInfo = localStorage.getItem(STORE_USER_INFO_KEY) || '{}'
const userInfo = JSON.parse(storeUserInfo)

const isShowForm = ref(false)
const setIsShowForm = (bool) => {
    isShowForm.value = bool
}

const handleLoginAndRegister = () => {
    setIsShowForm(true)
}

const { message, setIsLogined } = useGlobalState()
const emits = defineEmits(['update:isShowLogout', 'changeWindowShow'])



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
const handleLogoutConfirm = () => {
    setIsShowConfirm(false)
}
// onClickOutside(logoutRef, (event) => setIsShowConfirm(false))

const handleLogin = async () => {
    console.log('一键登录')
    localStorage.setItem(STORE_IS_LOGIN_KEY, 'true')
    await storageSet(STORE_IS_LOGIN_KEY, 'true')
    setIsLogined(true)
}

const handleOtherLogin = () => {
    setIsShowForm(true)
}

const handleChangeWindowShow = () => {
    emits('changeWindowShow')
    setIsShowForm(false)
}

</script>