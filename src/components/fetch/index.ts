import 'whatwg-fetch';
import { TUTOR_TOKEN_UUID } from '~constants/index';
import { Cmd } from '~background/MessageModel'
//https://echo-whisper.shasoapp.com
// 定义 API 基础 URL
const BASE_URL = process.env.PLASMO_PUBLIC_BASE_URL;


// 请求选项的接口定义
interface RequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    headers: HeadersInit;
    body?: string;
}

export interface ApiResult<T> {
    code: number;
    msg: string;
    data: T;
}

/**
 * 带超时的 fetch
 * @param resource  资源
 * @param options   选项
 * @param timeout   超时时间
 */
async function fetchWithTimeout(resource: string, options: RequestOptions, timeout = 180000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

/**
 * 检查响应状态
 * @param response  响应
 */
function checkStatus(response: Response): Response {
    if (response.ok) {
        return response;
    } else {
        throw new Error(response.statusText);
    }
}

/**
 * 解析响应JSON
 * @param response  响应
 */
async function parseJSON(response: Response): Promise<ApiResult<any>> {
    return response.json();
}

/**
 * 检查 API 状态
 * @param apiResult API 结果
 */
async function checkApiStatus(apiResult: ApiResult<any>) {
    if (apiResult.code !== 0) {
        if (apiResult.code === 403) {
            throw new Error(apiResult.msg);
        }
    }
}

/**
 * 记录 token
 * @param response  响应
 */
function recordToken(response: Response) {
    let token = response.headers.get('Tshiring-Token');
    console.log('recordToken', response);
    if (token) {
        localStorage.setItem('Tshiring-Token', token);
    }
}

/**
 * 处理响应
 * @param response  响应
 */
async function handleResponse(response: Response): Promise<ApiResult<any>> {
    let apiResult = await parseJSON(checkStatus(response)) as ApiResult<any>;
    await checkApiStatus(apiResult);
    return apiResult;
}

/**
 * GET 请求的函数
 * @param url   URL
 */
export async function get(url: string) {
    try {
        const uuid = await chrome.runtime.sendMessage({ cmd: Cmd.GET_TUTOR_TOKEN_UUID })
        const response = await fetchWithTimeout(`${BASE_URL}${url}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'ts-user-id': uuid || '123456'
            },
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

/**
 * POST 请求的函数
 * @param url   URL
 * @param data  数据
 */
export async function post(url: string, data: object) {
    try {
        const uuid = await chrome.runtime.sendMessage({ cmd: Cmd.GET_TUTOR_TOKEN_UUID })
        const response = await fetchWithTimeout(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ts-user-id': uuid || '123456',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(data),
        });
        console.log('post---response--eventSource', response)
        return await handleResponse(response);
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

export async function del(url: string, data: object) {
    try {
        const uuid = await chrome.runtime.sendMessage({ cmd: Cmd.GET_TUTOR_TOKEN_UUID })
        const response = await fetchWithTimeout(`${BASE_URL}${url}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'ts-user-id': uuid || '123456',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(data),
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

export async function postStream(url: string, data: object) {
    try {
        const uuid = await chrome.runtime.sendMessage({ cmd: Cmd.GET_TUTOR_TOKEN_UUID })
        const response = await fetchWithTimeout(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ts-user-id': uuid || '123456',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(data),
        });
        console.log('post---response--eventSource', response)
        return response;
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

export async function put(url: string, data: object) {
    try {

        const uuid = await chrome.runtime.sendMessage({ cmd: Cmd.GET_TUTOR_TOKEN_UUID })
        const response = await fetchWithTimeout(`${BASE_URL}${url}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'ts-user-id': uuid || '123456',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data),
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

function base64ToByteArray(base64String) {
    var binaryString =  atob(base64String);
    var byteArray = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }
    return byteArray;
}
/**
 * 上传文件到OBS
 * @param url   URL
 * @param contentMd5    文件内容的md5,读到文件内容的bytes,先转为md5再转为base64
 * @param file  二进制文件
 */
// export async function putFileToObs(url: string, contentMd5: string, file: Blob) {
//     try {
//         // let byteValues = [] as any;
//         // if(typeof file === 'string') {
//         //     const idx = file.indexOf(';base64,')
//         //     byteValues = base64ToByteArray(file.slice(idx + 8))
//         // }
//         // let uint8Array = new Uint8Array(byteValues);
//         // // 转换Uint8Array为ArrayBuffer
//         // let arrayBuffer = uint8Array.buffer;
//         // const blob = new Blob([arrayBuffer]);
//         const response = await fetchWithTimeout(`${url}`, {
//             method: 'PUT',
//             headers: {
//                 'Content-MD5': contentMd5,
//                 // 'Content-Type': 'text/plain',
//                 'Content-Type': 'application/octet-stream'
//             },
//             body: file,
//             redirect: 'follow',
//         });
//         console.log("图片上传 response :",response);

//         if (response.ok) {
//             console.log("图片上传成功 response :",response);
//         } else {
//             console.error("图片上传失败，response ：", response);
//         }
//         checkStatus(response);
//     } catch (error) {
//         console.error('Fetch Error:', error);
//         throw error;
//     }
// }

/**
 * 上传文件到OBS
 * @param url   URL
 * @param contentMd5    文件内容的md5,读到文件内容的bytes,先转为md5再转为base64
 * @param file  二进制文件
 */
export async function putFileToObs(url: string, contentMd5: string, file: Blob) {
    try {
        const response = await fetchWithTimeout(`${url}`, {
            method: 'PUT',
            headers: {
                'Content-MD5': contentMd5,
                'Content-Type': 'application/octet-stream',
            },
            body: file,
        });
        return response
        checkStatus(response);
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}