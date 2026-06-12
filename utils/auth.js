// 骑手端鉴权工具
import { STORAGE_KEYS, API_BASE } from './config.js'

function callCloud(method, params) {
  const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
  const header = {}
  if (token) header['uni-id-token'] = token

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/${method}`,
      method: 'POST',
      header,
      data: { method, params },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 0) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          logout()
          uni.reLaunch({ url: '/pages/login/index' })
          reject({ msg: '登录已过期' })
        } else {
          reject(res.data || { msg: '请求失败' })
        }
      },
      fail: (err) => reject({ msg: err.errMsg || '网络错误' })
    })
  })
}

export function isLoggedIn() {
  const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
  const expired = uni.getStorageSync(STORAGE_KEYS.TOKEN_EXPIRED)
  if (!token) return false
  if (expired && Date.now() > Number(expired)) {
    logout()
    return false
  }
  return !!uni.getStorageSync(STORAGE_KEYS.RIDER_ID)
}

export function getRiderId() {
  return uni.getStorageSync(STORAGE_KEYS.RIDER_ID) || ''
}

export function logout() {
  uni.removeStorageSync(STORAGE_KEYS.RIDER_ID)
  uni.removeStorageSync(STORAGE_KEYS.TOKEN)
  uni.removeStorageSync(STORAGE_KEYS.TOKEN_EXPIRED)
  uni.removeStorageSync(STORAGE_KEYS.RIDER_INFO)
}

export async function login(phone, password) {
  const res = await callCloud('riderLogin', { phone, password })
  const riderData = (res && res.data) ? res.data : res
  if (riderData && riderData.riderId) {
    uni.setStorageSync(STORAGE_KEYS.RIDER_ID, riderData.riderId)
    uni.setStorageSync(STORAGE_KEYS.RIDER_INFO, riderData)
    if (riderData.token) uni.setStorageSync(STORAGE_KEYS.TOKEN, riderData.token)
    if (riderData.tokenExpired) uni.setStorageSync(STORAGE_KEYS.TOKEN_EXPIRED, String(riderData.tokenExpired))
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