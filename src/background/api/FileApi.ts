import {FileUploadAuthResult, FileUploadInfo} from "~background/api/Model";
import {ApiResult, post, put, putFileToObs} from "~components/fetch";
import * as crypto from "crypto";
import {Buffer} from "buffer";
import {API_CODE_ENUM as ApiCodeEnum} from "~constants/api";

const TO_BASE64_EXTENSIONS = ["jpg", "jpeg", "png", "gif"];

export class FileApi {

    /**
     * 获取上传地址
     * @param filename  文件名 例如: 1.jpg,上传到服务器的文件名会自动混淆,仅仅用来判断文件类型
     * @param contentMd5 文件内容的md5,读到文件内容的bytes,先转为md5再转为base64
     */
    public async getUploadUrl(filename: string, contentMd5: string): Promise<ApiResult<FileUploadAuthResult>> {
        return await put('/files/upload', {
            filename: filename,
            contentMd5: contentMd5
        });
    }

    /**
     * 上传文件
     * @param fileInfo  文件信息
     */
    public async uploadFile(fileInfo: any ) {
        // 获取文件扩展名
        const fileExtension = this.getFileExtension(fileInfo.filename)

        // 转为buffer
        const buffer = this.bufferFrom(fileInfo, fileExtension);

        // 获取文件的MD5 字节流的Base64编码
        const contentMd5 = fileApi.base64ToMD5ToBase64(buffer);

        // 获取上传地址
        const fileUploadAuthResult = await fileApi.getUploadUrl(fileInfo.filename, contentMd5);

        if (fileUploadAuthResult.code !== ApiCodeEnum.OK) {
            console.error(fileUploadAuthResult.msg);
            return fileUploadAuthResult;
        }

        // 转为blob
        const fileBlob = new Blob([buffer], {type: 'txt' === fileExtension ? 'text/plain;charset=UTF-8' : 'image/' + fileExtension});

        // 上传文件
        const res = await putFileToObs(fileUploadAuthResult.data.uploadUrl, contentMd5, fileBlob)
        console.log('fileUploadAuthResult--putFileToObs', fileUploadAuthResult, res, fileInfo.href, fileInfo.title)
        const resData = await post('/tutor/v1/data', {
            fileId: fileUploadAuthResult.data?.id,
            pageUrl: fileInfo.href,
            tags: [fileInfo.title]
        })
        return fileUploadAuthResult;
    }

    private bufferFrom(fileInfo: any, fileExtension: string) {
        if (TO_BASE64_EXTENSIONS.includes(fileExtension.toLowerCase())) {
            //可以转为base64的后缀名
            return this.imageBase64ToBuffer(fileInfo.base64);
        } else if ('txt' === this.getFileExtension(fileInfo.filename).toLowerCase()) {
            //txt
            return Buffer.from(fileInfo.base64, 'UTF-8');
        }
    }

    /**
     * 判断是否是图片
     * @param filename  文件名
     * @private 私有方法
     */
    private isImage(filename: string) {
        return TO_BASE64_EXTENSIONS.includes(this.getFileExtension(filename).toLowerCase());
    }

    /**
     * 获取文件扩展名
     * @param filename  文件名
     * @private 私有方法
     */
    private getFileExtension(filename: string) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    }

    /**
     * 将Base64编码的图像转换为字节
     * @param base64Image
     * @private 私有方法
     */
    private imageBase64ToBuffer(base64Image: string) {
        // 从Base64字符串中提取纯粹的图像数据（去除前缀）
        const imageData = base64Image.split(',')[1];
        // 将Base64编码的图像转换为字节
        return Buffer.from(imageData, 'base64');
    }

    /**
     * 将字节数据转换为MD5的Base64编码
     * @param buffer    字节数据
     */
    public base64ToMD5ToBase64(buffer: Buffer) {
        // 使用MD5算法加密字节数据
        const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
        // 将MD5的结果转换为Base64编码
        return Buffer.from(md5Hash, 'hex').toString('base64');
    }

    public uploadScreenShot = async (data: {filename: string, base64: string, url?: string, title?: string}) => {
        const res = await fileApi.uploadFile(data)
        console.log('截图base64', res)
    }

}


export const fileApi = new FileApi();
