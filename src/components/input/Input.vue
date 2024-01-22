<template>
  <div class="in-input">
    <div class="in-input-label">
      <label>{{ label }}</label>
      <div style="cursor: pointer;" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave" class="tooltip-wrapper">
        <div class="tooltip" v-show="label.includes('打招呼') && showTooltip">打招呼时, 话术超100字自动简化！</div>
        <QuestionFilled v-show="label.includes('打招呼')" style="width: 1em; height: 1em; cursor: pointer;"></QuestionFilled>
      </div>
      <!-- <el-tooltip effect="light" content="打招呼时, 话术超100字自动简化！" placement="top">
        <QuestionFilled v-show="label.includes('打招呼')" style="width: 1em; height: 1em; cursor: pointer;"></QuestionFilled>
      </el-tooltip> -->
      
    </div>
    <div class="in-input-text-div">
      <input :placeholder="placeholder" v-if="inputType==='input'" ref="input" v-model="value"
             :maxlength="textMaxLength"
             class="in-input-text"
      />
      <textarea :placeholder="placeholder" v-else ref="input" v-model="value"
                :maxlength="textMaxLength"
                class="in-input-textarea"
      />
      <label :class="inputType==='input'?'in-input-text-length-prompt':'in-input-textarea-length-prompt'">
        {{ data.valueLength.value }}/{{ textMaxLength }}</label>
    </div>
  </div>
</template>

<script setup lang="ts">

import {ComponentInternalInstance, computed, getCurrentInstance, onMounted, ref, watch} from "vue";
import { QuestionFilled } from '@element-plus/icons-vue'
// import { ElTooltip } from "element-plus";

let currentInstance = getCurrentInstance() as ComponentInternalInstance;
const emit = defineEmits(["update:modelValue"]);

const showTooltip = ref(false)

const props = defineProps({
  inputType: {
    type: String,
    default: 'input'
  },
  label: {
    type: String,
    default: ''
  },
  modelValue: {
    type: String,
    default: ''
  },
  textMaxLength: {
    type: Number,
    default: 18
  },
  fontSize: {
    type: String,
    default: '15px'
  },
  inputHeight: {
    type: String,
    default: '44px'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  }
})

onMounted(() => {
  let input: HTMLInputElement = currentInstance.refs.input as HTMLInputElement;
  input.style.height = props.inputHeight as string;
  input.style.fontSize = props.fontSize as string;
});

const value = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    data.valueLength.value = value.length;
    emit("update:modelValue", value);
  }
})

computed(() => {
  return {
    '--input-height': props.inputHeight,
  }
})

const data = {
  valueLength: ref(props.modelValue?.length || 0),
}
const handleMouseEnter = () => {
  showTooltip.value = true
}
const handleMouseLeave =() => {
  showTooltip.value = false
}
</script>

<style scoped>
.tooltip{

}
</style>