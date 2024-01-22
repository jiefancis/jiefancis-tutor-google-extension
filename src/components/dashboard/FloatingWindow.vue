<template>
    <!-- v-to-drag="data.options" class="move-box-1" -->
    <div ref="floatingWindow" class="move-box-window">
      <div class="window-header">
        <Button @click="handleCloseBtnClick" class="cancel-btn" text="取消"/>
        <div @click="handleAgentStop" class="title">
          <label>编辑招聘信息</label>
        </div>
        <Button class="save-btn"
                @click="handleSaveBtnClick"
                :disabled="saveBtnDisabled" text="完成" font-color="#81FF00"/>
      </div>
  
      <div class="window-body">
        <Input class="p-in-input"
               placeholder="务必输入真实的职位名称"
               label="💼 职位"
               v-model="data.jobTitle.value"
               input-height="44px"
               font-size="15px"
               :text-max-length="18"
        />
        <Input class="p-in-input"
               placeholder="详细的简历筛选标准有助于Agent更好的为您筛选候选人"
               label="🔍 筛选标准"
               v-model="data.filterCriteria.value"
               input-height="224px"
               font-size="15px"
               input-type="textarea"
               :text-max-length="500"/>
        <Input class="p-in-input"
               placeholder="友好的打招呼话术让候选人更愿意与您沟通"
               label="🙋 打招呼话术"
               v-model="data.sayHello.value"
               input-height="224px"
               font-size="15px"
               input-type="textarea"
               :text-max-length="500"/>
      </div>

      <Mask v-show="isShowModal">
          <div class="dashboard-logout-message">
              <div class="dashboard-logout-message-header">
                  <div class="dashboard-logout-message-header-title">退出本次编辑</div>
                  <div class="dashboard-logout-message-header-desc">退出后不保留本次编辑内容</div>
              </div>
              <div class="dashboard-logout-message-bottom">
                  <div class="dashboard-logout-message-bottom-btn" @click="handleCancel">
                    退出
                  </div>
                  <div class="dashboard-logout-message-bottom-btn btn-out" @click="handleEdit">
                    继续编辑
                  </div>
              </div>
          </div>
      </Mask>
    </div>
  </template>
  
  <script setup lang="ts">
  import {ToDragDirective} from '@howdyjs/to-drag';
  import {ComponentInternalInstance, 
    computed, 
    getCurrentInstance, 
    nextTick, 
    onMounted, 
    onUnmounted, 
    ref, watch, 
    defineEmits,
    inject,
  } from "vue";
  import Input from "~components/input/Input.vue";
  import Button from "~components/button/Button.vue";
  import Mask from '~components/mask/index.vue'
  import {ElMessage, emitChangeFn} from "element-plus";
  import {ResumeAgent, startBossResume} from "~components/flowable/boss/BossResumeAgent";
  import {ResumeAgent as LiepinResumeAgent } from "~components/flowable/liepin/resumeAgent";
  import {themeColor} from "~GlobalVar";
  import {ChatAgent} from "~components/flowable/boss/BossChatAgent";
  import {ChatAgent as LiepinChatAgent } from "~components/flowable/liepin/chatAgent";
  import {getJobInfo, setJobInfo} from "~store/JobInfoStore";
  import {AgentStatus} from "~components/flowable/boss/AgentStatus";
  import { isLiepinSite, isLiepinResumePage, isLiepinChatPage, CreateLoading } from '~utils'
  import { STORE_LIEPIN_CHAT_FLOW_RUNING, GLOBAL_UPDATE_MESSAGE_KEY } from '~constants/index'
  import { post as postApi } from '~components/fetch'
  import {Cmd, ResponseMessage} from "~background/MessageModel";
  
  let currentInstance = getCurrentInstance() as ComponentInternalInstance;
  const vToDrag = ToDragDirective;
  const props = defineProps({
    show: Boolean,
    changeWindowShow: Function,
    jobId: String,
    isShowWindow: Boolean,
  })

const emits = defineEmits(['refreshTaskList'])
const isShowModal = ref(false)

const updateMessage: Function = inject(GLOBAL_UPDATE_MESSAGE_KEY)
  
