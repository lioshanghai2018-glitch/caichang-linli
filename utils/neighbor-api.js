// 邻里社区 API
import { request } from './request.js'
import { API_BASE, STORAGE_KEYS } from './config.js'

// 分类配置(硬编码兜底,云端为空时使用;正常情况下从云端拉)
export const CATEGORIES = [
  { index: 0, name: '全部', apiValue: '' },
  { index: 1, name: '邻里互助', apiValue: 1 },
  { index: 2, name: '手艺服务', apiValue: 2 },
  { index: 3, name: '相约同行', apiValue: 3 },
  { index: 4, name: '相亲交友', apiValue: 4 },
  { index: 5, name: '二手闲置', apiValue: 5 }
]

// 拉取云端分类(从商家后台管理),带本地缓存
export function getNeighborCategories() {
  return request('listNeighborCategories')
}

const CAT_STORAGE_KEY = 'neighbor_categories_cache'

// 同步读缓存(没缓存返回 null,调用方自行兜底)
export function loadCachedCategories() {
  return uni.getStorageSync(CAT_STORAGE_KEY) || null
}

// 每次直接从云端拉(不再写入本地存储,避免商家后台新增后用户端看不到)
// 返回值约定:
//   - 成功(包含空列表)→ 返回数组(调用方直接用)
//   - 失败 → 返回 null(调用方决定是否回退到缓存/兜底)
export async function refreshCategories() {
  try {
    const res = await getNeighborCategories()
    return (res.data && res.data.list) || []
  } catch (e) {
    console.warn('[neighbor-api] 拉分类失败:', e)
    return null
  }
}

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

// 点赞/取消点赞
export const toggleLike = (postId, userId) => {
  return request('toggleLike', { postId, userId })
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

// 发表评论
export const createComment = (postId, userId, content, authorName) => {
  return request('createComment', { postId, userId, content, authorName })
}

// ==================== 认证相关 ====================

// 获取认证状态
export const getCertStatus = (userId) => {
  return request('getCertStatus', { userId })
}

// 提交认证申请
export const submitCert = (certData) => {
  return request('submitCert', certData)
}

// 主动重置自己的认证（"已认证"页点重新认证时调用，清 DB 状态回 'none'）
export const resetMyCert = (userId) => {
  return request('resetMyCert', { userId })
}

// 上传认证图片。阿里云新版（mp- 前缀）服务空间下，uniCloud.uploadFile 返回的 fileID
// 就是 https 永久 CDN URL（DCloud 文档原话："阿里云返回的 fileID 为链接形式可以直接使用"），
// 直接用即可，存 DB 后商家端 <image> 标签可直接渲染，无需再走 getTempFileURL。
// tempFilePath 是 chooseImage 返回的 wxfile://... 或 http://tmp/... 临时路径。
export const uploadCertImage = (tempFilePath, cloudPath) => {
  return new Promise((resolve, reject) => {
    if (typeof uniCloud === 'undefined' || !uniCloud || typeof uniCloud.uploadFile !== 'function') {
      reject({ msg: 'uniCloud.uploadFile 不可用：未绑定 uniCloud-aliyun 或 SDK 未加载' })
      return
    }
    uniCloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      success: (res) => {
        if (res && res.fileID) {
          resolve({ code: 0, data: { fileID: res.fileID } })
        } else {
          reject({ msg: 'uniCloud.uploadFile 返回成功但无 fileID，响应: ' + JSON.stringify(res) })
        }
      },
      fail: (err) => {
        reject({ msg: 'uniCloud.uploadFile 失败：' + (err.errMsg || err.message || JSON.stringify(err)) })
      }
    })
  })
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