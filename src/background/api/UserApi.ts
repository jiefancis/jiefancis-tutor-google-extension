import {get, post} from "~components/fetch";
class UserApi {
    private SUCCESS_CODE = 0
    public handleResponse(res) {
        if (res.code !== this.SUCCESS_CODE) {
            throw new Error(res.msg);
        }
        return res?.data || true
    }
    // 获取用户信息
    public getUserInfo = async () => {
        const res = await get('/user/info');
        return this.handleResponse(res)
    }

    // 保存用户信息
    public saveUserInfo = async (data) => {
        const res = await post('/user/info', data)

        return this.handleResponse(res)
    }
}

const userApi = new UserApi();
export default userApi;
