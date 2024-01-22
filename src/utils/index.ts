export * from '~utils/is'
export { default as Message }  from '~utils/message'
export { default as CreateLoading } from '~utils/loading'
export * from '~utils/localStorage'
export * from '~utils/storage'
export * from '~utils/time'

export const sleep = async (time) => {
    return new Promise(resolve => {
        setTimeout(resolve, time)
    })
}