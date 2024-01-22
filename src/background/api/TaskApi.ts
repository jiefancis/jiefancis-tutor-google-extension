import {TaskInfo} from "~background/api/Model";
import {get, post} from "~components/fetch";
import {ElMessage} from "element-plus";

class TaskApi {

    public queryJobLabels = async () => {
        const res = await get('/task/labels');
        if (res.code !== 0) {
            throw new Error(res.msg);
        }
        return res.data
    }

    /**
     * 保存任务信息
     * @param task  任务信息
     */
    public saveTask = async (task: TaskInfo) => {
        const apiResult = await post('/task/save', task);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
    }

    /**
     * 删除任务
     * @param id 任务id
     */
    public deleteTask = async (id: number) => {
        const apiResult = await get('/task/delete/' + id);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }


    /**
     * 获取任务列表
     */
    public getTasks = async (data: any) => {
        const apiResult = await post('/task/list', data);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }

    /**
     * 获取任务详情
     * @param id    任务id
     */
    public detailTask = async (id: number) => {
        const apiResult = await get('/task/detail/' + id);
        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }
        return apiResult.data;
    }

}

export const taskApi = new TaskApi();
