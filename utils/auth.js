// 商家鉴权工具：登录态管理 + 自动注入
import { STORAGE_KEYS, API_BASE } from './config.js'

// 直接调云端，跳过 api.js 避免循环
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
  return !!uni.getStorageSync(STORAGE_KEYS.MERCHANT_ID)
}

export function getMerchantId() {
  return uni.getStorageSync(STORAGE_KEYS.MERCHANT_ID) || ''
}

export function getToken() {
  return uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''
}

export function logout() {
  uni.removeStorageSync(STORAGE_KEYS.MERCHANT_ID)
  uni.removeStorageSync(STORAGE_KEYS.TOKEN)
  uni.removeStorageSync(STORAGE_KEYS.USER_INFO)
}

// 真实登录：调用云端 merchantLogin（需云端部署）
export async function login(phone, password) {
  const res = await callCloud('merchantLogin', { phone, password })
  if (res.data && res.data.merchantId) {
    uni.setStorageSync(STORAGE_KEYS.MERCHANT_ID, res.data.merchantId)
    if (res.data.token) uni.setStorageSync(STORAGE_KEYS.TOKEN, res.data.token)
    if (res.data.shopInfo) uni.setStorageSync(STORAGE_KEYS.USER_INFO, res.data.shopInfo)
  }
  return res.data
}

// 测试模式：云端无 merchantLogin 时 fallback
// 在控制台 DB 添加一行 merchants 记录后，把 _id 填到这里
export function loginAsTest(merchantId) {
  uni.setStorageSync(STORAGE_KEYS.MERCHANT_ID, merchantId)
  uni.setStorageSync(STORAGE_KEYS.TOKEN, 'test-mode')
  uni.setStorageSync(STORAGE_KEYS.USER_INFO, { name: '测试店铺', mode: 'test' })
}

// 引导用户：跳到登录页（如果没登录）
export function requireLogin() {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}
