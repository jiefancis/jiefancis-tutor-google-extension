<template>
    <Mask>
        <div class="dashboard-logout-message">
            <div class="dashboard-logout-message-header">
                <div class="dashboard-logout-message-header-title">
                    <slot name="title">标题</slot>
                </div>
                <div class="dashboard-logout-message-header-desc">
                    <slot name="subTitle">描述</slot>
                </div>
            </div>
            <div class="dashboard-logout-message-bottom">
                <div class="dashboard-logout-message-bottom-btn" @click="handleCancel">
                    <slot name="cancel">取消</slot>
                </div>
                <div class="dashboard-logout-message-bottom-btn btn-out" @click="handleConfirm">
                    <slot name="confirm">确定</slot>
                </div>
            </div>
        </div>
    </Mask>
</template>
<script setup>
import { defineEmits } from 'vue';
import Mask from '~components/mask/index.vue'

const emits = defineEmits(['cancel', 'confirm'])

const handleCancel = () => {
    emits('cancel')
}
const handleConfirm = () => {
    emits('confirm')
}

</script>