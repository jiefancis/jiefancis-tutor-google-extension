<template>
    <div class="dashboard-record-modal abs-center" ref="modalRef">
        {{ text }}
    </div>
</template>

<script setup>
import { defineProps, defineEmits, ref } from 'vue';
import { onClickOutside } from '@vueuse/core'

const props = defineProps({ text: String })
const emits = defineEmits(['handleCloseModal'])

const modalRef = ref()
onClickOutside(modalRef, () => {
    emits('handleCloseModal', '')
})

</script>