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

// 上传认证图片（参考商品图上传逻辑）
// 优先走 uniCloud.uploadFile({ cloudPath, filePath }) 直传云存储 —— 与商品图一致
// 失败时降级到 base64 + merchant-api.uploadImage（兼容未绑定 uniCloud-aliyun 的旧环境）
// tempFilePath 是 chooseImage 返回的 wxfile://... 或 http://tmp/... 临时路径
// 注意：uniCloud SDK 在不同版本下 fileID 可能是 cloud:// 也可能是 https:// 完整 URL。
// 我们不再做 client 端反推（regex 容易把 storage domain 误识别成 file path），
// 直接把 SDK 返回的 fileID 原样存进 DB。商家端 resolveFileIdsInItems 只处理 cloud://，
// 对 https:// 直接当 URL 用（5 分钟内有效，超时后商家需重新触发解析）。
export const uploadCertImage = (tempFilePath, cloudPath) => {
  return new Promise((resolve, reject) => {
    console.log('[uploadCertImage] start, tempFilePath:', tempFilePath, 'cloudPath:', cloudPath)
    // 优先尝试：uniCloud.uploadFile 直传（与商品图同链路，不走 JSON body，避开超时）
    if (typeof uniCloud !== 'undefined' && uniCloud && typeof uniCloud.uploadFile === 'function') {
      console.log('[uploadCertImage] uniCloud 存在，走直传')
      uniCloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        success: (res) => {
          console.log('[uploadCertImage] uniCloud success:', res)
          if (res && res.fileID) {
            // 原样返回，不做 https→cloud:// 转换（之前 toCloudFileID regex 会把
            // "cloudstorage" 之类 storage domain 误识别为 file path，导致存的 cloud://
            // 指向不存在的文件）
            console.log('[uploadCertImage] fileID 原样存:', res.fileID)
            resolve({ code: 0, data: { fileID: res.fileID } })
          } else {
            console.warn('[uploadCertImage] uniCloud 返回无 fileID，降级到 base64')
            fallbackBase64(tempFilePath, cloudPath).then(resolve).catch(reject)
          }
        },
        fail: (err) => {
          console.warn('[uploadCertImage] uniCloud 直传失败，降级到 base64:', err)
          fallbackBase64(tempFilePath, cloudPath).then(resolve).catch(reject)
        }
      })
      return
    }
    // 无 uniCloud 全局对象（未绑定 uniCloud-aliyun），直接走 base64
    console.log('[uploadCertImage] uniCloud 不可用，直接走 base64 降级')
    fallbackBase64(tempFilePath, cloudPath).then(resolve).catch(reject)
  })
}

// 降级方案：base64 + merchant-api.uploadImage（用户端未绑定 uniCloud 时使用）
function fallbackBase64(tempFilePath, cloudPath) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[uploadCertImage] fallbackBase64 读取文件:', tempFilePath)
      const fs = uni.getFileSystemManager()
      const base64 = fs.readFileSync(tempFilePath, 'base64')
      console.log('[uploadCertImage] base64 长度:', base64.length)
      const dataUri = `data:image/jpeg;base64,${base64}`
      request('uploadImage', { fileData: dataUri, cloudPath }).then(resolve).catch(reject)
    } catch (e) {
      console.error('[uploadCertImage] fallbackBase64 失败:', e)
      reject({ msg: '图片读取失败：' + (e.message || e.errMsg || '未知错误') })
    }
  })
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