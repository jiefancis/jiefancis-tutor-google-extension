<template>
    <div class="dashboard-chat-problems">
        <div class="dashboard-chat-problems-tips">
            <div class="dashboard-chat-problems-tips-text abs-center">以下为新的对话</div>
            <div class="dashboard-chat-problems-tips-line abs-center"></div>
        </div>
        <div class="dashboard-chat-problems-welcome">
            <span class="dashboard-chat-problems-welcome-ts">欢迎使用 TS Learning！</span>
            我是你的学习助手，你可以在对话框中输入在电脑端学习遇到的任何问题，或任何你看到的内容。
        </div>

        <div class="dashboard-chat-problems-wrapper">
            <div class="dashboard-chat-problems-wrapper-tips">点击直接发送 提问小虾</div>
            <div class="dashboard-chat-problems-list">
                <div v-for="(problem, index) in problems"
                    @click="() => handleChoose(problem.label, index)"
                    :class="[
                        'dashboard-chat-problems-item',
                        activeIndex === index ? 'dashboard-chat-problems-item-active' : ''
                    ]"
                >
                    <img :class="[
                        'dashboard-chat-problems-item-icon',
                        index === 2 ? 'dashboard-chat-problems-item-icon-other' : ''
                    ]" :src="problem.icon"/>
                    <div class="dashboard-chat-problems-item-text">{{ problem.label }}</div>
                </div>
            </div>
        </div>

    </div>
</template>
<script setup>
import { ref, defineEmits, watch } from 'vue'
import TaskIcon from "data-base64:~assets/icon-today-task.svg"
import DaibanIcon from "data-base64:~assets/icon-daiban.svg"
import ZongjieIcon from "data-base64:~assets/icon-zongjie.svg"

const emits = defineEmits(['update:choose', 'choose'])
const props = defineProps({
    choose: {
        type: [String, Number],
        default: ''
    }
})

const activeIndex = ref(-1);

const problems = ref([
    { icon: TaskIcon, label: '总结我今天的学习内容'},
    { icon: DaibanIcon, label: '根据我今日的学习内容总结出 5 道题目'},
    { icon: ZongjieIcon, label: '根据我一周的学习总结内容出 5 道题目'},
])

watch(() => props.choose, (newVal) => {
    if(!newVal) {
        activeIndex.value = -1
    }
})

const handleChoose = (problem, index) => {
    activeIndex.value = index
    emits('update:choose', problem)
    emits('choose')
}


</script>