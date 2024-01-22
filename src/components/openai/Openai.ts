import OpenAI from "openai/index";

export const openAI = new OpenAI({
    baseURL: 'http://110.238.84.194:1001/v1',
    apiKey: '',
    timeout: 60000,
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
});
