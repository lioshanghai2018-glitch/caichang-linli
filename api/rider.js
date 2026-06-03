// 骑手相关API - 使用云函数URL化调用
const BASE_URL = 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api'

const request = (method, params = {}) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}/${method}`,
      method: 'POST',
      // 云函数冷启动慢，给到 30s；默认 10s 会 timeout
      timeout: 30000,
      data: { params },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          resolve(res.data)
        } else {
          console.error('[riderApi] 请求失败:', method, res.statusCode, res.data)
          uni.showToast({ title: res.data?.msg || '请求失败', icon: 'none' })
          reject(res.data)
        }
      },
      fail: (err) => {
        console.error('[riderApi] 网络错误:', method, err)
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

const riderApi = {
  // 骑手登录
  login(phone, password) {
    return request('riderLogin', { phone, password })
  },

  // 获取骑手待配送订单（待取货）
  getOrders(riderId) {
    return request('riderGetOrders', { riderId, deliveryStatus: 'accepted' })
  },

  // 抢单池：商家已确认分拣、待骑手接单的订单（按 merchantId 过滤）
  getAvailableOrders(merchantId) {
    return request('riderGetAvailableOrders', { merchantId })
  },

  // 骑手抢单：把订单分配给自己
  claimOrder(orderId, riderId) {
    return request('riderClaimOrder', { orderId, riderId })
  },

  // 老骑手账号没有 merchantId，按 phone 自动反推补上（一次性脚本）
  fixRiderMerchantId(phone) {
    return request('fixRiderMerchantId', { phone })
  },

  // 获取骑手配送中的订单
  getDeliveringOrders(riderId) {
    return request('riderGetOrders', { riderId, deliveryStatus: 'delivering' })
  },

  // 获取骑手已完成订单
  getCompletedOrders(riderId) {
    return request('riderGetOrders', { riderId, deliveryStatus: 'completed' })
  },

  // 获取骑手配送记录（全部）
  getRecord(riderId) {
    return request('riderGetOrders', { riderId })
  },

  // 骑手更新配送状态
  updateStatus(orderId, deliveryStatus) {
    return request('riderUpdateStatus', { orderId, deliveryStatus })
  },

  // 骑手切换在线状态
  toggleStatus(riderId, riderStatus) {
    return request('riderToggleStatus', { riderId, riderStatus })
  },

  // 骑手修改密码
  changePassword(riderId, oldPassword, newPassword) {
    return request('riderChangePassword', { riderId, oldPassword, newPassword })
  }
}

export default riderApi