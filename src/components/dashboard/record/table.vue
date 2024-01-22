<template>
    <el-table
      :data="tableData"
      empty-text="该岗位无筛选记录"
      style="width: 100%"
      height="295"
      row-class-name="dashboard-table-row-class"
      v-loading="loading"
    >
      <el-table-column prop="score" label="分数" width="60" align="center"/>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
            <div class="dashboard-table-column-status " v-show="row.status === 1">通过</div>
            <div class="dashboard-table-column-status  border-error text-error" v-show="row.status === 0">未通过</div>
        </template>
      </el-table-column>
      <el-table-column prop="candidateName" label="姓名" width="60" align="center"/>
      <el-table-column prop="phone" label="联系方式" width="150" align="center"/>
      <el-table-column prop="reason" label="评判理由" width="220" align="center">
        <template #default="{ row }">
          <div class="dashboard-table-row-reason" @click="() => handleCloseModal(row?.reason)">{{ row?.reason?.slice?.(0,28) + '...' }}</div>
        </template>
      </el-table-column>

      <el-table-column prop="platform" label="平台" width="60" align="center">
        <template #default="{ row }">
            <img class="dashboard-table-column-platform " :src="BossIcon" v-show="row.platform === 1" />
            <img class="dashboard-table-column-platform " :src="LiepinIcon" v-show="row.platform === 2" />
        </template>
      </el-table-column>

      <el-table-column prop="resume" label="简历截图" width="100" align="center">
        <template #default="{ row }">
          <Image :url="row.resumeImgUrl" @click="() => handlePreviewImage(row.resumeImgUrl)" v-show="row.resumeImgUrl"/>
        </template>
      </el-table-column>
    </el-table>
    <PreviewImage :url="previewUrl" v-show="previewUrl" @handlePreviewImageClose="handlePreviewImageClose"/>
    <Modal :text="detailText" v-show="detailText" @handleCloseModal="handleCloseModal"/>

</template>
  
<script>
import { defineComponent, ref, inject } from 'vue';
import { ElTable, ElTableColumn, ElTooltip } from 'element-plus'
import Image from '~components/image/index.vue'
import PreviewImage from '~components/image/preview.vue'
import Modal from '~components/dashboard/record/modal.vue'
import { GLOBAL_UPDATE_MESSAGE_KEY } from '~constants'

import BossIcon from "data-base64:~assets/boss.svg"
import LiepinIcon from "data-base64:~assets/liepin.svg"
import { Cmd, ResponseMessage } from '~background/MessageModel';

export default defineComponent({
    components: {
        ElTable,
        ElTableColumn,
        Image,
        PreviewImage,
        ElTooltip,
        Modal
    },
    props: {
      data: {
        type: Array,
        default: () => ([])
      },
      loading: {
        type: Boolean,
        default: () => false
      }
    },
    setup(props) {
        const previewUrl = ref('')
        const detailText = ref('')

        const handlePreviewImage = (url) => {
          previewUrl.value = url
        }
        const handlePreviewImageClose = () => {
          previewUrl.value = ''
        }
        const handleCloseModal = (text = '') => {
          detailText.value = text
        }

        return {
            handlePreviewImage,
            handlePreviewImageClose,
            handleCloseModal,
            tableData: props?.data,
            loading: props?.loading,

            previewUrl,
            detailText,

            BossIcon,
            LiepinIcon
        }
    }
})
  
</script>