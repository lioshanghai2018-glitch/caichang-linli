// 用户端订单 API
import { request } from './request.js'

// ========== 即时通讯 ==========
export const createConversation = (data) => request('createConversation', data)
export const getMessages = (params) => request('getMessages', params)
export const sendMessage = (data) => request('sendMessage', data)