<template>
  <div class="dashboard-win">
    <div ref="floatingWindow" 
        v-to-drag="data.options"
        class="move-box-1"
        :style="{'z-index': `${levelUp}`}"
        @click="() => handleLevelUp(20)"
        @todragstart="handleToDragStart"
        @todragmove="handleToDragMove">
      <Dashboard :changeWindowShow="handleCloseBtnClick"/>
    </div>
    <div @click="() => handleLevelUp(1)">
      <Gallery v-show="isShowGallery" :imageList="imgList" v-to-drag="data.options"/>
    </div>
    <Message v-bind="message" v-if="message"/>
  </div>
</template>

<script setup lang="ts">
import {ToDragDirective} from '@howdyjs/to-drag';
import {ComponentInternalInstance, computed, getCurrentInstance, nextTick, onMounted, ref, watch } from "vue";
import Input from "~components/input/Input.vue";
import Button from "~components/button/Button.vue";
import Gallery from '~components/dashboard/gallery/index.vue'
import Message from '~components/message/index.vue'
import {ElMessage} from "element-plus";
import {ResumeAgent} from "~components/flowable/boss/BossResumeAgent";
import {ResumeAgent as LiepinResumeAgent} from "~components/flowable/liepin/resumeAgent";
import {themeColor} from "~GlobalVar";
import {ChatAgent} from "~components/flowable/boss/BossChatAgent";
import {ChatAgent as LiepinChatAgent} from "~components/flowable/liepin/chatAgent";
import {getJobInfo, getTaskInfoByServer, setJobInfo, setJobInfoToServer} from "~store/JobInfoStore";
import {AgentStatus} from "~components/flowable/boss/AgentStatus";
import { isLiepinSite, isLiepinResumePage, isLiepinChatPage, CreateLoading } from '~utils'
import { STORE_LIEPIN_CHAT_FLOW_RUNING } from '~constants/index'
import Dashboard from '~components/dashboard/index.vue'
import {Cmd, ResponseMessage} from "~background/MessageModel";
import {randomUtil} from "~utils/random";
import { useGlobalState } from '~store/global';

let currentInstance = getCurrentInstance() as ComponentInternalInstance;
const vToDrag = ToDragDirective;
const props = defineProps({
  show: Boolean,
  changeWindowShow: Function
})
const { isShowGallery, imgList, levelUp, setLevelUp, message } = useGlobalState()
// const levelUp = ref(0)

watch(() => props.show, (newVal) => {
  let floatingWindow: any = currentInstance.refs.floatingWindow;
  if(newVal) {
    floatingWindow.style.right = '375px';
    floatingWindow.style.top = '0px';
  } 
  // else {
  //   floatingWindow.style.left = 'calc(100vw)';
  // }
})

// onMounted(() => {   
//   let floatingWindow: any = currentInstance.refs.floatingWindow;
//   // floatingWindow.style.left = 'calc(75vw)';
//   // floatingWindow.style.left = 'calc(10vw)';
//   floatingWindow.style.right = 0;
//   floatingWindow.style.top = 'calc(20vh)';
// });
const handleLevelUp = (level) => {
  // levelUp.value = level
  setLevelUp(level)
}

watch(isShowGallery, (newVal) => {
    if(newVal) {
        chrome.runtime.sendMessage({
            cmd: Cmd.UPDATE_WIN,
            data: { type: 'max' }
        })
        handleLevelUp(20)
    } else {
        chrome.runtime.sendMessage({
            cmd: Cmd.UPDATE_WIN,
            data: { type: 'medium' }
        })
        handleLevelUp(1)
    }
})

const handleToDragStart = () => {
};

const handleToDragMove = () => {
}

const handleCloseBtnClick = () => {
  let changeWindowShowFunc = props.changeWindowShow as Function;
  changeWindowShowFunc?.();
}



const data = {
  icon: {
    close: 'close',
  },
  jobTitle: ref(''),
  filterCriteria: ref(''),
  sayHello: ref(''),
  options: {
    moveCursor: false,
    // adsorb: 2,
    positionMode: 2,
    // adsorbOffset: 10,
    adsorbOffset: 0,
    transitionDuration: 800,
    transitionTimingFunction: 'cubic-bezier(0.34, -0.37, 0.73, 1.38)'
  },
  handleToDragStart,
  handleToDragMove,
  handleCloseBtnClick

};

const chatAgent = new ChatAgent();// '.conversation-editor .submit-content .submit', '#boss-chat-editor-input'
const liepinChatAgent = new LiepinChatAgent('.conversation-editor .submit-content .submit', '.__im_pro__textarea');
let resumeAgent = new ResumeAgent(); // data.jobTitle.value, data.filterCriteria.value
let liepinResumeAgent = new LiepinResumeAgent(data.jobTitle.value, data.filterCriteria.value);

const saveBtnDisabled = computed(() => {
  return data.jobTitle.value === '' || data.filterCriteria.value === '' || data.sayHello.value === '';
});

computed(() => {
  return {
    '--in-theme-color': themeColor,
  }
})

</script>
<style scoped>
.dashboard-win{
  position: relative;
}
:deep(.el-textarea__inner::placeholder){
    color: rgba(235, 235, 245, 0.30) !important;
}
</style>
