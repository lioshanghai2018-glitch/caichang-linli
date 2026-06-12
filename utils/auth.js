// 用户端鉴权工具
import { STORAGE_KEYS, API_BASE } from './config.js'
import { request } from './request.js'

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

// 取得当前商家 ID（用户端 IM 用）。
// 单商家场景：先读缓存，没有就调 merchantAutoLogin 拿唯一商家的 _id
let _merchantBootPromise = null
export function getMerchantId() {
  const cached = uni.getStorageSync('merchant_id')
  if (cached) return Promise.resolve(cached)
  if (_merchantBootPromise) return _merchantBootPromise
  _merchantBootPromise = callCloud('merchantAutoLogin', {})
    .then(res => {
      const mid = res && res.data && res.data.merchantId
      if (mid) uni.setStorageSync('merchant_id', mid)
      return mid || ''
    })
    .catch(() => '')
    .finally(() => { _merchantBootPromise = null })
  return _merchantBootPromise
}

export function logout() {
  uni.removeStorageSync(STORAGE_KEYS.TOKEN)
  uni.removeStorageSync(STORAGE_KEYS.USER_ID)
  uni.removeStorageSync(STORAGE_KEYS.USER_INFO)
  // 退出登录不清理 viewer_id:匿名访客标识只用于去重浏览量,跨会话稳定
}

// 匿名访客标识(无登录态时的稳定 ID,用于商品浏览埋点去重)
// 第一次访问时生成,之后存 storage 不变,确保同设备多次访问只算一个访客
export function getOrCreateViewerId() {
  let vid = uni.getStorageSync('viewer_id')
  if (!vid) {
    // 简单的 uuid v4 风格:时间戳 + 随机 hex
    vid = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
    uni.setStorageSync('viewer_id', vid)
  }
  return vid
}

// 记录商品浏览(用户进入商品详情时调用,失败不抛错)
// 同 viewerId + productId + 日期 走云端 _id 唯一约束去重,不会污染访客数
export async function recordProductView(merchantId, productId) {
  if (!merchantId || !productId) return
  const viewerId = getOrCreateViewerId()
  try {
    await request('recordProductView', { merchantId, productId, viewerId })
  } catch (e) {
    // 静默失败:埋点是统计用途,失败不应影响商品详情加载
    console.warn('[recordProductView] failed:', e && e.msg)
  }
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

// ==================== 微信登录 ====================

export async function loginByWeixin(code) {
  const res = await callCloud('loginByWeixin', { code })
  if (res.data && res.data.token) {
    uni.setStorageSync(STORAGE_KEYS.TOKEN, res.data.token)
    uni.setStorageSync(STORAGE_KEYS.TOKEN_EXPIRED, res.data.tokenExpired)
    if (res.data.userInfo) {
      uni.setStorageSync(STORAGE_KEYS.USER_ID, res.data.userInfo._id)
      uni.setStorageSync(STORAGE_KEYS.USER_INFO, res.data.userInfo)
    }
  }
  return res.data
}

export async function bindWxPhone(userId, code) {
  const res = await callCloud('bindWxPhone', { userId, code })
  if (res.data && res.data.userInfo) {
    // 合并场景下 userId 会切换，同步刷新 storage
    uni.setStorageSync(STORAGE_KEYS.USER_ID, res.data.userInfo._id)
    uni.setStorageSync(STORAGE_KEYS.USER_INFO, res.data.userInfo)
  }
  return res.data
}

export async function updateProfile(data) {
  const res = await callCloud('updateProfile', data)
  if (res.data && res.data.userInfo) {
    uni.setStorageSync(STORAGE_KEYS.USER_INFO, res.data.userInfo)
  }
  return res.data
}

export async function getMyUserInfo() {
  const userId = getUserId()
  if (!userId) return null
  const res = await callCloud('getMyUserInfo', { userId })
  if (res.data && res.data.userInfo) {
    uni.setStorageSync(STORAGE_KEYS.USER_INFO, res.data.userInfo)
    return res.data.userInfo
  }
  return null
}

// ==================== 按需登录拦截 ====================

// 统一方法：未登录时弹模态，确认后跳登录页，返回 Promise<boolean>
// 调用方：async onAction() { if (!await requireLogin()) return; ... }
export function requireLogin() {
  if (isLoggedIn()) return Promise.resolve(true)
  return new Promise((resolve) => {
    uni.showModal({
      title: '需要登录',
      content: '该功能需要登录后使用',
      confirmText: '去登录',
      cancelText: '再看看',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/login/index' })
        resolve(false)
      }
    })
  })
}

// 测试模式：跳过登录（仅 H5 / App 开发用，不编译进小程序发布包）
// #ifdef H5 || APP-PLUS
export function loginAsTest(userId) {
  uni.setStorageSync(STORAGE_KEYS.TOKEN, 'test-mode')
  uni.setStorageSync(STORAGE_KEYS.USER_ID, userId || ('test_' + Date.now()))
  uni.setStorageSync(STORAGE_KEYS.USER_INFO, { nickname: '测试用户', mode: 'test' })
}
// #endif
