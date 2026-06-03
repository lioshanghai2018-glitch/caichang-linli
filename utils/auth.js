// 骑手端鉴权工具
import { STORAGE_KEYS, API_BASE } from './config.js'

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

export function isLoggedIn() {
  return !!uni.getStorageSync(STORAGE_KEYS.RIDER_ID)
}

export function getRiderId() {
  return uni.getStorageSync(STORAGE_KEYS.RIDER_ID) || ''
}

export function logout() {
  uni.removeStorageSync(STORAGE_KEYS.RIDER_ID)
  uni.removeStorageSync(STORAGE_KEYS.TOKEN)
  uni.removeStorageSync(STORAGE_KEYS.RIDER_INFO)
}

// 真实登录：riderLogin（云端已有）
export async function login(phone, password) {
  const res = await callCloud('riderLogin', { phone, password })
  // callCloud 返回的是 res.data 整体（已是 {code:0, data:{riderId,...}}）
  // 再解一层拿到真正的骑手数据
  const riderData = (res && res.data) ? res.data : res
  if (riderData && riderData.riderId) {
    uni.setStorageSync(STORAGE_KEYS.RIDER_ID, riderData.riderId)
    uni.setStorageSync(STORAGE_KEYS.RIDER_INFO, riderData)
    if (riderData.token) uni.setStorageSync(STORAGE_KEYS.TOKEN, riderData.token)
    return riderData
  }
  throw new Error('登录返回数据格式异常')
}

export function requireLogin() {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}
