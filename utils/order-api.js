// 用户端订单 API
const baseURL = 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api'

const request = (method, params = {}) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseURL}/${method}`,
      method: 'POST',
      data: { method, params },
      success: (res) => {
        if (res.data && res.data.code === 0) {
          resolve(res.data)
        } else {
          reject(res.data || { error: '请求失败' })
        }
      },
      fail: (err) => reject(err)
    })
  })
}

// 获取用户订单列表
export const getMyOrders = (userId) => {
  return request('getOrders', { userId })
}

// 创建订单
export const createOrder = (orderData) => {
  return request('createOrder', orderData)
}

// 更新订单状态（用户端取消等）
export const updateMyOrderStatus = (orderId, status) => {
  return request('updateOrderStatus', { id: orderId, status })
}

// 申请退款
export const applyMyRefund = (orderId, reason) => {
  return request('applyRefund', { id: orderId, reason })
}