// watch(() => props.show, (newVal) => {
//   let floatingWindow: any = currentInstance.refs.floatingWindow;
//   if(newVal) {
//     floatingWindow.style.left = 'calc(75vw)';
//   } else {
//     floatingWindow.style.left = 'calc(100vw)';
//   }
// })
const queryTaskDetail = async () => {
  const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_DETAIL, { id: props.jobId }))
  if(res.id) {
    return {
      ...res,
      filterCriteria: res?.jobRequirement
    }
  }
  return null
}



const handleCancel = () => {
  isShowModal.value = false
  let changeWindowShowFunc = props.changeWindowShow as Function;
  changeWindowShowFunc(false);
}
const handleEdit = () => {
  isShowModal.value = false
}
  
onMounted(() => {
  // let floatingWindow: any = currentInstance.refs.floatingWindow;
  // // floatingWindow.style.left = 'calc(75vw)';
  // floatingWindow.style.left = 'calc(100vw)';
  // floatingWindow.style.top = 'calc(20vh)';
  // startFlow()
});
  
function startLiepinResumeFlow() {
  if(isLiepinResumePage()) { // && liepinResumeAgent.status === AgentStatus.RUNNING
    nextTick(() => {
      liepinResumeAgent?.observeDocument?.()
      liepinResumeAgent?.checkResume(document) //.querySelector('#water-mark-wrap') as HTMLElement
    })
  }
}
  
  const handleToDragStart = () => {
  };
  
  const handleToDragMove = () => {
  }
  
  const handleCloseBtnClick = () => {
    isShowModal.value =true
  }
  
  const handleAgentStop = () => {
    chatAgent.stop();
  }
  
  
  const startBossFlow = () => {
    resumeAgent.start();
    //chatAgent.start();
    // 每5s检查一次筛选简历agent是否完成
    let interval = setInterval(() => {
      if (resumeAgent.status === AgentStatus.FINISH) {
        if (resumeAgent.status === AgentStatus.ERROR) {
          //resumeAgent.start();
          ElMessage({
            message: '筛选简历agent出错!',
            type: 'error',
          });
        }
        clearInterval(interval);
        chatAgent.start();
      }
    }, 5000);
  }
  
  const startLiepinFlow = () => {
    liepinResumeAgent.start();
  
    // 每5s检查一次筛选简历agent是否完成
    let interval = setInterval(() => {
      if (resumeAgent.status === AgentStatus.FINISH) {
        if (resumeAgent.status === AgentStatus.ERROR) {
          //resumeAgent.start();
          ElMessage({
            message: '筛选简历agent出错!',
            type: 'error',
          });
        }
        clearInterval(interval);
        // liepinChatAgent?.start?.();
      }
    }, 5000);
  }
  

  const handleCreateTask = async () => {

    if(!data.jobTitle.value) {
      updateMessage?.({ type: 'warning', message: '请输入职位名称'})
      return
    }
    if(!data.filterCriteria.value) {
      updateMessage?.({ type: 'warning', message: '请输入筛选标准'})
      return
    }
    if(!data.sayHello.value) {
      updateMessage?.({ type: 'warning', message: '请输入打招呼话术'})
      return
    }

    const postData: any = {
      jobTitle: data.jobTitle.value,
      jobRequirement: data.filterCriteria.value,
      sayHello: data.sayHello.value,
      // resumeFilterMethod: 3,
      runTimes: 1
    }
    if(props.jobId && (+props.jobId !== -1)) {
      postData.id = props?.jobId
    }

    const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_TASK_SAVE, postData))
    emits('refreshTaskList')
    if(res === true) {
      console.log('创建成功', res)
      updateMessage?.({ message: '创建成功'})
      handleCancel()
    }
  }
  
  const handleSaveBtnClick = () => {
    
    setJobInfo({
      jobTitle: data.jobTitle.value,
      filterCriteria: data.filterCriteria.value,
      sayHello: data.sayHello.value
    })
    handleCreateTask()
    // handleCloseBtnClick()

    return
    ElMessage({
      message: 'OK, 保存成功! 开始招聘流程!',
      type: 'success',
    });


  
    // 猎聘网
    if(isLiepinSite()) {
      startLiepinFlow()
      return
    }
    startBossFlow()

    
  
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
      adsorb: 2,
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
  