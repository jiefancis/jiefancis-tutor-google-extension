<template>
    <div class="dashboard-message">
        <div :class="[
            'dashboard-message-content',
            props.type ==='success' ? '' :'dashboard-message-content--warning'
        ]">
            <img class="dashboard-message-content-icon" :src="SuccessIcon" v-if="props.type ==='success'"/>
            <img class="dashboard-message-content-icon" :src="WarningIcon" v-else/>
            <div style="flex: 1; white-space: nowrap;">{{ props.message }}</div>
        </div>
    </div>
</template>
<script setup>
import { defineProps, watch, onMounted } from 'vue'
import { useGlobalState } from '~store/global'
import anime from 'animejs/lib/anime.es.js';
import SuccessIcon from "data-base64:~assets/success-icon.svg"
import WarningIcon from "data-base64:~assets/warning-icon.svg"


const props = defineProps({
    type: {
        type: String,
        default: 'success'
    },
    message: {
        type: String,
        default: '666'
    }
})

const { setMessage } = useGlobalState()

watch(() => [props.type, props.mesasge], (newVal) => {
    // const close = showMessage()
    // setTimeout(close, 3000)
})

const showMessage = () => {
    anime({
        targets: '.dashboard-message',
        top: '50px',
        easing: 'easeInOutQuad'
    });
    return () => {
        anime({
            targets: '.dashboard-message',
            top: '-50px',
            easing: 'easeInOutQuad',
            opacity: 0,
        });
        setMessage(false)
    }
}

onMounted(() => {
    setTimeout(() => setMessage(false), 3000)
})

defineExpose({
    showMessage
})


</script>