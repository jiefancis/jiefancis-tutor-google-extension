<template>
    <div class="dashboard-record">
        <div class="dashboard-record-filter">
            <div class="dashboard-record-filter-tabs">
                <div 
                    @click="() => handleSelectTab(index)"
                    v-for="(tab, index) in tabList?.slice?.(0,6)"
                    :key="index"
                    :class="[
                        'dashboard-record-filter-tab',
                        tabActiveIndex === index ? 'dashboard-record-filter-tab-active' : ''
                    ]"
                >{{ tab.name }}</div>

                <div :class="[
                        'dashboard-record-filter-tab',
                        tabActiveIndex >= 6 ? 'dashboard-record-filter-tab-active' : ''
                    ]" style="width: 16px; height: 16px; cursor: pointer; position: relative;" >
                    <img v-show="tabList?.length > 6" 
                        @click="handleExpandMoreJob"
                        :src="ExpandMoreIcon"
                        style="width: 16px; height: 16px; cursor: pointer;" 
                    />
                    <Menu ref="JobMenuRef" :defaultValue="tabActiveIndex - 6" :menuList="expandTabList" v-if="isShowFilterJob" @select="handleSelectJob" />
                </div>
                
            </div>
            <div class="dashboard-record-filter-list">
                <div class="dashboard-record-filter-item" @click="handleFilterClock">
                    <div>{{  clockText }}</div>
                    <img :src="ClockIcon" />
                    <Menu ref="clockMenuRef"
                        :defaultValue="0"
                        :menuList="menuClockList" v-show="isShowFilterClock" @select="handleSelectClock"/>
                </div>
                <div class="dashboard-record-filter-item"  @click="handleFilterStatus">
                    <span>{{  statusText }}</span>
                    <img :src="ExpandIcon" />
                    <Menu ref="stausMenuRef" :defaultValue="0" :menuList="menuStatusList" v-show="isShowFilterStatus" @select="handleSelectStatus"/>
                </div>
            </div>
        </div>
        <div class="dashboard-record-table">
            <div class="dashboard-record-table-header">
                <div class="dashboard-record-table-header-icon">
                    <img :src="TableFilterIcon" />
                </div>
                <div class="dashboard-record-table-header-list">
                    <div class="dashboard-record-table-header-item">
                        <div class="dashboard-record-table-header-item-label">筛选简历</div>
                        <div class="dashboard-record-table-header-item-num">
                            <span>{{ checkedResumeNum }}</span>
                            <img :src="TableStarIcon" />
                        </div>
                    </div>
                    <div class="dashboard-record-table-header-item">
                        <div class="dashboard-record-table-header-item-label">收到简历</div>
                        <div class="dashboard-record-table-header-item-num">
                            <span>{{ receivedResumeNum }}</span>
                            <img :src="TableStarIcon" />
                        </div>
                    </div>
                    <div class="dashboard-record-table-header-item">
                        <div class="dashboard-record-table-header-item-label">沟通候选人</div>
                        <div class="dashboard-record-table-header-item-num">
                            <span>{{ contactedCandidateNum }}</span>
                            <img :src="TableStarIcon" />
                        </div>
                    </div>
                </div>
            </div>
            <Table :data="tableData" :loading="loading" />
            <div class="dashboard-record-table-pagination">
                <el-pagination
                    v-model:current-page="pageNo"
                    v-model:page-size="pageSize"
                    layout="prev, pager, next, jumper"
                    :total="total"
                    @size-change="handleSizeChange"
                    @current-change="handleCurrentChange"
                    />
                </div>
            </div>
    </div>
</template>

<script>
import { defineComponent, ref, watch, inject, computed, onMounted } from 'vue';
import { ElTabs, ElTabPane, ElPagination } from 'element-plus'
import Table from '~components/dashboard/record/table.vue'
import Menu from '~components/dashboard/menu/index.vue'
import { useGlobalState } from '~store/global'
// import { GLOBAL_UPDATE_MESSAGE_KEY } from '~constants'

import TableFilterIcon from "data-base64:~assets/table-filter.svg"
import TableStarIcon from "data-base64:~assets/table-Star.svg"
import ClockIcon from "data-base64:~assets/clock.svg"
import ExpandIcon from "data-base64:~assets/expand.svg"
import ExpandMoreIcon from "data-base64:~assets/expand-more.svg"
import { onClickOutside } from '@vueuse/core'
import { Cmd, ResponseMessage } from '~background/MessageModel';

