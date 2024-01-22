<template>
    <div class="dashboard-empty">
        <div class="dashboard-empty-container">
            <div class="dashboard-empty-container-icon">
                <slot name="icon"><img class="dashboard-empty-container-icon" :src="emptyIcon"/></slot>
            </div>
            
            <div class="dashboard-empty-container-msg">
                <slot name="title">图库无内容</slot>
            </div>
            <div class="dashboard-empty-container-tips">
                <slot name="subTitle">图库未储存相关图片，请开启录制按钮</slot>
            </div>
        </div>
    </div>
</template>

<script setup>
import emptyIcon from "data-base64:~assets/empty-tutor.svg"

</script>