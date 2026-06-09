// 把 cloud:// fileID 数组转 https 临时 URL;非 cloud:// 原样返回
// 阿里云 uniCloud.uploadFile 返回 cloud://xxx,小程序 image 组件要求 https://
// 临时 URL 默认 2 小时有效,只用于上传后立即提交的场景
export async function toHttpsUrl(fileIds) {
  if (!fileIds || (Array.isArray(fileIds) && fileIds.length === 0)) return fileIds
  const list = Array.isArray(fileIds) ? fileIds : [fileIds]
  const need = list.filter(f => typeof f === 'string' && f.startsWith('cloud://'))
  if (need.length === 0) return list
  const r = await uniCloud.getTempFileURL({ fileList: need })
  const map = {}
  ;(r.fileList || []).forEach(f => { map[f.fileID] = f.tempFileURL || f.fileID })
  return list.map(f => map[f] || f)
}
