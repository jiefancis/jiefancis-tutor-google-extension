import {ChatMessage} from "~/components/flowable/boss/BossChatAgent";


const CHAT_MESSAGE_STORE_KEY = 'agent.chatMessages';

export class ConversationStatus {

    static readonly UN_CHECK = 'uncheck';

    static readonly CHECKING = 'checking';

    static readonly SUITABLE = 'suitable';

    static readonly UNSUITABLE = 'unsuitable';
}

export class ConversationModel {

    public id: string;

    public candidateIntro: string;

    public status: string = ConversationStatus.CHECKING;

    public messages: ChatMessage[];


    constructor(id: string, messages: ChatMessage[]) {
        this.id = id;
        this.messages = messages;
    }
}

export const addChatMessage = (id: string, messageItemIndex: number, messageIndex: number, chatMessage: ChatMessage) => {
    let mapJson = localStorage.getItem(CHAT_MESSAGE_STORE_KEY);
    let map;
    if (mapJson === null) {
        map = new Map<string, ConversationModel>();
    } else {
        map = JSON.parse(mapJson, reviver);
    }

    if (!map.has(id)) {
        map.set(id, new ConversationModel(id, [] as ChatMessage[]));
    }
    let messages = (map.get(id) as ConversationModel).messages;
    for (let message of messages) {
        if (message.messageItemIndex === messageItemIndex && message.messageIndex == messageIndex) {
            // 消息已存在，不再重复添加
            return false;
        }
    }
    messages.push(chatMessage);
    localStorage.setItem(CHAT_MESSAGE_STORE_KEY, JSON.stringify(map, replacer));
    return true;
}

export const getChatMessages = (id: string): ChatMessage[] => {
    let mapJson = localStorage.getItem(CHAT_MESSAGE_STORE_KEY);
    if (mapJson === null) {
        return [] as ChatMessage[];
    }
    let map = JSON.parse(mapJson, reviver);
    if (!map.has(id)) {
        return [] as ChatMessage[];
    }
    return (map.get(id) as ConversationModel).messages;
}

export const getConversation = (id: string): ConversationModel => {
    let mapJson = localStorage.getItem(CHAT_MESSAGE_STORE_KEY);
    if (mapJson === null) {
        return new ConversationModel(id, [] as ChatMessage[]);
    }
    let map = JSON.parse(mapJson, reviver);
    if (!map.has(id)) {
        return new ConversationModel(id, [] as ChatMessage[]);
    }
    return map.get(id) as ConversationModel;
}
export const getConversationStatus = (id: string): string => {
    let mapJson = localStorage.getItem(CHAT_MESSAGE_STORE_KEY);
    if (mapJson === null) {
        return ConversationStatus.UN_CHECK;
    }
    let map = JSON.parse(mapJson, reviver);
    if (!map.has(id)) {
        return ConversationStatus.UN_CHECK;
    }
    return (map.get(id) as ConversationModel).status;
}

export const setConversationStatus = (id: string, status: string) => {
    let mapJson = localStorage.getItem(CHAT_MESSAGE_STORE_KEY);
    let map;
    if (mapJson === null) {
        map = new Map<string, ConversationModel>();
    } else {
        map = JSON.parse(mapJson, reviver);
    }

    if (!map.has(id)) {
        map.set(id, new ConversationModel(id, [] as ChatMessage[]));
    }
    (map.get(id) as ConversationModel).status = status;
    localStorage.setItem(CHAT_MESSAGE_STORE_KEY, JSON.stringify(map, replacer));
}

export const setConversationCandidateIntro = (id: string, candidateIntro: string) => {
    let mapJson = localStorage.getItem(CHAT_MESSAGE_STORE_KEY);
    let map;
    if (mapJson === null) {
        map = new Map<string, ConversationModel>();
    } else {
        map = JSON.parse(mapJson, reviver);
    }

    if (!map.has(id)) {
        map.set(id, new ConversationModel(id, [] as ChatMessage[]));
    }
    (map.get(id) as ConversationModel).candidateIntro = candidateIntro;
    localStorage.setItem(CHAT_MESSAGE_STORE_KEY, JSON.stringify(map, replacer));
};
const replacer = (key: string, value: any) => {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()),
        };
    } else {
        return value;
    }
}

const reviver = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}
