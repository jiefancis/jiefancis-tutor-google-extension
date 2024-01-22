import {themeColor} from "~GlobalVar";
import {Cmd, ResponseMessage} from "~background/MessageModel";
import html2canvas from "html2canvas";
import {FileUploadInfo} from "~background/api/Model";
import {Document} from "postcss";

/**
 * 点击元素
 * @param element  元素
 */
export const clickElement = async (element: HTMLElement) => {
    await clickElementHighlight(element, 3, 3);
}

/**
 * 点击元素
 * @param element   元素
 * @param sleepOn   休眠时机    0:不休眠 1:点击前休眠 2:点击后休眠 3:点击前后休眠
 * @param highlight 高亮方式    0:不高亮 1:操作前高亮 2:操作后高亮 3:操作前后高亮
 */
export const clickElementHighlight = async (element: HTMLElement, sleepOn: number, highlight: number, dispatchAble: Boolean = true) => {
    if (element) {
        //console.log('clickElement', element);
        if (highlight === 1 || highlight === 3) {
            highlightElement(element, true);
        }
        if (sleepOn === 1 || sleepOn === 3) {
            await sleep(getRandomInt(300, 500));
        }

        element.click();
        if (dispatchAble) {
            element.dispatchEvent(new Event('click', {bubbles: true}));
        }

        if (sleepOn === 2 || sleepOn === 3) {
            await sleep(getRandomInt(300, 500));
        }
        if (highlight === 1) {
            highlightElement(element, false);
        }

        if (highlight === 2) {
            highlightElement(element, true);
        }
    }
};

/**
 * 点击元素
 * @param element   元素
 * @param sleepOn   休眠时机    0:不休眠 1:点击前休眠 2:点击后休眠 3:点击前后休眠
 * @param highlight 高亮方式    0:不高亮 1:操作前高亮 2:操作后高亮 3:操作前后高亮
 */
export const remoteClickElementHighlight = async (element: HTMLElement, sleepOn: number, highlight: number) => {
    if (element) {
        //console.log('clickElement', element);
        if (highlight === 1 || highlight === 3) {
            highlightElement(element, true);
        }
        if (sleepOn === 1 || sleepOn === 3) {
            await sleep(getRandomInt(3000, 5000));
        }
        const rect = element.getBoundingClientRect();
        await chrome.runtime.sendMessage(new ResponseMessage(Cmd.DOM_CLICK, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        }));
        if (sleepOn === 2 || sleepOn === 3) {
            await sleep(getRandomInt(3000, 5000));
        }
        if (highlight === 2 || highlight === 3) {
            highlightElement(element, false);
        }
    }
};


/**
 * 输入文本
 * @param element   元素
 * @param text  文本
 */
export const inputElement = async (element: HTMLDivElement | HTMLInputElement | HTMLTextAreaElement, text: string) => {
    await sleep(getRandomInt(1000, 3000));
    if (element instanceof HTMLDivElement) {
        highlightElement(element, true);
        element.textContent = text;
    } else {
        highlightElement(element, true);
        element.focus();
        element.value = text;
        // 有些网站会监听input事件做一些事情, 派发事件, 且遵循事件的冒泡机制
        element.dispatchEvent(new Event('input', {bubbles: true}));
        //chooseElement(element, false);
    }
}


/**
 * 高亮元素
 * @param element   元素
 * @param choose    是否高亮
 */
const highlightElement = (element: HTMLElement, choose: boolean) => {
    if (choose) {
        element.style.borderTop = '6px solid ' + themeColor;
        element.style.borderLeft = '2px solid ' + themeColor
        element.style.borderRight = '2px solid ' + themeColor
        element.style.borderBottom = '2px solid ' + themeColor
    } else {
        element.style.borderTop = 'none';
        element.style.borderLeft = 'none';
        element.style.borderRight = 'none';
        element.style.borderBottom = 'none';
    }
};


/**
 * 自旋
 * @param maxAttempts 最大尝试次数
 * @param intervalMillis 时间间隔（毫秒）
 * @param conditionFn 自旋条件函数
 */
export const spinUntilConditionMet = (maxAttempts: number, intervalMillis: number, conditionFn: () => boolean) => {
    let attempts = 0;
    const intervalId = setInterval(() => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(intervalId);
            return;
        }
        if (conditionFn()) {
            clearInterval(intervalId);
            return;
        }
    }, intervalMillis);
}

/**
 * 获取随机数
 * @param min   最小值
 * @param max   最大值
 * @private {number}
 */
export const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))


/**
 * 通过xpath获取dom元素节点
 */
export const getElementByXPath = (xpath: string) => {
    if (xpath) {
        const res = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        return res?.iterateNext?.();
    }
}

export const setFormElementValue = (element: HTMLElement, value: string) => {
    try {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter && prototypeValueSetter.call(element, value);
        } else {
            if (valueSetter) {
                valueSetter.call(element, value);
            } else if (prototypeValueSetter) {
                prototypeValueSetter.call(element, value);
            }
        }
        element.dispatchEvent(new Event('input', {bubbles: true}));
    } catch (error) {

    }
}

/**
 * 截图并上传
 * @param dom  文档
 * @param filename  文件名 上传到服务器的文件名会自动混淆
 * @param element   元素
 */
export const captureElementAndUpload = async (dom: Document, filename: string, element: HTMLElement) => {
    /*{
        backgroundColor: "white",
            useCORS: true,
        scale: 1,
        width: dom.offsetWidth,
        height: dom.scrollHeight,
        windowHeight: dom.scrollHeight,
        windowWidth: dom.offsetWidth,
    }*/
    return await html2canvas(element).then(async canvas => {
        return await chrome.runtime.sendMessage(new ResponseMessage(Cmd.SERVER_FILE_UPLOAD,
            new FileUploadInfo(filename, canvas.toDataURL('image/png')))) as string;
    })
};
