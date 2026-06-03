// 邻里社区 API
import { request } from './request.js'

// 分类配置
export const CATEGORIES = [
  { index: 0, name: '全部', apiValue: '' },
  { index: 1, name: '邻里互助', apiValue: 1 },
  { index: 2, name: '手艺服务', apiValue: 2 },
  { index: 3, name: '相约同行', apiValue: 3 },
  { index: 4, name: '相亲交友', apiValue: 4 },
  { index: 5, name: '二手闲置', apiValue: 5 }
]

// ==================== 帖子相关 ====================

// 获取帖子列表
export const getPostList = (params = {}) => {
  return request('getPosts', params)
}

// 获取帖子详情
export const getPostDetail = (params) => {
  return request('getPostDetail', params)
}

// 发布帖子
export const createPost = (postData) => {
  return request('createPost', postData)
}

// 编辑帖子
export const updatePost = (postId, data) => {
  return request('updatePost', { id: postId, ...data })
}

// 删除帖子
export const deletePost = (postId) => {
  return request('deletePost', { id: postId })
}

// 上架/下架帖子
export const togglePostStatus = (postId, status) => {
  return request('togglePostStatus', { id: postId, status })
}

// 获取我的发布
export const getMyPosts = (params = {}) => {
  return request('getMyPosts', params)
}

// ==================== 互动相关 ====================

// 点赞/取消点赞（userId 忽略，由云端从 token 解析）
export const toggleLike = (postId, userId) => {
  return request('toggleLike', { postId })
}

// 关注/取消关注（userId 忽略，由云端从 token 解析）
export const toggleFollow = (targetUserId, userId) => {
  return request('toggleFollow', { targetUserId })
}

// ==================== 评论相关 ====================

// 获取评论列表
export const getComments = (postId, page = 1, pageSize = 20) => {
  return request('getComments', { postId, page, pageSize })
}

// 发表评论（userId 忽略，由云端从 token 解析；authorName 仅作显示用）
export const createComment = (postId, userId, content, authorName) => {
  return request('createComment', { postId, content, authorName })
}

// ==================== 认证相关 ====================

// 获取认证状态（userId 忽略，由云端从 token 解析）
export const getCertStatus = (userId) => {
  return request('getCertStatus', {})
}

// 提交认证申请
export const submitCert = (certData) => {
  return request('submitCert', certData)
}

// 检查是否已认证（userId 忽略，由云端从 token 解析）
export const checkCert = (userId) => {
  return request('checkCert', {})
}

// ==================== 本地认证状态管理 ====================

// 获取本地认证状态
export const getLocalCertStatus = () => {
  return uni.getStorageSync('cert_status') || 'none'
}

// 保存本地认证状态（**不持久化身份证/账单图片 URL**，敏感图片仅在云端存储）
export const saveLocalCertStatus = (status, data = {}) => {
  uni.setStorageSync('cert_status', status)
  if (data.communityName) uni.setStorageSync('cert_community', data.communityName)
  if (data.submitTime) uni.setStorageSync('cert_submit_time', data.submitTime)
  if (data.rejectReason) uni.setStorageSync('cert_reject_reason', data.rejectReason)
}

// 检查是否可以发帖
export const canPublish = () => {
  const status = getLocalCertStatus()
  return status === 'certified'
}

// ==================== 辅助函数 ====================

export const formatRelativeTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return date.toLocaleDateString()
}

// 验证手机号
export const validatePhone = (phone) => {
  return /^1\d{10}$/.test(phone)
}