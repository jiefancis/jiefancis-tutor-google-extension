import {post} from "~components/fetch";
import {SendVerifyCodeTypeEnum} from "~constants";

class AuthApi {

    /**
     * 发送验证码
     * @param phone 手机号
     */

    public sendVerifyCode = async (phone: string): Promise<string> => {
        const apiResult = await post('/auth/sendVerifyCode', {
            type: SendVerifyCodeTypeEnum.LOGIN,
            phone: phone
        });

        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }

        return apiResult.data;
    }
    /**
     * 登录
     * @param phone     手机号
     * @param verifyCode    验证码
     */
    public login = async (phone: string, verifyCode: string) => {

        let apiResult = await post('/auth/login', {
            phone: phone,
            verifyCode: verifyCode
        });

        if (apiResult.code !== 0) {
            throw new Error(apiResult.msg);
        }

        chrome.storage.local.set({
            'Tshiring-Token': apiResult.data.token
        });
    };

}

export const authApi = new AuthApi();
