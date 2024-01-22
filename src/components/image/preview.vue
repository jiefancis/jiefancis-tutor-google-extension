<template>
    <Mask @click="handleClose">
        <div class="demo-image__lazy abs-top" style="top: auto">
          <el-image
            style="width: 100%; height: auto"
            :src="url"
            :zoom-rate="1.2"
            :max-scale="7"
            :min-scale="0.2"
            fit="cover"
          />
        </div>
    </Mask>
    
  </template>
  
<script>
import { defineComponent, ref, watch } from 'vue';
import { ElImage } from 'element-plus';
import Mask from '~components/mask/index.vue'

export default defineComponent({
    components: {
        ElImage,
        Mask,
    },
    props: {
        url: String
    },
    setup(props, { emit }) {
        const url = ref(props?.url)
        watch(
          () => props.url, 
          (newValue) => {
            url.value = newValue
          }, 
          { immediate: true }
        )
        
        const handleClose = () => {
          emit('handlePreviewImageClose')
        }
        return {
          handleClose,
          url
        }
    }
})
  
  </script>
  
  <style scoped>
  .demo-image__lazy {
    position: absolute;
    width: 400px;
    height: 500px;
    overflow-y: auto;
  }
  .demo-image__lazy .el-image {
    display: block;
    min-height: 200px;
    margin-bottom: 10px;
  }
  .demo-image__lazy .el-image:last-child {
    margin-bottom: 0;
  }
  </style>