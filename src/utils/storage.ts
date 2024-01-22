import { Storage } from "@plasmohq/storage"
import { STORE_IS_LOGIN_KEY, STORE_USER_INFO_KEY } from "~constants/index"
 
const storage = new Storage({
    copiedKeyList: [STORE_IS_LOGIN_KEY, STORE_USER_INFO_KEY]
})

export const storageSet = async (key, value) => {
    await storage.set(key, value) 
}

export const storageGet = async (key) => {
    await storage.get(key)
}

export const storageWatch = (options) => {
    storage.watch({
        // "serial-number": (c) => {
        //   console.log(c.newValue)
        // },
        ...options,
        make: (c) => {
          console.log(c.newValue)
        }
      })
}
