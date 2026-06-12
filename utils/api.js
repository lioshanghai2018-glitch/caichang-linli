// 商家APP API（URL 化调用，4 端共用同一云对象）
import { API_BASE, STORAGE_KEYS } from './config.js'

// 自动 bootstrap：用唯一商家免登录（仅单商家场景有效）
let _bootstrapPromise = null
function autoBootstrapMerchant() {
  if (_bootstrapPromise) return _bootstrapPromise
  _bootstrapPromise = new Promise((resolve) => {
    uni.request({
      url: `${API_BASE}/merchantAutoLogin`,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { method: 'merchantAutoLogin', params: {} },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
          const d = res.data.data
          if (d.merchantId) uni.setStorageSync(STORAGE_KEYS.MERCHANT_ID, d.merchantId)
          if (d.token) uni.setStorageSync(STORAGE_KEYS.TOKEN, d.token)
          if (d.shopInfo) uni.setStorageSync(STORAGE_KEYS.USER_INFO, d.shopInfo)
          resolve(true)
        } else {
          resolve(false)
        }
      },
      fail: () => resolve(false)
    })
  })
  return _bootstrapPromise
}

// 基础请求封装：自动从 storage 注入 token / merchantId
async function request(method, params = {}) {
  let merchantId = uni.getStorageSync(STORAGE_KEYS.MERCHANT_ID)

  // 单商家场景：storage 没 merchantId 时自动 bootstrap（避免硬编码 ID）
  if (!merchantId && !params.merchantId) {
    await autoBootstrapMerchant()
    merchantId = uni.getStorageSync(STORAGE_KEYS.MERCHANT_ID)
  }

  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)

    const finalParams = { ...params }
    if (merchantId && !finalParams.merchantId) {
      finalParams.merchantId = merchantId
    }
    if (token) {
      finalParams.token = token
    }

    uni.request({
      url: `${API_BASE}/${method}`,
      method: 'POST',
      timeout: 30000,
      header: {
        'content-type': 'application/json',
        'uni-id-token': token || ''
      },
      data: { method, params: finalParams },
      success: (res) => {
        // APP 端有时 res.data 是字符串（content-type 未触发自动 JSON 解析），兜底 parse
        let body = res.data
        if (typeof body === 'string') {
          try { body = JSON.parse(body) } catch (e) { body = null }
        }
        if (res.statusCode === 200 && body && body.code === 0) {
          resolve(body)
        } else if (body && body.code === -1) {
          reject(body)
        } else {
          reject(body || { msg: '请求失败' })
        }
      },
      fail: (err) => reject({ msg: err.errMsg || '网络错误' })
    })
  })
}

// ==================== 看板 ====================
export const getDashboard = (timeFilter = 'today', customDate = '') =>
  request('getDashboard', { timeFilter, customDate })

export const getReportData = (timeFilter = 'today', customDate = '') =>
  request('getReportData', { timeFilter, customDate })

// ==================== 订单 ====================
export const getOrders = (params = {}) =>
  request('getOrders', params)

export const getOrderDetail = (orderNo) =>
  request('getOrderDetail', { orderNo })

export const updateOrderStatus = (orderNo, status, extraData = {}) =>
  request('updateOrderStatus', { orderNo, status, ...extraData })

// 分配骑手（与用户端/骑手端同名，align assignOrder）
export const assignRider = (orderNo, riderId) =>
  request('assignOrder', { orderNo, riderId })

// ==================== 商品 ====================
export const getProducts = (params = {}) =>
  request('getProducts', params)

export const createProduct = (productData) =>
  request('addProduct', productData)

export const updateProduct = (productId, updateData) =>
  request('updateProduct', { id: productId, ...updateData })

export const toggleProductStatus = (productId, status) =>
  request('updateProduct', { id: productId, status })

export const getProductDetail = (productId) =>
  request('getProductDetail', { id: productId })

export const deleteProduct = (productId) =>
  request('deleteProduct', { id: productId })

// ==================== 分类 ====================
export const getCategories = () =>
  request('getCategories')

export const addCategory = (data) =>
  request('addCategory', data)

export const updateCategory = (id, data) =>
  request('updateCategory', { id, ...data })

export const deleteCategory = (id) =>
  request('deleteCategory', { id })

// ==================== 特惠（与 getFlashSale 对齐） ====================
export const getFlashSale = (params = {}) =>
  request('getFlashSale', params)

export const saveFlashSale = (data) =>
  request('saveFlashSale', data)

export const getFlashSaleProducts = (params = {}) =>
  request('getFlashSaleProducts', params)

export const addFlashSaleProduct = (data) =>
  request('addFlashSaleProduct', data)

export const updateFlashSaleProduct = (id, data) =>
  request('updateFlashSaleProduct', { id, ...data })

export const deleteFlashSaleProduct = (id) =>
  request('deleteFlashSaleProduct', { id })

// 兼容旧名：商家APP 旧 mock 叫 getActivities / createActivity
export const getActivities = () => request('getFlashSale')
export const createActivity = (data) => request('saveFlashSale', data)

// ==================== 骑手 ====================
export const getRiders = () => request('getRiders')
export const addRider = (data) => request('addRider', data)
export const deleteRider = (id) => request('deleteRider', { id })

// ==================== 小区 ====================
export const getCommunities = () => request('getCommunities')
export const addCommunity = (data) => request('addCommunity', data)
export const updateCommunity = (id, data) => request('updateCommunity', { id, ...data })
export const deleteCommunity = (id) => request('deleteCommunity', { id })

// ==================== 客服消息 ====================
export const getConversations = (params = {}) => request('getConversations', params)
export const createConversation = (data) => request('createConversation', data)
export const updateConversation = (data) => request('updateConversation', data)
export const getMessages = (params = {}) => request('getMessages', params)
export const sendMessage = (data) => request('sendMessage', data)
export const markAsRead = (params) => request('markAsRead', params)

// ==================== 认证审核（商家端）====================
export const listCertifications = (params = {}) => request('listCertifications', params)
export const reviewCert = (id, action, rejectReason = '') => request('checkCert', { id, action, rejectReason })

// ==================== 贴子管理（商家端）====================
export const listAllPosts = (params = {}) => request('listAllPosts', params)
export const operatePost = (id, action, reason = '') => request('adminOperatePost', { id, action, reason })

// ==================== 邻里分类管理（商家端）====================
export const listNeighborCategories = () => request('listNeighborCategories')
export const createNeighborCategory = (name, sort = 0) => request('createNeighborCategory', { name, sort })
export const updateNeighborCategory = (id, data) => request('updateNeighborCategory', { id, ...data })
export const deleteNeighborCategory = (id) => request('deleteNeighborCategory', { id })

// ==================== 退款审核（商家端）====================
// status: 'all' | 'pending' | 'approved' | 'rejected'
export const listRefunds = (status = 'all') => request('listRefunds', { status })
export const processRefund = (id, action, refundAmount = 0, rejectReason = '') =>
  request('processRefund', { id, action, refundAmount, rejectReason })

// ==================== 文件上传（通过云函数中转，避免真机 OSS 域名白名单问题）====================
export const uploadImageBase64 = (fileData, cloudPath) =>
  request('uploadImageBase64', { fileData, cloudPath })

// ==================== 默认导出：request ====================
export default request
