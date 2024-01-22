<template>
    <div class="dashboard-home">
        <div class="dashboard-home-header flex">
            <img class="dashboard-home-header-logo" :src="Logo"/>
            <img class="dashboard-home-header-icon" :src="TutorIcon"/>
            <div class="dashboard-home-header-name">你的AI学习助手</div>
        </div>

        <div class="dashboard-home-container">
            <div class="dashboard-home-container-list">
                <div class="dashboard-home-container-item flex">
                    <img class="dashboard-home-container-item-icon" :src="JietuIcon"/>
                    <div class="dashboard-home-container-item-label"> 屏幕截图 </div>
                    <el-switch @change="handleSwitchChange" :model-value="isScreenShot" size="large" style="--el-switch-on-color: #30D158; --el-switch-off-color: #636366"></el-switch>
                </div>
                <div class="dashboard-home-container-item flex" @click="handleChat">
                    <img class="dashboard-home-container-item-icon" :src="TiwenIcon" />
                    <div class="dashboard-home-container-item-label">提问小虾</div>
                    <img class="dashboard-home-container-item-icon" :src="ArrowIcon" />
                </div>
                <div class="dashboard-home-container-item flex" @click="handleView">
                    <img class="dashboard-home-container-item-icon" :src="TukuIcon" />
                    <div class="dashboard-home-container-item-label">查看图库</div>
                    <img class="dashboard-home-container-item-icon" :src="ArrowIcon" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, watch, defineComponent } from 'vue';
import Problem from '~components/dashboard/problems/index.vue';
import { ElSwitch } from 'element-plus'
import { useGlobalState } from '~store/global'

import Logo from 'data-base64:~assets/logo.svg'
import SettingIcon from 'data-base64:~assets/icon-settings.png'
import CloseIcon from "data-base64:~assets/close-icon.svg"
import TutorIcon from "data-base64:~assets/ts-tutor.svg"
import JietuIcon from "data-base64:~assets/jietu-icon.svg"
import TiwenIcon from "data-base64:~assets/tiwen-icon.svg"
import TukuIcon from "data-base64:~assets/tuku-icon.svg"
import ArrowIcon from "data-base64:~assets/arrow-right.svg"

export default defineComponent({
    components: {
        Problem,
        ElSwitch
    },
    setup() {
        const { setIsOpenLibrary, setIsShowChat, isScreenShot, setIsScreenShot } = useGlobalState()
        const record = ref(false)

        // watch(record, (newVal) => {
        //     if(newVal) {
        //         setIsScreenShot(true)
        //     }
        // })

        const handleView = () => {
            setIsShowChat(true)
            setIsOpenLibrary(true)
        }
        const handleRecord = () => {
            // setIsShowChat(true)
        }

        const handleChat = () => {
            setIsShowChat(true)
        }

        const handleSwitchChange = (val) => {
            setIsScreenShot(!!val)
        }
        
        return {
            handleView,
            handleRecord,
            handleChat,
            handleSwitchChange,
            
            isScreenShot,
            record,

            Logo,
            SettingIcon,
            CloseIcon,
            TutorIcon,
            JietuIcon,
            TiwenIcon,
            TukuIcon,
            ArrowIcon
        }
    }
})

const problem = ref(null)

watch(problem, (newVal) => {
    console.log('problem', newVal)
})

</script>