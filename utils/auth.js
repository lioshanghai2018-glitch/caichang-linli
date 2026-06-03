// 用户端鉴权工具
import { STORAGE_KEYS, API_BASE } from './config.js'

function callCloud(method, params) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/${method}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''}`
      },
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
  return !!uni.getStorageSync(STORAGE_KEYS.TOKEN)
}

export function getUserId() {
  return uni.getStorageSync(STORAGE_KEYS.USER_ID) || ''
}

export function getToken() {
  return uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''
}

export function logout() {
  uni.removeStorageSync(STORAGE_KEYS.TOKEN)
  uni.removeStorageSync(STORAGE_KEYS.USER_ID)
  uni.removeStorageSync(STORAGE_KEYS.USER_INFO)
}

// 真实登录：uni-id 一键登录（需云端部署）
// uni-id-common 提供的 loginByUniverify 等接口
export async function loginByUniverify() {
  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'univerify',
      success: (loginRes) => {
        // 把 loginRes.authResult 传给云端 uni-id 完成登录
        callCloud('loginByUniverify', { authResult: loginRes.authResult })
          .then(res => {
            if (res.data && res.data.token) {
              uni.setStorageSync(STORAGE_KEYS.TOKEN, res.data.token)
              if (res.data.userInfo) {
                uni.setStorageSync(STORAGE_KEYS.USER_ID, res.data.userInfo._id)
                uni.setStorageSync(STORAGE_KEYS.USER_INFO, res.data.userInfo)
              }
            }
            resolve(res.data)
          })
          .catch(reject)
      },
      fail: reject
    })
  })
  // #endif
  return Promise.reject({ msg: '一键登录仅在 APP 端可用' })
}

// 手机号 + 验证码登录（需云端部署 sendSmsCode / loginBySms）
export async function loginBySms(phone, code) {
  const res = await callCloud('loginBySms', { phone, code })
  if (res.data && res.data.token) {
    uni.setStorageSync(STORAGE_KEYS.TOKEN, res.data.token)
    if (res.data.userInfo) {
      uni.setStorageSync(STORAGE_KEYS.USER_ID, res.data.userInfo._id)
      uni.setStorageSync(STORAGE_KEYS.USER_INFO, res.data.userInfo)
    }
  }
  return res.data
}

export async function sendSmsCode(phone) {
  return callCloud('sendSmsCode', { phone })
}

// 测试模式：跳过登录（仅 H5 / App 开发用，不编译进小程序发布包）
// #ifdef H5 || APP-PLUS
export function loginAsTest(userId) {
  uni.setStorageSync(STORAGE_KEYS.TOKEN, 'test-mode')
  uni.setStorageSync(STORAGE_KEYS.USER_ID, userId || ('test_' + Date.now()))
  uni.setStorageSync(STORAGE_KEYS.USER_INFO, { nickname: '测试用户', mode: 'test' })
}
// #endif

export function requireLogin() {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}
