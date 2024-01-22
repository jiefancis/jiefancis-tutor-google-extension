import {openAI} from "~components/openai/Openai";
import {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionMessageParam,
    ChatCompletionMessageToolCall
} from "openai/src/resources/chat/completions";
import {chatPrompt, checkResumePrompt} from "~components/openai/AiPrompt";
import OpenAI from "openai";
import {ChatMessage, ChatMessageType} from "~components/flowable/boss/BossChatAgent";
import {ChatMessageType as LPChatMessageType} from "~components/flowable/liepin/chatAgent";

class BossGpt {

    /**
     * 获取回复消息
     * @param candidateIntro  候选人介绍
     * @param companyIntro  公司介绍
     * @param chatMessages  聊天消息
     */
    public getReplyMessage = async (candidateIntro: string, companyIntro: string, chatMessages: ChatMessage[]) => {
        const gptMessages: ChatCompletionMessageParam[] = [];

        gptMessages.push({
            role: 'system',
            content: chatPrompt(candidateIntro, companyIntro),
        });
        let ignoreMessageIndexArray: number[] = [];
        chatMessages.forEach((message: ChatMessage) => {

            if (ignoreMessageIndexArray.indexOf(message.messageItemIndex) === -1 && message.message !== '你撤回了一条消息') {
                ignoreMessageIndexArray.push(message.messageItemIndex);
                gptMessages.push({
                    role: [ChatMessageType.MYSELF_MESSAGE, LPChatMessageType.SEND_MESSAGE].includes(message.sender) ? 'assistant' : 'user',
                    content: message.message,
                });
            }
        });
        const requestBody: ChatCompletionCreateParamsNonStreaming = {
            model: 'gpt-4-1106-preview',
            messages: gptMessages
        }
        console.log('replyMessageRequestBody', requestBody);
        const chatCompletion: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create(requestBody);

        return chatCompletion.choices[0].message.content as string;
    }

    /**
     * 检查简历
     * @param jobTitle  职位名称
     * @param jobRequirement    职位要求
     * @param resume    简历
     */
    public checkResume = async (jobTitle: string, jobRequirement: string, resume: string) => {
        try {
            const gptMessages: ChatCompletionMessageParam[] = [];

            gptMessages.push({
                role: 'system',
                content: checkResumePrompt(),
            });

            gptMessages.push({
                role: 'user',
                content: JSON.stringify({
                    jobTitle: jobTitle,
                    jobRequirement: jobRequirement,
                    resume: resume
                }),
            });

            const requestBody: ChatCompletionCreateParamsNonStreaming = {
                model: 'gpt-4-1106-preview',
                messages: gptMessages,
                tool_choice: "auto",
                tools: [
                    {
                        "type": "function",
                        "function": {
                            "name": "returnResumeResult",
                            "description": "Return the result of filtering the resume",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "isQualified": {
                                        "type": "boolean",
                                        "description": "Check whether the resume meets the screening requirements. true: the resume meets the screening requirements; false: the resume does not meet the screening requirements",
                                    },
                                    "reason": {
                                        "type": "string",
                                        "description": "Summarize the candidate's resume and explain why it meets or doesn't meet"
                                    }
                                }
                            }

                        }
                    }
                ]
            }

            console.log('gpt requestBody', requestBody);

            const chatCompletion: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create(requestBody);

            let toolCall = chatCompletion.choices[0].message.tool_calls[0] as ChatCompletionMessageToolCall;

            if (toolCall.function.name !== 'returnResumeResult') {
                throw new Error('returnResumeResult function not found');
            }

            console.log('gpt checkResume response', toolCall);
            return JSON.parse(toolCall.function.arguments);
        } catch (e) {
            console.error(e);
            return '{}';
        }
    }


    /**
     * 缩减并润色语句
     * @param sentence 语句
     * @param num   限制字数
     */
    public shortenSentence = async (sentence: string, num: string): Promise<string> => {
        try {
            const gptMessages: ChatCompletionMessageParam[] = [];

            gptMessages.push({
                role: 'system',
                content: '将我发送给你的文本(包括标点符号)进行润色并缩减到' + num + '字以内',
            })
            ;

            gptMessages.push({
                role: 'user',
                content: sentence
            });

            const requestBody: ChatCompletionCreateParamsNonStreaming = {
                model: 'gpt-4',
                messages: gptMessages
            }

            console.log('gpt shortenSentence requestBody', requestBody);

            const chatCompletion: OpenAI.Chat.Completions.ChatCompletion = await openAI.chat.completions.create(requestBody);
            console.log('gpt shortenSentence response', chatCompletion);

            return chatCompletion.choices[0].message.content;
        } catch (e) {
            console.error(e);
            return '';
        }
    }

}

export const bossGpt = new BossGpt();
