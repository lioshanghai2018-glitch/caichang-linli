exports.main = async (context) => {
  let body = context.body
  if (typeof body === 'string') {
    body = JSON.parse(body)
  }
  const { method, params } = body || context
  const obj = require('./index.obj.js')
  if (typeof obj[method] === 'function') {
    // 传递完整的 body 以便 getHttpParams 能正确解析
    return await obj[method](body || {})
  }
  return { code: -1, msg: '方法不存在' }
}
