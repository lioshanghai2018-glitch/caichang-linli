// uniPush 客户端注册
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

// 启动时调用：注册推送 clientId
export async function initPush() {
  // #ifdef APP-PLUS
  return new Promise((resolve) => {
    uni.getPushClientId({
      provider: 'unipush',
      success: async (res) => {
        const clientId = res.clientId
        uni.setStorageSync(PUSH_CLIENT_ID_KEY, clientId)
        try {
          const merchantId = uni.getStorageSync(STORAGE_KEYS.MERCHANT_ID)
          if (merchantId) {
            await callCloud('registerPushClientId', {
              clientId,
              role: 'merchant',
              roleId: merchantId
            })
          }
          resolve(clientId)
        } catch (e) {
          console.warn('注册推送 clientId 失败', e)
          resolve(clientId)
        }
      },
      fail: (err) => {
        console.warn('获取 push clientId 失败', err)
        resolve(null)
      }
    })
  })
  // #endif
  // #ifndef APP-PLUS
  return Promise.resolve(null)
  // #endif
}

// 监听推送点击
export function onPushMessage(handler) {
  // #ifdef APP-PLUS
  uni.onPushMessage((res) => {
    handler(res)
  })
  // #endif
}
