// 用户端订单 API
import { request } from './request.js'

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

// ========== 即时通讯 ==========
export const createConversation = (data) => request('createConversation', data)
export const getConversations = (params) => request('getConversations', params)
export const getMessages = (params) => request('getMessages', params)
export const sendMessage = (data) => request('sendMessage', data)
export const markAsRead = (params) => request('markAsRead', params)