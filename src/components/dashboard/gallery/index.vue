<template>
    <div class="dashboard-gallery">
      <div class="dashboard-gallery-panel">
        <div class="dashboard-gallery-panel-list">
          <div 
            :class="[
              'dashboard-gallery-panel-item',
              activeIdx === index? 'dashboard-gallery-panel-item-active' : ''
            ]"
            v-for="(item, index) in props.imageList"
            @click="handlePreview(index)"
            :key="index"
          >
            <img class="dashboard-gallery-panel-item-img" :src="item?.downloadUrl || item.src" />
          </div>
        </div>
        <div class="dashboard-gallery-panel-preview">

          <div class="dashboard-gallery-panel-preview-header">
            <div class="dashboard-gallery-panel-preview-header-icons">
              <img class="dashboard-gallery-panel-preview-header-logo" :src="Logo" />
              <img class="dashboard-gallery-panel-preview-header-tutor" :src="TutorIcon" />
            </div>
            <div class="dashboard-gallery-panel-preview-header-current">{{ previewStr }}</div>
            <div class="dashboard-gallery-panel-preview-header-right">
              <div class="dashboard-gallery-panel-preview-header-icons">
                <img class="dashboard-gallery-panel-preview-header-logo" :src="prevIconActive ? PrevActiveIcon : PrevIcon" @click="handlePrev" style="margin: 0 16px 0 0"/>
                <img class="dashboard-gallery-panel-preview-header-logo" :src="nextIconActive ? NextActiveIcon : NextIcon" @click="handleNext"/>
              </div>
              <div class="dashboard-gallery-panel-preview-header-right-line"></div>
              <div class="dashboard-gallery-panel-preview-header-icons flex">
                <img class="dashboard-gallery-panel-preview-header-logo" :src="ReduceIcon" @click="() => handleScale(-5)"/>
                <div class="dashboard-gallery-panel-preview-header-scale">{{ scale }}%</div>
                <img class="dashboard-gallery-panel-preview-header-logo" :src="AddIcon" @click="() => handleScale(5)"/>
              </div>
              <img class="dashboard-gallery-panel-preview-header-close" :src="CloseIcon" @click="handleClose"/>
            </div>
            
          </div>
          <div class="dashboard-gallery-panel-preview-container">
            <div style="{width: 100%;height: 100%;overflow: scroll; text-align: center;}">
              <el-image class="dashboard-gallery-panel-preview-image" 
                :src="current"
                :style="{width: `${scale}%`}"
                :zoom-rate="1.2"
                :max-scale="7"
                :min-scale="0.2"
              />
              <!-- <img class="dashboard-gallery-panel-preview-image" :src="current" :style="{width: `${scale}%`}"/> -->
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, computed, defineProps, watch } from 'vue'
import { useGlobalState } from '~store/global'
import { ElImage } from 'element-plus'


import CloseIcon from "data-base64:~assets/close-icon.svg"
import Logo from 'data-base64:~assets/logo.svg'
import TutorIcon from "data-base64:~assets/ts-tutor.svg"
import PrevIcon from 'data-base64:~assets/icon-prev.svg'
import NextIcon from 'data-base64:~assets/icon-next.svg'
import PrevActiveIcon from 'data-base64:~assets/icon-prev-active.svg'
import NextActiveIcon from 'data-base64:~assets/icon-next-active.svg'

import ReduceIcon from 'data-base64:~assets/icon-scale-reduce.png'
import AddIcon from 'data-base64:~assets/icon-scale-add.png'

const MIN_SCALE = 10;
const MAX_SCALE = 500
const nextIconActive = ref(false)
const prevIconActive = ref(false)

const props = defineProps({
  imageList: {
    type: Array,
    default: () => ([])
  }
})

const { setIsShowGallery, previewIndex } = useGlobalState()

const scale = ref(100)
const activeIdx = ref(previewIndex.value || 0)
const total = ref(0)

const previewStr = computed(() => {
  if(total.value) {
    return `${activeIdx.value + 1} / ${total.value}`
  }
})
const current = computed(() => props.imageList?.[activeIdx.value]?.downloadUrl)


watch(previewIndex, (newVal) => {
  console.log('watch--previewIndex.value', newVal)
  activeIdx.value = newVal
}, { immediate: true})

watch(() => props.imageList, (newVal) => {
  console.log('props.imageListprops.imageList', newVal.length)
  total.value = newVal.length;
}, { immediate: true })

const updateCurrent = (url) => {
  current.value = url
}
const handlePreview = (index) => {
  activeIdx.value = index
  // updateCurrent(props.imageList.value[index])
}


const handleClose = () => {
  setIsShowGallery(false)
}

const handlePrev = () => {
  prevIconActive.value = true
  if(activeIdx.value === 0) {
    activeIdx.value = props.imageList?.length || 0
  } else if(activeIdx.value > 0) {
    activeIdx.value -= 1
  }
  // else {
  //   activeIdx.value = 0
  // }
}
const handleNext = () => {
  nextIconActive.value = true
  activeIdx.value = (activeIdx.value + 1) % props.imageList.length
}
const handleScale = (num) => {
  if(scale.value + num <= MIN_SCALE) {
    scale.value = MIN_SCALE
  } else if(scale.value + num >= MAX_SCALE) {
    scale.value = MAX_SCALE
  } else {
    scale.value += num
  }
}

</script>

<style scoped>
.dashboard-gallery-panel-preview-header-current{
  position: absolute;
  right: 249px;
  color: #fff;
  font-size: 16px;
}
</style>