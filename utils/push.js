// uniPush 客户端注册（骑手端）
import { API_BASE, STORAGE_KEYS } from './config.js'

const PUSH_CLIENT_ID_KEY = 'push_client_id'

function callCloud(method, params) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/${method}`,
      method: 'POST',
      data: { method, params },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 0) {
          resolve(res.data)
        } else {
          reject(res.data || { msg: '请求失败' })
        }
      },
      fail: (err) => reject({ msg: err.errMsg || '网络错误' })
    })
  })
}

export async function initPush() {
  // #ifdef APP-PLUS
  return new Promise((resolve) => {
    uni.getPushClientId({
      provider: 'unipush',
      success: async (res) => {
        const clientId = res.clientId
        uni.setStorageSync(PUSH_CLIENT_ID_KEY, clientId)
        try {
          const riderId = uni.getStorageSync(STORAGE_KEYS.RIDER_ID)
          if (riderId) {
            await callCloud('registerPushClientId', {
              clientId,
              role: 'rider',
              roleId: riderId
            })
          }
          resolve(clientId)
        } catch (e) {
          resolve(clientId)
        }
      },
      fail: () => resolve(null)
    })
  })
  // #endif
  return Promise.resolve(null)
}

export function onPushMessage(handler) {
  // #ifdef APP-PLUS
  uni.onPushMessage((res) => {
    handler(res)
    if (res && res.payload && res.payload.page) {
      uni.reLaunch({ url: res.payload.page })
    }
  })
  // #endif
}
