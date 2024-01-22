import browser from "webextension-polyfill";
export const nameBuilder = (prefix, name) => (prefix ? `${prefix}--${name}` : name);

export function sendMessage(name = '', data = {}, prefix = '') {
    let payload = {
      name: nameBuilder(prefix, name),
      data,
    };
  
    return browser.runtime.sendMessage(payload);
}


class MessageListener{
    listeners: Object
    prefix: String
    constructor(prefix = '') {
        this.listeners = {}
        this.prefix = prefix
    }

    on(eventName, callback) {
        const name = nameBuilder(this.prefix, eventName)
        this.listeners[name] = callback
        return this.on
    }

    listener() {
        return this.listen.bind(this)
    }
    listen(message, sender, sendResponse) {
        const evName = message?.event;
        const callback = this.listeners[evName];
        callback(message, sender, sendResponse)
    }
}

export default MessageListener