<template>
    <transition name="fade">
      <floating-window :changeWindowShow="changeWindowShow"/>
    </transition>
</template>
  
<script lang="ts">
  import {ComponentInternalInstance, getCurrentInstance, reactive, toRefs, ref,  onMounted } from "vue";
  import {ToDragDirective} from '@howdyjs/to-drag';
  import FloatingWindow from "~components/FloatingWindow.vue";
  import Dashboard from '~components/dashboard/index.vue';

  import cssText from "data-text:~/contents/Floating-css.css"
  import dashBoardCssText from 'data-text:~/contents/css/dashboard.css'
  import tutorCssText from 'data-text:~/contents/css/tutor.css'
  import type {PlasmoCSConfig, PlasmoGetStyle} from "plasmo";
  
  import logo from "data-base64:~assets/icon.png"
  import * as ElementPlusCssText from 'data-text:~/contents/css/element.css'
  import {Cmd, ResponseMessage} from "~background/MessageModel";
  import { useGlobalState } from '~store/global';
  import MessageListener from '~utils/messageListener'
  import { EventEnum } from '~constants/event';
  
  const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style")
    /*  style.setAttribute("lang", "scss");
      style.setAttribute("scoped", "true");*/
    style.textContent = cssText + ' ' + dashBoardCssText + ' ' + tutorCssText + ' ' + ElementPlusCssText;
    return style
  }
  
  const initElementStyle = () => {
    const style = document.createElement("style")
    style.setAttribute("custom", "element")
    style.textContent = `${ElementPlusCssText}`
    document.head.appendChild(style)
  }
  
  const currentInstance = getCurrentInstance() as ComponentInternalInstance;
  
  export const config: PlasmoCSConfig = {
    // matches: ["https://*.zhipin.com/web/chat/*", "https://*.liepin.com/*"],
    run_at: "document_end"
  };
  export default {
    plasmo: {
      getStyle
    },
    setup() {
      const state = reactive({
        floatingShow: false,
        windowShow: false,
        options: {
          moveCursor: false,
          adsorb: 2,
          adsorbOffset: 10,
          transitionDuration: 800,
          transitionTimingFunction: 'cubic-bezier(0.34, -0.37, 0.73, 1.38)'
        }
      });
      const floatingShow = ref(false)
      const {  } = useGlobalState();
      const handleToDragStart = () => {
        state.windowShow = !state.windowShow;
        // state.floatingShow = !state.windowShow;
        console.log('handleToDragStart')
        // setShowWindow(!state.floatingShow)
      };
  
      const handleToDragMove = () => {
        console.log('handleToDragMove');
      }
  
      const changeWindowShow = () => {
        handleToDragStart();
      }
  
      // ===================== messageListener =====================
      const messageListener = new MessageListener()
      messageListener.on(EventEnum.open_popup, () => changeWindowShow())
      messageListener.on(Cmd.OPEN_POPUP, () => floatingShow.value = true)
      chrome.runtime.onMessage.addListener(messageListener.listener())
  
  
      onMounted(() => {
        console.log('mounteddddddd')
        document.documentElement.style.overflowX = 'hidden'

        const meta = document.createElement('meta');
        meta.setAttribute('content', `width=device-width, 
                                     initial-scale=1.0, 
                                     maximum-scale=1.0, 
                                     user-scalable=no`)
        meta.setAttribute('name', `viewport`)

        document.head.appendChild(meta)

      })
      return {
        handleToDragStart,
        handleToDragMove,
        changeWindowShow,
        // setShowWindow,
        logo,
        state,
        floatingShow
      }
    },
    directives: {
      toDrag: ToDragDirective
    },
    components: {FloatingWindow, Dashboard},
    logo: logo,
  }
  
  </script>

<style>
@import '~contents/css/element.css';
</style>
<style scoped>
@import '~contents/Floating-css.css';
@import '~contents/css/dashboard.css';
@import '~contents/css/empty.css';
@import '~contents/css/tutor.css';
</style>