export default defineComponent({
    components: {
        ElTabs,
        ElTabPane,
        Table,
        ElPagination,
        Menu,
    },
    setup(props, { emit}) {
        const pageNo = ref(1)
        const pageSize = ref(20)
        const tabActiveIndex = ref(0)
        const isShowFilterJob = ref(false)
        const isShowFilterClock = ref(false)
        const isShowFilterStatus = ref(false)
        const tableData = ref()
        const loading = ref(false)
        const clockText = ref('最近1天')
        const clockValue = ref('1d')
        const statusText = ref('全部')
        const statusValue = ref(-1)
        const total = ref(0)

        const checkedResumeNum = ref(0) // 已筛选简历数目
        const receivedResumeNum = ref(0) // 已接收简历数目
        const contactedCandidateNum = ref(0) // 已沟通候选人数目

        const stausMenuRef = ref()
        const clockMenuRef = ref()
        const JobMenuRef = ref()

        const { setTotalResume, setMessage } = useGlobalState()

        onClickOutside(stausMenuRef, () => {
            isShowFilterStatus.value = false
        })
        onClickOutside(clockMenuRef, () => {
            isShowFilterClock.value = false
        })
        onClickOutside(JobMenuRef, () => {
            isShowFilterJob.value = false
        })

        const activeTab = ref('')
        const tabList = ref();
        const expandTabList = ref();

        const menuClockList = ref([
            { label: '最近1天', value: '1d'},
            { label: '最近3天', value: '3d'},
            { label: '最近7天', value: '7d'},
            { label: '最近30天', value: '1m'}
        ]);
        const menuStatusList = ref([
            { label: '全部', value: -1},
            { label: '已通过', value: 1},
            { label: '未通过', value: 2}
        ]);

        // ==================== computed ====================

        const getPostData = computed(() => {
            return {
                current: pageNo.value,
                taskId: tabList.value?.[tabActiveIndex.value]?.id,
                recordTimeRange: clockValue.value,
                resumeStatus: statusValue.value,
            }
        })

        // ==================== watch ====================
        const queryTable = async (data) => {
          loading.value = false;
          
          const _data = {
            ...getPostData.value,
            ...data
          }
          if(!_data?.taskId) {
            return;
          }
          const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_GET_RECORD_LIST, _data))
          console.log('queryTable--resssss', res)
          if(res) {
            total.value = res?.resumes?.total;
            
            tableData.value = res?.resumes?.records?.map?.(item => {
                item.phone = item?.contact?.value
                return item
            })
          } else {
            setMessage({ type: 'warning', message: '加载失败，请稍后再试'})
          }
          loading.value = false
        }
        

        watch(() => [tabActiveIndex.value, clockValue.value, statusValue.value], (newVal, oldVal) => {
            console.log('参数--watch', newVal, newVal[1] !== oldVal[1], oldVal, getPostData.value)
            if(newVal[1] !== oldVal[1] || newVal[2] !== oldVal[2]) {
                pageNo.value = 1
                queryTable({ current: 1 })
            } else {
                queryTable()
            }
            
        })
        const handleTabClick = (tab, event) => {
            console.log(tab, event)
        }
        const handleSizeChange = (...args) => {
            console.log('handleSizeChange', args)
        }
        const handleCurrentChange = () => {
            // console.log('handleCurrentChange', args)
            queryTable()
        }
        const handleSelectTab = (index) => {
            tabActiveIndex.value = index
        }
        const handleFilterClock =() => {
            isShowFilterClock.value = !isShowFilterClock.value
        }
        const handleFilterStatus = () => {
            isShowFilterStatus.value = !isShowFilterStatus.value
        }

        const queryJobLabels = async () => {
            const res = await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_GET_JOB_LABELS))
            console.log('queryJobLabels', res)
            if(res) {
                tabList.value = res.map(item => {
                    item.label = item.jobTitle
                    item.name = item.jobTitle
                    return item
                })
                if(res?.length > 6) {
                    expandTabList.value = res.slice(6)
                    console.log('expandTabListexpandTabListexpandTabList', expandTabList.value)
                }
            }
        }

        const handleSelectClock = (menu) => {
            clockText.value = menu.label
            clockValue.value = menu.value
        }
        const handleSelectStatus = (menu) => {
            statusText.value = menu.label
            statusValue.value = menu.value
        }

        const handleSelectJob = (menu, index) => {
            tabActiveIndex.value = index + 6
        }

        const handleExpandMoreJob = () => {
            isShowFilterJob.value = !isShowFilterJob.value
        }

        onMounted(async () => {
            await queryJobLabels()
            await queryTable()
        })
        
        return {
            handleTabClick,
            pageNo,
            pageSize,
            handleSizeChange,
            handleCurrentChange,
            handleSelectTab,
            tabActiveIndex,
            menuClockList,
            menuStatusList,
            isShowFilterClock,
            isShowFilterStatus,
            handleFilterClock,
            handleFilterStatus,
            handleSelectClock,
            handleSelectStatus,
            handleExpandMoreJob,
            handleSelectJob,

            clockText,
            statusText,
            tableData,
            loading,
            checkedResumeNum,
            receivedResumeNum,
            contactedCandidateNum,
            isShowFilterJob,

            stausMenuRef,
            clockMenuRef,
            JobMenuRef,

            activeTab,
            tabList,
            expandTabList,
            TableFilterIcon,
            TableStarIcon,
            ClockIcon,
            ExpandIcon,
            ExpandMoreIcon
        }
    }
})
</script>