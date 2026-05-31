// API 基地址
const BASE_URL = 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api'

// 统一请求方法
const request = (method, params = {}) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}/${method}`,
      method: 'POST',
      data: { method, params },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.data && res.data.code === 0) {
          resolve(res.data)
        } else {
          reject(res.data || { msg: '请求失败' })
        }
      },
      fail: (err) => reject(err)
    })
  })
}

// ========== 订单相关 ==========
export const getOrders = (params = {}) => request('getOrders', params)
export const createOrder = (data) => request('createOrder', data)
export const updateOrderStatus = (id, status) => request('updateOrderStatus', { id, status })
export const applyRefund = (id, reason) => request('applyRefund', { id, reason })
export const processRefund = (id, refundAmount, action) => request('processRefund', { id, refundAmount, action })
export const deleteOrder = (id) => request('deleteOrder', { id })

// ========== 骑手相关 ==========
export const getRiders = () => request('getRiders', {})
export const addRider = (data) => request('addRider', data)
export const updateRider = (id, data) => request('updateRider', { id, ...data })
export const deleteRider = (id) => request('deleteRider', { id })
export const assignOrder = (orderId, riderId) => request('assignOrder', { orderId, riderId })
export const autoAssignOrders = () => request('autoAssignOrders', {})

// ========== 小区相关 ==========
export const getCommunities = () => request('getCommunities', {})
export const addCommunity = (data) => request('addCommunity', data)
export const updateCommunity = (id, data) => request('updateCommunity', { id, ...data })
export const deleteCommunity = (id) => request('deleteCommunity', { id })

// ========== 商品相关 ==========
export const getProducts = (params = {}) => request('getProducts', params)
export const addProduct = (data) => request('addProduct', data)
export const updateProduct = (id, data) => request('updateProduct', { id, ...data })
export const deleteProduct = (id) => request('deleteProduct', { id })

// 图片上传（通过云存储）
export const uploadImage = (filePath) => {
  return new Promise((resolve, reject) => {
    uniCloud.uploadFile({
      filePath: filePath,
      cloudPath: `products/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
      success: (res) => {
        resolve({ fileID: res.fileID })
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// ========== 分类相关 ==========
export const getCategories = () => request('getCategories', {})
export const addCategory = (data) => request('addCategory', data)
export const updateCategory = (id, data) => request('updateCategory', { id, ...data })
export const deleteCategory = (id) => request('deleteCategory', { id })

// ========== 特惠相关 ==========
export const getFlashSale = () => request('getFlashSale', {})
export const saveFlashSale = (data) => request('saveFlashSale', data)
export const getFlashSaleProducts = (params) => request('getFlashSaleProducts', params)
export const addFlashSaleProduct = (data) => request('addFlashSaleProduct', data)
export const updateFlashSaleProduct = (id, data) => request('updateFlashSaleProduct', { id, ...data })
export const deleteFlashSaleProduct = (id) => request('deleteFlashSaleProduct', { id })

// ========== 帖子相关 ==========
export const getPosts = (params = {}) => request('getPosts', params)
export const togglePostStatus = (id, status, blockReason) => request('togglePostStatus', { id, status, blockReason })
export const deletePost = (id) => request('deletePost', { id })

// ========== 认证相关 ==========
export const getCerts = () => request('getCerts', {})
export const approveCert = (id) => request('approveCert', { id })
export const rejectCert = (id, reason) => request('rejectCert', { id, rejectReason: reason })
export const revokeCert = (userId) => request('revokeCert', { userId })

// ========== 即时通讯 ==========
export const createConversation = (data) => request('createConversation', data)
export const getConversations = (params) => request('getConversations', params)
export const getMessages = (params) => request('getMessages', params)
export const sendMessage = (data) => request('sendMessage', data)
export const markAsRead = (params) => request('markAsRead', params)