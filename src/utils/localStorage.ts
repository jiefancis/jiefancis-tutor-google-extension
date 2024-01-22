import { STORE_LIEPIN_CURRENT_CONVERSACTIONID } from '~constants/index';

export const storeActiveConversationId = (conversactionId) => localStorage.setItem(STORE_LIEPIN_CURRENT_CONVERSACTIONID, JSON.stringify(conversactionId))

export const getStoreActiveConversationId = () => {
    const id = localStorage.getItem(STORE_LIEPIN_CURRENT_CONVERSACTIONID)
    return id && JSON.parse(id)
}