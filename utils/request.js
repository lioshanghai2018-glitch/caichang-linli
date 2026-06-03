// 统一 API 请求封装（订单、邻里、checkout 等模块共用）
import { API_BASE, STORAGE_KEYS } from './config.js'

/**
 * 通用云函数调用
 * @param {string} method 云函数方法名
 * @param {object} params 请求参数
 * @param {object} options 额外配置 { baseURL }
 * @returns Promise<{code, data, msg}>
 */
export function request(method, params = {}, options = {}) {
  const baseURL = options.baseURL || API_BASE
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseURL}/${method}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''}`
      },
      data: { method, params },
      success: (res) => {
        if (res.data && res.data.code === 0) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // token 失效，提示用户重新登录
          uni.showToast({ title: '请重新登录', icon: 'none' })
          reject(res.data || { msg: '未登录或登录已过期' })
        } else {
          reject(res.data || { msg: '请求失败' })
        }
      },
      fail: (err) => reject({ msg: err.errMsg || '网络错误' })
    })
  })
}

export default { request }
