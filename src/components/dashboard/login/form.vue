<template>
    <div class="dashboard-login-form" v-show="isShowForm">
        <el-input v-model="form.phone" placeholder="手机号" maxlength="11" class="dashboard-login-form-input">
            <template #append>
                <img class="dashboard-login-form-input-icon" :src="ClearIcon" v-show="form.phone" @click="handleClearPhone" />
            </template>
        </el-input>
        <div style="height: 24px" />
        <el-input v-model="form.code" placeholder="请输入验证码" class="dashboard-login-form-input">
            <template #append>
                <div class="dashboard-login-form-input-btn btn-light" v-show="form.phone && !isActive" @click="handleSendCode">发送验证码</div>
                <div class="dashboard-login-form-input-cutdown" v-show="isActive">{{count}}秒后再次发送</div>
            </template>
        </el-input>
        <div style="height: 31px" />
        <div :class="[
            'dashboard-login-btn',
            form.phone && form.code ? '' : 'dashboard-login-btn-opacity'
        ]"
            @click="handleNextStep"
        >下一步</div>
    </div>
    <div class="dashboard-login-form" v-show="!isShowForm">
        <el-input
            v-model="form.company"
            placeholder="填写公司名称"
            show-word-limit
            type="textarea"
            class="dashboard-login-form-company"
        />
        <div style="height: 33px" />
        <div :class="[
                'dashboard-login-btn',
                form.company ? 'btn-light' : 'dashboard-login-btn-opacity'
            ]"
            @click="handleSubmit"
        >开启AI之旅！</div>
    </div>
</template>
<script>
import { defineComponent, ref } from 'vue';
import { ElInput, ElMessage } from 'element-plus';
import { useTimeoutPoll } from '@vueuse/core'
import { STORE_USER_INFO_KEY, STORE_IS_LOGIN_KEY, API_CODE_ENUM } from '~constants/index'
import ClearIcon from "data-base64:~assets/input-clear.svg"
import { storageSet } from '~utils';
import { post as postApi } from '~components/fetch'
import { Cmd, ResponseMessage } from '~background/MessageModel';
import { useGlobalState } from '~store/global'

const CUT_DOWN = 25

export default defineComponent({
    components: {
        ElInput,
        ElMessage
    },
    setup() {
        const form = ref({
            phone: '',
            code: '',
            company: ''
        })
        const count = ref(CUT_DOWN)
        const { isActive, pause, resume } = useTimeoutPoll(cutdown, 1000)
        const isShowForm = ref(true)
        const { setIsLogined, setMessage } = useGlobalState()
        const setIsShowForm = (bool) => {
            isShowForm.value = bool
        }
        const handleClearPhone = () => {
            form.value.phone = ''
        }
        const getUserInfo = async () => {
            const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_GET_USERINFO, {}))
            if(res) {
                form.value.company = res?.companyName
                setIsLogined(true)
            }
        }

        const handleSendCode = async () => {
            console.log('handleSendCode--isActive', isActive?.value)
            if(!isActive?.value) {
                resume()
                // const data = {
                //     type: 1,
                //     phone: form.value.phone
                // }
                const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_SEND_VERIFY_CODE, { phone: form.value.phone}))
                // const res = await postApi('/auth/sendVerifyCode', data)

                console.log('验证码', res)
                if(res) {
                    form.value.code = res
                } else {
                    ElMessage.error(res?.msg || '获取手机验证码错误，请重新获取！')
                }
            }
        }

        const handleNextStep = async () => {
            if(!form.value.phone) {
                setMessage({ type: 'warning', message: '请先填写手机号'})
                return
            }
            if(!form.value.code) {
                setMessage({ type: 'warning', message: '请获取验证码'})
                return
            }
            
            await handleLogin()
            await getUserInfo()
            setIsShowForm(false)
        }
        
        const saveUserInfo = async () => {
            return await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_SAVE_USERINFO, {companyName: form.value.company}))
        }
        const handleLogin = async () => {
            const data = {
                phone: form.value.phone,
                verifyCode: form.value.code
            }
            const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_LOGIN, data))
            if(res) {
                // await saveUserInfo()
                localStorage.setItem(STORE_USER_INFO_KEY, JSON.stringify(form.value))
                // const storeIsLogin = JSON.parse(localStorage.getItem(STORE_IS_LOGIN_KEY) || 'false');
                // await storageSet(STORE_IS_LOGIN_KEY, 'true')
                // setIsShowForm(true)
                // updateStorageUserInfo()
                // setIsLogined(true)
            }
        }
        const updateStorageUserInfo = () => {
            chrome.runtime.sendMessage(new ResponseMessage(Cmd.UPDATE_STORAGE_USERINFO, {
                ...form.value,
                companyName: form.value.company
            }))
        }
        const handleSubmit = async () => {
            // await handleLogin()
            await saveUserInfo()
            updateStorageUserInfo()
            setIsShowForm(true)
            await storageSet(STORE_IS_LOGIN_KEY, 'true')
            setIsLogined(true)
            // const data = {
            //     phone: form.value.phone,
            //     verifyCode: form.value.code
            // };
            // try{
            //     const res = await postApi('/auth/login', data)
            //     console.log('登录res', res, res.code, API_CODE_ENUM.OK, typeof API_CODE_ENUM.OK, res.code === API_CODE_ENUM.OK)
            //     if(res.code === API_CODE_ENUM.OK) {
            //         localStorage.setItem(STORE_USER_INFO_KEY, JSON.stringify(form.value))
            //         // const storeIsLogin = JSON.parse(localStorage.getItem(STORE_IS_LOGIN_KEY) || 'false');
            //         await storageSet(STORE_IS_LOGIN_KEY, 'true')
            //         setIsShowForm(true)
            //         handleLogin()
            //         updateStorageUserInfo()
            //     } else {
            //         ElMessage.error(res?.msg || '登录错误，请重新登录！')
            //         setIsShowForm(true)
            //     }
            // } catch(err) {

            // }
        }

        function cutdown() {
            count.value--
            if(count.value <= 0) {
                pause()
                count.value = CUT_DOWN
            }
        }

        return {
            form,

            handleClearPhone,
            handleSendCode,
            handleNextStep,
            handleSubmit,

            isActive,
            // setIsSendCode,
            isShowForm,
            setIsShowForm,

            // isSendCode,
            count,
            ClearIcon,

        }
    }
})
</script>