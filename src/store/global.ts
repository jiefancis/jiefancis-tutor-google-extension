import { ref, watch, computed } from 'vue'
import { createGlobalState, useStorage, useTimeoutPoll } from '@vueuse/core'
import { timerFn } from '~utils'
import { STORE_IS_LOGIN_KEY } from '~constants'

export const useState = (initialValue) => {
  const state = ref(initialValue)
  const setState = (val) => {
    state.value = val
  }

  return [ state, setState ]
}

export const useGlobalState = createGlobalState(
  () => {
    const [message, setMessage] = useState(false)
    const [isShowChat, setIsShowChat] = useState(false)
    const [isScreenShot, setIsScreenShot] = useState(false)
    const [isOpenLibrary, setIsOpenLibrary] = useState(false)
    const [isShowToast, setIsShowToast] = useState(false)
    const [isClearChat, setIsClearChat] = useState(false)
    const [isShowGallery, setIsShowGallery] = useState(false)
    const [imgList, setImgList] = useState([])
    const [previewIndex, setPreviewIndex] = useState(0)
    const [levelUp, setLevelUp] = useState(1)

    const recordTime = ref(0)

    const { isActive, pause, resume } = useTimeoutPoll(() => {
        recordTime.value += 1
    }, 1000)

    watch(isScreenShot, (newVal) => {
      if(newVal) {
          console.log('是否开启屏幕记录?--开始计时', newVal)
          resume()
      } else {
          console.log('是否开启屏幕记录?--暂停结束计时', newVal)
          pause()
          recordTime.value = 0;
      }
  }, { immediate: true})

    const recordTimeFormat = computed(() => timerFn(recordTime.value))

    return {
      imgList,
      setImgList,
      recordTime,
      recordTimeFormat,
      isShowChat,
      setIsShowChat,
      isScreenShot,
      setIsScreenShot,
      isOpenLibrary,
      setIsOpenLibrary,
      isShowToast,
      setIsShowToast,
      isClearChat,
      setIsClearChat,
      isShowGallery,
      setIsShowGallery,
      previewIndex,
      setPreviewIndex,
      levelUp, setLevelUp,
      message, setMessage,
    }
  }
)