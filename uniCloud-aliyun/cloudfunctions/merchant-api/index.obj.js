// 4 端统一云对象补丁 — 包含鉴权 + uniPush 触发
// 部署：HBuilderX 右键 uniCloud-aliyun/cloudfunctions/merchant-api → 上传部署

// uni-id-common 是鉴权依赖。优先从 node_modules 加载（项目内已放置），找不到时降级为「明文 + 跳过强校验」
// uni-push 是可选依赖：未下载时不阻塞云函数冷启动，调用时静默降级
let uniID = null
try {
  uniID = require('uni-id-common')
} catch (e) {
  console.warn('[merchant-api] uni-id-common 未找到，将以降级模式运行（明文密码 + 弱鉴权，仅用于联调）')
}
let uniPush = null
try {
  uniPush = require('uni-push')
} catch (e) {
  console.warn('[merchant-api] uni-push 模块未安装，推送功能将不可用。可在 HBuilderX 插件市场搜索「uni-push」下载到 uni_modules 后重试。')
}
const db = uniCloud.database()
const dbCmd = db.command

// 微信小程序 AppID（与 manifest.json → mp-weixin.appid 一致）
// AppSecret 需在 uniCloud → merchant-api → 配置/环境变量 里设置 WX_APPSECRET
const WX_APPID = 'wx1621496ab4bca45d'
let _wxAccessTokenCache = { token: '', expiresAt: 0 }
async function getWxAccessToken() {
  if (_wxAccessTokenCache.token && Date.now() < _wxAccessTokenCache.expiresAt) {
    return _wxAccessTokenCache.token
  }
  const secret = process.env.WX_APPSECRET
  if (!secret) throw new Error('云函数未配置 WX_APPSECRET 环境变量')
  const r = await uniCloud.httpclient.request(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${secret}`,
    { method: 'GET', dataType: 'json' }
  )
  if (r.data && r.data.errcode) throw new Error('access_token 获取失败: ' + r.data.errmsg)
  _wxAccessTokenCache = { token: r.data.access_token, expiresAt: Date.now() + 7000 * 1000 }
  return r.data.access_token
}

// 生成 8 位 0-9 + A-Z 账号；查重 5 次，理论撞不到
function generateAccount() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let s = ''
  for (let i = 0; i < 8; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
}

async function generateUniqueAccount() {
  for (let i = 0; i < 5; i++) {
    const account = generateAccount()
    const exist = await db.collection('users').where({ account }).limit(1).get()
    if (!exist.data || exist.data.length === 0) return account
  }
  throw new Error('生成 account 失败')
}

// 兜底划线价：商家没填 / 填 0 / 填得比售价还低时，自动按 1.5 倍兜底
// 直接改 doc 本身（包括顶层 price/originalPrice + specs[0]）
function ensureOriginalPrice(doc) {
  if (!doc) return
  const price = Number(doc.price) || 0
  let originalPrice = Number(doc.originalPrice) || 0
  if (price > 0 && (!originalPrice || originalPrice < price)) {
    originalPrice = Number((price * 1.5).toFixed(2))
  }
  doc.originalPrice = originalPrice
  if (Array.isArray(doc.specs) && doc.specs.length > 0) {
    for (const s of doc.specs) {
      const sp = Number(s.price) || 0
      let sop = Number(s.originalPrice) || 0
      if (sp > 0 && (!sop || sop < sp)) sop = Number((sp * 1.5).toFixed(2))
      s.originalPrice = sop
    }
    // 顶层 price/originalPrice 跟 specs[0] 对齐
    const first = doc.specs[0]
    if (first && first.price != null) doc.price = Number(first.price) || 0
    if (first && first.originalPrice != null) doc.originalPrice = Number(first.originalPrice) || 0
  }
}

// 把 items 数组里所有 cloud://xxx 形式的 fileID 批量转成 https 临时 URL
// 扫描的单图字段：image / coverImage / idCardUrl / billUrl / idCardImage / billImage
// 扫描的数组字段：images
const SINGLE_IMAGE_FIELDS = ['image', 'coverImage', 'idCardUrl', 'billUrl', 'idCardImage', 'billImage']

// 阿里云 fileID 反向解析：cloud://{spaceId}-{env}/{path} → https://{spaceId}.cdn.bspapp.com/{env}/{path}
// 背景：用户端 cert 提交代码把阿里云 SDK 返回的 https URL 误转成 cloud:// 形式存 DB。
//       实际阿里云 fileID 本身就是 https 链接且永久（DCloud 文档原话："阿里云返回的fileID为链接形式
//       可以直接使用"），cloud:// 是用户端代码自己拼的、不是合法 fileID，云函数调 getTempFileURL 会失败。
//       所以遇到 mp- 前缀的 cloud:// URL，直接反构 https 永久 URL 返回，绕开 getTempFileURL。
//       老的 cert_1780549815087（2026-06-04 存的就是 https）到今天 2026-06-07 还能正常显示，
//       证明这个反构是安全的。
// 返回 null 表示不是阿里云格式（fc- 腾讯云等），外层走原 getTempFileURL 路径。
function aliyunFileIDToHttps(cloudFileID) {
  if (typeof cloudFileID !== 'string') return null
  const m = cloudFileID.match(/^cloud:\/\/((mp|fc)-[a-z0-9-]+)-([a-z][a-z0-9]*)\/(.+)$/i)
  if (!m) return null
  const spaceId = m[1]
  if (!spaceId.startsWith('mp-')) return null  // 仅处理阿里云 mp- 前缀
  const env = m[3]
  const path = m[4]
  return `https://${spaceId}.cdn.bspapp.com/${env}/${path}`
}

async function resolveFileIdsInItems(items) {
  if (!Array.isArray(items) || items.length === 0) return
  const fileIds = new Set()
  for (const it of items) {
    if (!it) continue
    for (const f of SINGLE_IMAGE_FIELDS) {
      if (typeof it[f] === 'string' && it[f].startsWith('cloud://')) {
        // 阿里云 fileID：直接反构 https 永久 URL，绕开 getTempFileURL
        const https = aliyunFileIDToHttps(it[f])
        if (https) {
          it[f] = https
        } else {
          fileIds.add(it[f])
        }
      }
    }
    if (Array.isArray(it.images)) {
      for (let i = 0; i < it.images.length; i++) {
        const x = it.images[i]
        if (typeof x === 'string' && x.startsWith('cloud://')) {
          const https = aliyunFileIDToHttps(x)
          if (https) {
            it.images[i] = https
          } else {
            fileIds.add(x)
          }
        }
      }
    }
  }
  if (fileIds.size === 0) return
  try {
    const r = await uniCloud.getTempFileURL({ fileList: Array.from(fileIds) })
    const map = {}
    for (const item of (r.fileList || [])) {
      if (item.fileID && item.tempFileURL) map[item.fileID] = item.tempFileURL
    }
    for (const it of items) {
      if (!it) continue
      for (const f of SINGLE_IMAGE_FIELDS) {
        if (typeof it[f] === 'string' && map[it[f]]) it[f] = map[it[f]]
      }
      if (Array.isArray(it.images)) it.images = it.images.map(x => (typeof x === 'string' && map[x]) ? map[x] : x)
    }
  } catch (e) {
    // 转换失败不阻塞主流程，前端会显示占位图
    console.warn('resolveFileIdsInItems 失败:', e.message)
  }
}

// 明文密码比对降级方案（仅供 seed / 联调使用；正式上线必须装回 uni-id-common）
async function plainPwdMatch(collection, phone, password) {
  const r = await db.collection(collection).where({ phone }).get()
  if (!r.data || !r.data.length) return null
  const u = r.data[0]
  return u.password === password ? u : null
}

// 顶层 helper：避免云对象 this 上下文访问不到 sibling 方法的问题
async function ensureSeedDoc(collection, doc) {
  const existing = await db.collection(collection).where({ _id: doc._id }).get()
  if (existing.data && existing.data.length) {
    return { ...doc, _action: 'exists' }
  }
  await db.collection(collection).add(doc)
  return { ...doc, _action: 'created' }
}

// 4 端 URL 化调用统一包成 { method, params } 格式，这里解开拿到真实参数
function unwrapArgs(args) {
  if (args && typeof args === 'object' && 'method' in args && 'params' in args && args.params && typeof args.params === 'object') {
    return args.params
  }
  return args
}

// 看板时间范围：timeFilter=today|week|month|custom，custom 时取 customDate 那一天
function computeTimeRange(timeFilter, customDate) {
  const now = new Date()
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
  if (timeFilter === 'week') {
    const day = now.getDay() // 0=Sun..6=Sat
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return { start: startOfDay(monday), end: now, label: '本周' }
  }
  if (timeFilter === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: startOfDay(first), end: now, label: '本月' }
  }
  if (timeFilter === 'custom' && customDate) {
    const d = new Date(customDate)
    if (!isNaN(d.getTime())) {
      return { start: startOfDay(d), end: endOfDay(d), label: customDate }
    }
  }
  return { start: startOfDay(now), end: now, label: '今日' }
}

// 订单 status 归一化：兼容 canonical 英文值 + 用户端/旧版写入的中文标签
const ORDER_STATUS_MAP = {
  '已接单': 'pending_sorting',
  '待分拣': 'pending_sorting',
  '已付款': 'paid',
  '待付款': 'pending_payment',
  '待支付': 'pending_payment',
  '分拣中': 'sorting',
  '待配送': 'sorting',
  '配送中': 'delivering',
  '已完成': 'completed',
  '已取消': 'cancelled',
  '退款中': 'refunding',
  '已退款': 'refunded'
}
function normalizeOrderStatus(s) {
  if (!s) return ''
  return ORDER_STATUS_MAP[s] || s
}

// ==================== 库存联动（模块级函数，不能用 this._adjustStock，云对象 this 拿不到兄弟方法）====================
// 按订单 items 调整商品库存
// direction: 'deduct' 扣减（先校验再扣） / 'restore' 回补（直接加）
// 规格匹配：item.spec 文本与 products.specs[i].name 比对；找不到则用 specs[0]；无 specs 则用顶层 stock
async function _adjustStock(items, direction) {
  if (!Array.isArray(items) || !items.length) {
    console.log('[stock] items 为空，跳过')
    return { ok: true, processed: 0, skipped: 0 }
  }
  let processed = 0
  let skipped = 0
  for (const it of items) {
    console.log(`[stock] 处理 item: productId=${it.productId} name=${it.name} spec=${it.spec} qty=${it.qty} dir=${direction}`)
    if (!it.productId) {
      // 严格模式：deduct 时 productId 缺失直接报错（防止 stockDeducted 被错误写入）
      // restore 时静默跳过（容错，不阻塞取消）
      if (direction === 'deduct') {
        console.log(`[stock] ❌ deduct 时 productId 为空，报错`)
        return { ok: false, msg: `【${it.name}】商品 ID 缺失，无法扣库存（请清空购物车后重新添加）` }
      } else {
        console.log(`[stock] ⚠️ restore 时 productId 为空，静默跳过`)
        skipped++
        continue
      }
    }
    const qty = Math.abs(parseInt(it.qty) || 0)
    if (qty === 0) {
      console.log(`[stock] ⚠️ qty=0 跳过`)
      skipped++
      continue
    }
    // 读商品
    const pRes = await db.collection('products').doc(it.productId).get()
    const p = pRes.data && pRes.data[0]
    if (!p) {
      console.log(`[stock] ❌ 商品不存在 _id=${it.productId}，跳过`)
      skipped++
      continue
    }
    console.log(`[stock] 找到商品 ${p.name}，当前 stock=${p.stock} specs=${JSON.stringify(p.specs)}`)
    // 找规格
    let specIdx = -1
    if (Array.isArray(p.specs) && p.specs.length) {
      specIdx = p.specs.findIndex(s => s.name === it.spec)
      if (specIdx < 0) specIdx = 0
    }
    if (specIdx >= 0) {
      const field = `specs.${specIdx}.stock`
      if (direction === 'deduct') {
        const cur = Number(p.specs[specIdx].stock || 0)
        if (cur < qty) {
          return { ok: false, msg: `【${it.name}】库存不足（剩 ${cur}，需 ${qty}）` }
        }
      }
      await db.collection('products').doc(it.productId).update({
        [field]: dbCmd.inc(direction === 'deduct' ? -qty : qty)
      })
    } else {
      if (direction === 'deduct') {
        const cur = Number(p.stock || 0)
        if (cur < qty) {
          return { ok: false, msg: `【${it.name}】库存不足（剩 ${cur}，需 ${qty}）` }
        }
      }
      await db.collection('products').doc(it.productId).update({
        stock: dbCmd.inc(direction === 'deduct' ? -qty : qty)
      })
    }
    processed++
  }
  return { ok: true, processed, skipped }
}

module.exports = {
  _before: async function() {
    if (uniID) {
      this.uniID = uniID.createInstance({ context: this })
    } else {
      this.uniID = {
        login: async () => ({ errCode: 'NO_UNI_ID', errMsg: 'uni-id-common 未安装' }),
        loginByUniverify: async () => ({ errCode: 'NO_UNI_ID', errMsg: 'uni-id-common 未安装' }),
        sendSmsCode: async () => ({ errCode: 'NO_UNI_ID', errMsg: 'uni-id-common 未安装' }),
        loginBySms: async () => ({ errCode: 'NO_UNI_ID', errMsg: 'uni-id-common 未安装' }),
        encryptPwd: async (p) => p
      }
    }
    // URL 化调用的真实数据在 this.getHttpInfo().body（JSON 字符串），不是 this.event 也不是方法签名 data
    // 把 body 解析后挂到 this.event 上，让所有方法能从 this.event 拿到真实入参
    try {
      const httpInfo = this.getHttpInfo()
      if (httpInfo && httpInfo.body) {
        const bodyObj = JSON.parse(httpInfo.body)
        // 4 端都把参数包成 {method, params}；有些端可能直接传 params
        if (bodyObj && bodyObj.method && bodyObj.params && typeof bodyObj.params === 'object') {
          this.event = bodyObj.params
        } else {
          this.event = bodyObj
        }
      }
    } catch (e) {
      console.warn('[merchant-api] URL 化 body 解析失败:', e.message)
    }
  },

  // ==================== 鉴权端点 ====================

  async merchantLogin(phone, password) {
    // 优先走 uni-id 登录；未安装时降级为明文密码比对（仅供联调）
    if (uniID) {
      const res = await this.uniID.login({
        username: phone,
        password,
        queryField: ['username', 'phone', 'email']
      })
      if (res.errCode) return { code: -1, msg: res.errMsg || '登录失败' }

      const merchant = await db.collection('merchants').where({ _id: res.uid }).get()
      if (!merchant.data || !merchant.data.length) {
        return { code: -1, msg: '商家账号不存在' }
      }

      return {
        code: 0,
        data: {
          merchantId: res.uid,
          token: res.token,
          tokenExpired: res.tokenExpired,
          shopInfo: merchant.data[0]
        }
      }
    }
    // 降级路径
    const merchant = await plainPwdMatch('merchants', phone, password)
    if (!merchant) return { code: -1, msg: '账号或密码错误' }
    return {
      code: 0,
      data: {
        merchantId: merchant._id,
        token: 'plain_' + merchant._id,
        tokenExpired: Date.now() + 7200000,
        shopInfo: merchant
      }
    }
  },

  // 测试/开发模式：自动取唯一商家 ID（仅当 merchants 集合只有 1 条时返回）
  async merchantAutoLogin() {
    const r = await db.collection('merchants').limit(2).get()
    if (!r.data || !r.data.length) {
      return { code: -1, msg: 'merchants 集合为空' }
    }
    if (r.data.length > 1) {
      return { code: -1, msg: '存在多个商家，请走正式登录' }
    }
    const m = r.data[0]
    return {
      code: 0,
      data: {
        merchantId: m._id,
        token: 'auto_' + m._id,
        tokenExpired: Date.now() + 7200000,
        shopInfo: m
      }
    }
  },

  async loginByUniverify(authResult) {
    const res = await this.uniID.loginByUniverify({ ...authResult })
    if (res.errCode) return { code: -1, msg: res.errMsg }
    return { code: 0, data: { token: res.token, userInfo: res.userInfo } }
  },

  async sendSmsCode(phone) {
    const res = await this.uniID.sendSmsCode({ phone, type: 'login' })
    if (res.errCode) return { code: -1, msg: res.errMsg }
    return { code: 0, data: { phone } }
  },

  async loginBySms(phone, code) {
    const res = await this.uniID.loginBySms({ phone, code })
    if (res.errCode) return { code: -1, msg: res.errMsg }
    return { code: 0, data: { token: res.token, userInfo: res.userInfo } }
  },

  async registerPushClientId(clientId, role, roleId) {
    if (!clientId || !role || !roleId) {
      return { code: -1, msg: '参数不完整' }
    }
    const collection = role === 'rider' ? 'riders' : (role === 'merchant' ? 'merchants' : 'users')
    await db.collection(collection).doc(roleId).update({
      pushClientId: clientId,
      updatedAt: new Date()
    })
    return { code: 0, data: { clientId } }
  },

  // ==================== 业务方法（带推送触发） ====================

  async assignOrder(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    // 兼容 {orderNo, riderId} 对象 和 (orderNo, riderId) 位置参数
    const orderNo = (params && params.orderNo) || arguments[0]
    const riderId = (params && params.riderId) || arguments[1]
    if (!orderNo || !riderId) return { code: -1, msg: 'orderNo 和 riderId 必填' }

    // 防御：自提单不分配骑手
    const beforeR = await db.collection('orders').where({ orderNo }).field({ deliveryType: true }).get()
    const before = beforeR.data && beforeR.data[0]
    if (before && before.deliveryType === 'self') {
      return { code: -1, msg: '自提单无需分配骑手' }
    }

    const result = await db.collection('orders').where({ orderNo }).update({
      riderId,
      status: 'sorting',
      updatedAt: new Date()
    })
    if (result.updated > 0) {
      const order = await db.collection('orders').where({ orderNo }).get()
      const o = order.data[0]
      if (o) {
        // 内联推送骑手（云对象 this 拿不到兄弟方法）
        try {
          const rr = await db.collection('riders').doc(riderId).field({ pushClientId: true }).get()
          const clientId = rr.data && rr.data[0] && rr.data[0].pushClientId
          if (clientId && uniPush) {
            await uniPush.sendMessage({
              push_clientid: clientId,
              title: '新订单待取货',
              content: `订单 ${orderNo} 等待您取货`,
              payload: JSON.stringify({ page: '/pages/pending/index', orderNo })
            })
          }
        } catch (pushErr) {
          console.warn('[assignOrder] 推送骑手失败：', pushErr.message)
        }
      }
    }
    return { code: 0, data: { success: result.updated > 0 } }
  },

  async updateOrderStatus(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    // 兼容 {orderNo/id, status, ...extraData} 对象 和 位置参数
    const p = params || {}
    const orderNo = p.orderNo || arguments[0]
    const id = p.id || p._id
    const status = p.status || arguments[1]
    const extraData = p.extraData || {}
    if (!orderNo && !id) return { code: -1, msg: 'orderNo 或 id 必填' }
    if (!status) return { code: -1, msg: 'status 必填' }

    const where = orderNo ? { orderNo } : { _id: id }
    // 库存联动：先读订单判断是否需要扣/退
    const orderBefore = await db.collection('orders').where(where).get()
    const oldOrder = orderBefore.data && orderBefore.data[0]
    if (!oldOrder) return { code: -1, msg: '订单不存在' }
    const oldStatus = oldOrder.status
    const wasDeducted = !!oldOrder.stockDeducted
    const PAID_LIKE = ['paid', 'pending_sorting', 'sorting', 'ready_for_pickup', 'delivering', 'completed']
    const isNewPaid = PAID_LIKE.includes(status)
    const isNewCancelled = status === 'cancelled' || status === 'refunded'
    const stockDelta = {}
    console.log(`[updateOrderStatus] oldStatus=${oldStatus} newStatus=${status} wasDeducted=${wasDeducted} isNewPaid=${isNewPaid} isNewCancelled=${isNewCancelled}`)
    if (!wasDeducted && oldStatus === 'pending_payment' && isNewPaid) {
      console.log('[updateOrderStatus] 进入扣库存路径')
      // 第一次从待付款进入已支付系状态 → 扣库存
      const adj = await _adjustStock(oldOrder.items, 'deduct')
      if (!adj.ok) return { code: -1, msg: adj.msg }
      stockDelta.stockDeducted = true
    } else if (wasDeducted && isNewCancelled) {
      console.log('[updateOrderStatus] 进入退库存路径')
      // 之前已扣，现在取消或退款 → 退库存
      const adj = await _adjustStock(oldOrder.items, 'restore')
      if (!adj.ok) return { code: -1, msg: adj.msg }
      stockDelta.stockDeducted = false
    } else {
      console.log('[updateOrderStatus] 无库存变动（已扣过 / 非相关状态切换）')
    }
    const updateData = {
      status,
      updatedAt: new Date(),
      // 标记完成时间,用于按"完成时间"统计今日/本周/本月订单与销售额
      // 缺这字段时,getDashboard 会用 updatedAt 兜底,但其他状态变化也会改 updatedAt(噪音)
      ...(status === 'completed' && !extraData.completedAt && { completedAt: new Date() }),
      ...extraData,
      ...stockDelta
    }
    const result = await db.collection('orders').where(where).update(updateData)

    if (result.updated > 0) {
      const order = await db.collection('orders').where({ orderNo }).get()
      const o = order.data[0]
      if (o && o.userId) {
        const statusText = {
          sorting: '商家正在分拣',
          delivering: '骑手已取货，配送中',
          completed: '订单已完成',
          cancelled: '订单已取消',
          refunding: '退款处理中',
          refunded: '退款已到账'
        }[status] || `订单状态更新：${status}`
        // 内联推送用户（云对象 this 拿不到兄弟方法）
        try {
          const ur = await db.collection('users').doc(o.userId).field({ pushClientId: true }).get()
          const clientId = ur.data && ur.data[0] && ur.data[0].pushClientId
          if (clientId && uniPush) {
            await uniPush.sendMessage({
              push_clientid: clientId,
              title: '订单状态更新',
              content: `${orderNo} ${statusText}`,
              payload: JSON.stringify({ page: '/pages/order/index', orderNo })
            })
          }
        } catch (pushErr) {
          console.warn('[updateOrderStatus] 推送用户失败：', pushErr.message)
        }
      }
    }
    return { code: 0, data: { success: result.updated > 0 } }
  },

  async createOrder(orderData) {
    // 完整诊断：把每一步的快照都返回
    const _rawOrderData = orderData
    const _rawOrderDataKeys = orderData && typeof orderData === 'object' ? Object.keys(orderData) : null
    const _rawOrderDataSerialized = orderData ? JSON.stringify(orderData).slice(0, 600) : 'NULL'
    const _rawThisEvent = this.event
    const _rawThisEventKeys = this.event && typeof this.event === 'object' ? Object.keys(this.event) : null
    const _rawThisEventSerialized = this.event ? JSON.stringify(this.event).slice(0, 600) : 'NO_EVENT'

    // 显式分步：先看 this.event，再决定 unwrap
    const _evt = this.event
    const _evtHasParams = !!(this.event && this.event.params)
    const _step1 = (this.event && this.event.params) || this.event || {}
    const _step1Keys = Object.keys(_step1)
    // 关键：空对象是 truthy，要用 Object.keys().length 判断是否真的非空
    const orderData_unwrapped = (orderData && orderData.params)
      || (orderData && Object.keys(orderData).length ? orderData : null)
      || _step1
    var orderData = orderData_unwrapped
    const items = orderData.items || orderData.products || []
    // 计算每件商品小计（itemTotal）并累加总额（totalAmount）
    let computedTotal = 0
    const itemsWithTotal = items.map(it => {
      const price = parseFloat(it.price) || 0
      const qty = parseInt(it.qty) || 1
      const itemTotal = +(price * qty).toFixed(2)
      computedTotal += itemTotal
      return Object.assign({}, it, { price, qty, itemTotal })
    })
    // 加上配送费
    const deliveryFeeNum = parseFloat(orderData.deliveryFee) || 0
    computedTotal = +(computedTotal + deliveryFeeNum).toFixed(2)
    // 兜底 deliveryType：老客户端/脏数据 → 默认 'self'
    const allowedTypes = ['self', 'delivery']
    const deliveryType = allowedTypes.includes(orderData.deliveryType) ? orderData.deliveryType : 'self'
    const doc = Object.assign({}, orderData, {
      deliveryType,
      items: itemsWithTotal,
      totalAmount: orderData.totalAmount != null ? orderData.totalAmount : computedTotal,
      status: orderData.status || 'pending_payment',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    delete doc.products
    // 创建即已支付（测试模式 status=pending_sorting / 未来真实支付 status=paid）→ 先校验库存再扣
    console.log(`[createOrder] status=${doc.status} items.length=${doc.items ? doc.items.length : 0}`)
    if (doc.status && doc.status !== 'pending_payment') {
      console.log('[createOrder] 进入扣库存路径')
      const adj = await _adjustStock(doc.items, 'deduct')
      if (!adj.ok) return { code: -1, msg: adj.msg }
      // 只有真正处理过至少一个 item 才标记 stockDeducted=true
      // 防止 productId=null 时静默跳过、却把 stockDeducted 错误写入
      if (adj.processed > 0) {
        doc.stockDeducted = true
        console.log(`[createOrder] 扣库存成功 processed=${adj.processed} skipped=${adj.skipped}`)
      } else {
        console.log(`[createOrder] 全部 items 被跳过 processed=0，不标记 stockDeducted`)
      }
    } else {
      console.log('[createOrder] status=pending_payment，跳过扣库存')
    }
    const result = await db.collection('orders').add(doc)
    const verify = await db.collection('orders').doc(result.id).get()
    const stored = verify.data && verify.data[0]
    if (result.id && orderData.merchantId) {
      // 内联推送：云对象运行时 this 拿不到兄弟方法，直接查 merchants 表
      try {
        const mr = await db.collection('merchants').doc(orderData.merchantId).field({ pushClientId: true }).get()
        const clientId = mr.data && mr.data[0] && mr.data[0].pushClientId
        if (clientId && uniPush) {
          await uniPush.sendMessage({
            push_clientid: clientId,
            title: '新订单',
            content: `订单 ${orderData.orderNo} 待处理`,
            payload: JSON.stringify({ page: '/pages/order/list', orderNo: orderData.orderNo })
          })
        }
      } catch (pushErr) {
        console.warn('[createOrder] 推送商家失败：', pushErr.message)
      }
    }
    return {
      code: 0,
      data: {
        orderId: result.id,
        totalAmount: computedTotal,
        items: itemsWithTotal,
        storedKeys: stored ? Object.keys(stored) : [],
        stored,
        diag: {
          rawOrderDataKeys: _rawOrderDataKeys,
          rawOrderDataSerialized: _rawOrderDataSerialized,
          rawThisEventKeys: _rawThisEventKeys,
          rawThisEventSerialized: _rawThisEventSerialized,
          step1Keys: _step1Keys,
          unwrappedKeys: Object.keys(orderData),
          itemsLen: items.length
        }
      }
    }
  },

  async riderUpdateStatus(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    // 兼容 {orderId/id, deliveryStatus} 对象 和 (orderId, deliveryStatus) 位置参数
    const p = params || {}
    const orderId = p.orderId || p.id || p._id || arguments[0]
    const deliveryStatus = p.deliveryStatus || arguments[1]
    if (!orderId || !deliveryStatus) return { code: -1, msg: 'orderId 和 deliveryStatus 必填' }
    // 防御：自提单不支持骑手改状态
    const beforeOrder = await db.collection('orders').doc(orderId).field({ deliveryType: true }).get()
    const before = beforeOrder.data && beforeOrder.data[0]
    if (before && before.deliveryType === 'self') {
      return { code: -1, msg: '自提单不支持骑手改状态' }
    }

    const result = await db.collection('orders').doc(orderId).update({
      deliveryStatus,
      // 联动主订单 status，让商家APP/用户端的状态显示同步推进
      ...(deliveryStatus === 'completed' && { status: 'completed', completedAt: new Date() }),
      ...(deliveryStatus === 'delivering' && { status: 'delivering' }),
      updatedAt: new Date()
    })
    if (result.updated > 0) {
      const order = await db.collection('orders').doc(orderId).get()
      const o = order.data[0]
      if (o) {
        const statusText = {
          accepted: '骑手已接单',
          picked_up: '骑手已取货',
          delivering: '配送中',
          completed: '已送达'
        }[deliveryStatus] || deliveryStatus
        // 内联推送用户（云对象 this 拿不到兄弟方法）
        if (o.userId) {
          try {
            const ur = await db.collection('users').doc(o.userId).field({ pushClientId: true }).get()
            const clientId = ur.data && ur.data[0] && ur.data[0].pushClientId
            if (clientId && uniPush) {
              await uniPush.sendMessage({
                push_clientid: clientId,
                title: '配送状态',
                content: `订单 ${o.orderNo} ${statusText}`,
                payload: JSON.stringify({ page: '/pages/order/index', orderNo: o.orderNo })
              })
            }
          } catch (pushErr) {
            console.warn('[riderUpdateStatus] 推送用户失败：', pushErr.message)
          }
        }
      }
    }
    return { code: 0, data: { success: result.updated > 0 } }
  },

  // ==================== 商品管理 ====================

  async getProducts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    // merchantId 容错：传入的值在 merchants 集合里查不到时（uni-id 登录返回的 uid / 用户填错），fallback 到唯一商家
    let merchantId = params.merchantId
    if (merchantId) {
      const m = await db.collection('merchants').doc(merchantId).get()
      if (!m.data || !m.data.length) {
        // 商家不存在 → 查 merchants 集合
        const all = await db.collection('merchants').limit(2).get()
        if (all.data && all.data.length === 1) {
          merchantId = all.data[0]._id
        } else {
          merchantId = null
        }
      }
    }
    if (merchantId) where.merchantId = merchantId
    // 分类过滤：'all'/空 → 不过滤；只按 categoryName（中文）匹配，最一致
    const cat = (params.category || '').trim()
    if (cat && cat !== 'all' && params.categoryName) {
      where.categoryName = params.categoryName
    }
    // status 兼容：true / 'true' / 'online' / 1 都视为上架；false / 'offline' 视为下架
    if (params.status !== undefined && params.status !== '' && params.status !== null) {
      const s = String(params.status).toLowerCase()
      const isOn = s === 'true' || s === 'online' || s === '1' || params.status === true || params.status === 1
      const isOff = s === 'false' || s === 'offline' || s === '0' || params.status === false || params.status === 0
      if (isOn) {
        where.status = dbCmd.or([{ status: true }, { status: 'online' }, { status: 1 }])
      } else if (isOff) {
        where.status = dbCmd.or([{ status: false }, { status: 'offline' }, { status: 0 }])
      } else {
        where.status = params.status
      }
    }
    const r = await db.collection('products').where(where).limit(params.limit || 100).orderBy('createdAt', 'desc').get()
    const list = r.data || []
    await resolveFileIdsInItems(list)
    return { code: 0, data: list }
  },

  async addProduct(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const doc = { ...data, sold: 0, images: data.images || [], description: data.description || '', createdAt: new Date(), updatedAt: new Date() }
    // 兜底：如果商家没填 specs，从顶层 price/stock/originalPrice 生成一个默认规格
    // （用户端、WEB 端商品列表都按 specs[0] 读，没有 specs 就显示 ¥0）
    if (!doc.specs || !Array.isArray(doc.specs) || doc.specs.length === 0) {
      doc.specs = [{
        name: doc.spec || '默认',
        price: Number(doc.price) || 0,
        originalPrice: Number(doc.originalPrice) || 0,
        stock: Number(doc.stock) || 0
      }]
    }
    // 划线价兜底：缺 / 0 / 比售价低 → 自动 1.5x
    ensureOriginalPrice(doc)
    if (!doc._id) doc._id = 'p_' + Date.now()
    await db.collection('products').add(doc)
    return { code: 0, data: { _id: doc._id } }
  },

  async updateProduct(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, ...update } = params
    update.updatedAt = new Date()
    // 划线价兜底：如果本次更新带 price / specs，同步补 originalPrice
    if (update.price != null || Array.isArray(update.specs)) {
      const synthetic = {
        price: update.price,
        originalPrice: update.originalPrice,
        specs: update.specs
      }
      ensureOriginalPrice(synthetic)
      if (synthetic.originalPrice != null) update.originalPrice = synthetic.originalPrice
      if (Array.isArray(synthetic.specs)) update.specs = synthetic.specs
    }
    await db.collection('products').doc(id).update(update)
    return { code: 0, data: { success: true } }
  },

  // 编辑商品回显用
  async getProductDetail(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const id = params.id || params._id
    if (!id) return { code: -1, msg: 'id 必填' }
    const r = await db.collection('products').doc(id).get()
    const item = (r.data && r.data[0]) || null
    if (item) await resolveFileIdsInItems([item])
    return { code: 0, data: item }
  },

  // 一次性数据修复：给历史商品补 categoryName / category（用 categories 集合反查 name 和 key）
  async fixProductsCategoryName() {
    const cats = await db.collection('categories').limit(500).get()
    const list = cats.data || []
    // 三张映射表：id → name，id → key
    const idToName = {}
    const idToKey = {}
    const nameToKey = {}
    for (const c of list) {
      if (c._id) {
        if (c.name) idToName[c._id] = c.name
        if (c.key) idToKey[c._id] = c.key
      }
      if (c.name && c.key) nameToKey[c.name] = c.key
    }
    const all = await db.collection('products').limit(1000).get()
    const products = all.data || []
    let fixedName = 0
    let fixedKey = 0
    for (const p of products) {
      const upd = {}
      if (!p.categoryName) {
        if (idToName[p.category]) upd.categoryName = idToName[p.category]
        else if (idToName[p.categoryId]) upd.categoryName = idToName[p.categoryId]
      }
      if (!p.category) {
        if (idToKey[p.category]) upd.category = idToKey[p.category]
        else if (idToKey[p.categoryId]) upd.category = idToKey[p.categoryId]
        else if (p.categoryName && nameToKey[p.categoryName]) upd.category = nameToKey[p.categoryName]
      }
      if (Object.keys(upd).length) {
        upd.updatedAt = new Date()
        await db.collection('products').doc(p._id).update(upd)
        if (upd.categoryName) fixedName++
        if (upd.category) fixedKey++
      }
    }
    return { code: 0, data: { total: products.length, fixedName, fixedKey } }
  },

  // 一次性数据修复：跑完 merchantId + categoryName + createdAt 修复（不走 this，避免兄弟方法拿不到）
  async fixAllProducts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped

    // 1) 修 merchantId + createdAt
    let merchantId = params.merchantId
    if (!merchantId) {
      const m = await db.collection('merchants').limit(2).get()
      if (!m.data || !m.data.length) return { code: -1, msg: 'merchants 集合为空' }
      if (m.data.length > 1) return { code: -1, msg: '存在多个商家，请显式传 merchantId' }
      merchantId = m.data[0]._id
    }
    const all = await db.collection('products').limit(1000).get()
    const products = all.data || []
    let fixedMerchant = 0
    let fixedCreatedAt = 0
    for (const p of products) {
      const upd = {}
      if (!p.merchantId) {
        upd.merchantId = merchantId
        fixedMerchant++
      }
      if (!p.createdAt) {
        if (p.createTime) {
          upd.createdAt = new Date(Number(p.createTime))
        } else {
          upd.createdAt = new Date()
        }
        fixedCreatedAt++
      }
      if (Object.keys(upd).length) {
        upd.updatedAt = new Date()
        await db.collection('products').doc(p._id).update(upd)
      }
    }

    // 2) 修 categoryName + category
    const cats = await db.collection('categories').limit(500).get()
    const catList = cats.data || []
    const idToName = {}
    const idToKey = {}
    const nameToKey = {}
    for (const c of catList) {
      if (c._id) {
        if (c.name) idToName[c._id] = c.name
        if (c.key) idToKey[c._id] = c.key
      }
      if (c.name && c.key) nameToKey[c.name] = c.key
    }
    let fixedName = 0
    let fixedKey = 0
    for (const p of products) {
      const upd = {}
      if (!p.categoryName) {
        if (idToName[p.category]) upd.categoryName = idToName[p.category]
        else if (idToName[p.categoryId]) upd.categoryName = idToName[p.categoryId]
      }
      if (!p.category) {
        if (idToKey[p.category]) upd.category = idToKey[p.category]
        else if (idToKey[p.categoryId]) upd.category = idToKey[p.categoryId]
        else if (p.categoryName && nameToKey[p.categoryName]) upd.category = nameToKey[p.categoryName]
      }
      if (Object.keys(upd).length) {
        upd.updatedAt = new Date()
        await db.collection('products').doc(p._id).update(upd)
        if (upd.categoryName) fixedName++
        if (upd.category) fixedKey++
      }
    }

    return {
      code: 0,
      data: {
        merchantId,
        total: products.length,
        fixedMerchant,
        fixedCreatedAt,
        fixedName,
        fixedKey
      }
    }
  },

  // 一次性数据修复：给历史商品补 merchantId（WEB 端早期添加的没带这个字段）
  // 同时把 createTime 转为 createdAt（统一排序字段）
  async fixProductsMerchantId(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    // merchantId 可显式传入；否则取唯一商家
    let merchantId = params.merchantId
    if (!merchantId) {
      const m = await db.collection('merchants').limit(2).get()
      if (!m.data || !m.data.length) return { code: -1, msg: 'merchants 集合为空' }
      if (m.data.length > 1) return { code: -1, msg: '存在多个商家，请显式传 merchantId' }
      merchantId = m.data[0]._id
    }
    const all = await db.collection('products').limit(1000).get()
    const products = all.data || []
    let fixedMerchant = 0
    let fixedCreatedAt = 0
    for (const p of products) {
      const upd = {}
      if (!p.merchantId) {
        upd.merchantId = merchantId
        fixedMerchant++
      }
      if (!p.createdAt) {
        if (p.createTime) {
          upd.createdAt = new Date(Number(p.createTime))
        } else {
          upd.createdAt = new Date()
        }
        fixedCreatedAt++
      }
      if (Object.keys(upd).length) {
        upd.updatedAt = new Date()
        await db.collection('products').doc(p._id).update(upd)
      }
    }
    return { code: 0, data: { total: products.length, merchantId, fixedMerchant, fixedCreatedAt } }
  },

  async deleteProduct(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    await db.collection('products').doc(id).remove()
    return { code: 0, data: { success: true } }
  },

  // ==================== 分类管理 ====================

  async getBanners(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { status, position } = params
    let query = {}
    if (status !== undefined) query.status = status
    if (position) query.position = position
    const res = await db.collection('banners').where(query).orderBy('sort', 'asc').orderBy('createdAt', 'desc').get()
    return { code: 0, data: res.data || [] }
  },

  async addBanner(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { image, link, sort, position } = params
    if (!image) return { code: -1, msg: '璇蜂笂浼犺疆鎾浘鍥剧墖' }
    const banner = {
      image,
      link: link || '',
      sort: sort || 0,
      position: position || 'home',
      status: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const res = await db.collection('banners').add(banner)
    return { code: 0, data: { id: res.id }, msg: '娣诲姞鎴愬姛' }
  },

  async updateBanner(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, image, link, sort, position, status } = params
    if (!id) return { code: -1, msg: 'id蹇呭～' }
    const updateData = { updatedAt: new Date() }
    if (image !== undefined) updateData.image = image
    if (link !== undefined) updateData.link = link
    if (sort !== undefined) updateData.sort = sort
    if (position !== undefined) updateData.position = position
    if (status !== undefined) updateData.status = status
    await db.collection('banners').doc(id).update(updateData)
    return { code: 0, msg: '鏇存柊鎴愬姛' }
  },

  async deleteBanner(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    if (!id) return { code: -1, msg: 'id蹇呭～' }
    await db.collection('banners').doc(id).remove()
    return { code: 0, msg: '鍒犻櫎鎴愬姛' }
  },
  async syncCart({ userId, items }) {
    if (!userId) return { code: -1, msg: 'missing userId' }
    if (!Array.isArray(items)) return { code: -1, msg: 'items must be array' }
    const existing = await db.collection('carts').where({ userId }).get()
    if (existing.data && existing.data.length > 0) {
      await db.collection('carts').doc(existing.data[0]._id).update({ items, updatedAt: new Date() })
    } else {
      await db.collection('carts').add({ userId, items, createdAt: new Date(), updatedAt: new Date() })
    }
    return { code: 0, data: { msg: 'synced' } }
  },

  async getCart({ userId }) {
    if (!userId) return { code: -1, msg: 'missing userId' }
    const res = await db.collection('carts').where({ userId }).get()
    if (res.data && res.data.length > 0) {
      return { code: 0, data: { items: res.data[0].items || [] } }
    }
    return { code: 0, data: { items: [] } }
  },

  async clearCart({ userId }) {
    if (!userId) return { code: -1, msg: 'missing userId' }
    const existing = await db.collection('carts').where({ userId }).get()
    if (existing.data && existing.data.length > 0) {
      await db.collection('carts').doc(existing.data[0]._id).remove()
    }
    return { code: 0, data: { msg: 'cleared' } }
  },
  async getCategories(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    // merchantId 容错：传入的值在 merchants 集合里查不到时，fallback 到唯一商家
    let merchantId = params.merchantId
    if (merchantId) {
      const m = await db.collection('merchants').doc(merchantId).get()
      if (!m.data || !m.data.length) {
        const all = await db.collection('merchants').limit(2).get()
        if (all.data && all.data.length === 1) {
          merchantId = all.data[0]._id
        } else {
          merchantId = null
        }
      }
    } else {
      // 兜底：未传 merchantId 时取唯一商家
      const all = await db.collection('merchants').limit(2).get()
      if (all.data && all.data.length === 1) {
        merchantId = all.data[0]._id
      }
    }
    if (merchantId) where.merchantId = merchantId
    const r = await db.collection('categories').where(where).orderBy('sort', 'asc').get()
    return { code: 0, data: r.data || [] }
  },

  async addCategory(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const doc = { ...data, sort: data.sort || 0, createdAt: new Date(), updatedAt: new Date() }
    if (!doc._id) doc._id = 'c_' + Date.now()
    await db.collection('categories').add(doc)
    return { code: 0, data: { _id: doc._id } }
  },

  async updateCategory(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, ...update } = params
    update.updatedAt = new Date()
    await db.collection('categories').doc(id).update(update)
    return { code: 0, data: { success: true } }
  },

  async deleteCategory(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    await db.collection('categories').doc(id).remove()
    return { code: 0, data: { success: true } }
  },

  // 一次性数据修复：给历史 categories 补 merchantId（WEB 端早期添加的没带这个字段）
  // 同时把 createTime 转为 createdAt（统一排序字段）
  async fixCategoriesMerchantId(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    // merchantId 可显式传入；否则取唯一商家
    let merchantId = params.merchantId
    if (!merchantId) {
      const m = await db.collection('merchants').limit(2).get()
      if (!m.data || !m.data.length) return { code: -1, msg: 'merchants 集合为空' }
      if (m.data.length > 1) return { code: -1, msg: '存在多个商家，请显式传 merchantId' }
      merchantId = m.data[0]._id
    }
    const all = await db.collection('categories').limit(1000).get()
    const cats = all.data || []
    let fixedMerchant = 0
    let fixedCreatedAt = 0
    for (const c of cats) {
      const upd = {}
      if (!c.merchantId) {
        upd.merchantId = merchantId
        fixedMerchant++
      }
      if (!c.createdAt) {
        if (c.createTime) {
          upd.createdAt = new Date(Number(c.createTime))
        } else {
          upd.createdAt = new Date()
        }
        fixedCreatedAt++
      }
      if (Object.keys(upd).length) {
        upd.updatedAt = new Date()
        await db.collection('categories').doc(c._id).update(upd)
      }
    }
    return { code: 0, data: { total: cats.length, merchantId, fixedMerchant, fixedCreatedAt } }
  },

  // 一次性数据修复：把历史订单的中文 status 转成 canonical 英文值（用与 normalizeOrderStatus 同一张映射表）
  async fixOrdersStatus() {
    const all = await db.collection('orders').limit(2000).get()
    const orders = all.data || []
    let fixed = 0
    const breakdown = {}
    for (const o of orders) {
      const canonical = ORDER_STATUS_MAP[o.status]
      if (canonical && canonical !== o.status) {
        await db.collection('orders').doc(o._id).update({ status: canonical, updatedAt: new Date() })
        breakdown[o.status] = (breakdown[o.status] || 0) + 1
        fixed++
      }
    }
    return { code: 0, data: { total: orders.length, fixed, breakdown } }
  },

  // ==================== 订单管理 ====================

  async getOrders(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.merchantId) where.merchantId = params.merchantId
    if (params.userId) where.userId = params.userId
    if (params.riderId) where.riderId = params.riderId
    if (params.userPhone) where['address.phone'] = params.userPhone
    // status=all/全部 时不过滤；其他值才精确匹配
    if (params.status && params.status !== 'all') where.status = params.status
    if (params.deliveryStatus) where.deliveryStatus = params.deliveryStatus
    const pageSize = params.pageSize || 50
    const page = params.page || 1
    const keyword = (params.keyword || '').trim()

    // 关键词搜索：orderNo / 收货人手机 / 收货人姓名（address 是嵌套对象，jql 不便 where，走内存过滤）
    if (keyword) {
      // 拉大窗口（500）覆盖大部分商家单量，再内存过滤；避免分页把目标过滤掉
      const big = await db.collection('orders').where(where).limit(500).orderBy('createdAt', 'desc').get()
      const k = keyword.toLowerCase()
      const matched = (big.data || []).filter(o => {
        if (o.orderNo && String(o.orderNo).toLowerCase().includes(k)) return true
        const addr = o.address || {}
        if (addr.phone && String(addr.phone).includes(keyword)) return true
        if (addr.name && String(addr.name).includes(keyword)) return true
        if (o.customerPhone && String(o.customerPhone).includes(keyword)) return true
        return false
      })
      return { code: 0, data: matched }
    }

    const r = await db.collection('orders').where(where).skip((page - 1) * pageSize).limit(pageSize).orderBy('createdAt', 'desc').get()
    return { code: 0, data: r.data || [] }
  },

  async getOrderDetail(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = params.orderNo ? { orderNo: params.orderNo } : { _id: params._id || params.id }
    const r = await db.collection('orders').where(where).limit(1).get()
    return { code: 0, data: r.data && r.data[0] ? r.data[0] : null }
  },

  async applyRefund(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, orderNo, reason, type, images, userId } = params
    // 图片必填防御：与用户端提交校验双保险
    if (!Array.isArray(images) || images.length === 0) {
      return { code: -1, msg: '请上传至少1张图片' }
    }
    // 先查订单拿到 _id,后续 listRefunds / processRefund 都按 _id 关联
    // (用户端传的是 orderNo 字符串,直接存进 orderId 字段会导致 listRefunds 查不到)
    const where = orderNo ? { orderNo } : { _id: id }
    const orderRes = await db.collection('orders').where(where).limit(1).get()
    const order = orderRes.data && orderRes.data[0]
    if (!order) return { code: -1, msg: '订单不存在' }
    await db.collection('orders').doc(order._id).update({
      status: 'refunding',
      refundReason: reason,
      refundType: type || 'return_refund',
      updatedAt: new Date()
    })
    await db.collection('refunds').add({
      orderId: order._id,
      orderNo: order.orderNo,
      refundAmount: order.payAmount || order.totalAmount || 0,
      reason,
      // 新增字段:退款类型 / 图片凭证 / 申请人
      type: type || 'return_refund',
      images: images,
      userId: userId || null,
      status: 'pending',
      createdAt: new Date()
    })
    return { code: 0, data: { success: true } }
  },

  async processRefund(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, refundAmount, action, rejectReason } = params
    // 查 refund:id 可能是订单 _id(新数据)或 orderNo 字符串(老数据),两边都查一次
    let refundRes = await db.collection('refunds').where({ orderId: id }).limit(1).get()
    if (!refundRes.data || !refundRes.data.length) {
      refundRes = await db.collection('refunds').where({ orderNo: id }).limit(1).get()
    }
    const refund = refundRes.data && refundRes.data[0]
    if (!refund) return { code: -1, msg: '退款记录不存在' }
    // 拿订单 _id:refund.orderId 可能是 _id 也可能是 orderNo,统一反查一遍
    let orderDocId = refund.orderId
    const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(orderDocId || '')
    if (!looksLikeObjectId) {
      const searchNo = refund.orderNo || orderDocId
      if (searchNo) {
        const orderRes = await db.collection('orders').where({ orderNo: searchNo }).limit(1).get()
        const order = orderRes.data && orderRes.data[0]
        if (order) {
          orderDocId = order._id
          if (!refundAmount && order.payAmount) {
            refundAmount = order.payAmount
          }
        }
      }
    }
    if (!orderDocId) return { code: -1, msg: '订单不存在' }
    // 换货('exchange')不修改订单状态(不退款),其他类型才走 refunded/paid
    const isExchange = refund.type === 'exchange'
    if (!isExchange) {
      if (action === 'reject') {
        // 拒绝退款：保持订单原 status(refunding=历史订单)，额外写入退款拒绝状态与原因
        await db.collection('orders').doc(orderDocId).update({
          refundStatus: 'rejected',
          refundAmount,
          rejectReason: rejectReason || '不符合退款条件',
          updatedAt: new Date()
        })
      } else {
        await db.collection('orders').doc(orderDocId).update({
          status: 'refunded',
          refundAmount,
          updatedAt: new Date()
        })
      }
    }
    // 退款记录自身用 _id 准确定位(避免 orderId 模糊匹配多条)
    await db.collection('refunds').doc(refund._id).update({
      status: action === 'approve' ? 'approved' : 'rejected',
      refundAmount: isExchange ? (refundAmount || 0) : refundAmount,
      rejectReason: action === 'reject' ? (rejectReason || '不符合退款条件') : (refund.rejectReason || ''),
      processedAt: new Date()
    })
    return { code: 0, data: { success: true } }
  },

  // 商家公开信息(用户端拿电话用,只暴露 name+phone 不泄露敏感字段)
  async getMerchantPublicInfo(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const merchantId = params.merchantId
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }
    // 商家回退:同 getDashboard 的"全集合唯一商家"模式
    let targetId = merchantId
    let m = await db.collection('merchants').doc(merchantId).field({ name: true, phone: true }).get()
    if (!m.data || !m.data.length) {
      const all = await db.collection('merchants').limit(2).get()
      if (all.data && all.data.length === 1) {
        targetId = all.data[0]._id
        m = await db.collection('merchants').doc(targetId).field({ name: true, phone: true }).get()
      } else {
        return { code: -1, msg: '商家不存在' }
      }
    }
    return { code: 0, data: m.data && m.data[0] ? m.data[0] : null }
  },

  // 商家端退款审核列表:按 merchantId 隔离 + 状态过滤 + join 订单/用户
  async listRefunds(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const merchantId = params.merchantId
    const status = params.status || 'all'
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }
    // 商家回退
    let targetId = merchantId
    const m = await db.collection('merchants').doc(merchantId).get()
    if (!m.data || !m.data.length) {
      const all = await db.collection('merchants').limit(2).get()
      if (all.data && all.data.length === 1) targetId = all.data[0]._id
      else return { code: 0, data: [] }
    }
    // 查该商家所有订单的 _id 和 orderNo(用于反查退款)
    // 老 applyRefund 写入 refunds.orderId 存的是 orderNo 字符串(不是 _id),
    // 新版才存订单 _id。这里双路查询,新老数据都能匹配
    const ordersRes = await db.collection('orders').where({ merchantId: targetId }).field({ _id: true, orderNo: true, totalAmount: true, payAmount: true, items: true, status: true }).limit(2000).get()
    const orders = (ordersRes.data || [])
    const orderIds = orders.map(o => o._id).filter(Boolean)
    const orderNos = orders.map(o => o.orderNo).filter(Boolean)
    if (orderIds.length === 0 && orderNos.length === 0) return { code: 0, data: [] }
    // 拼退款查询:orderId(新数据) 或 orderNo(老数据)
    const conditions = []
    if (orderIds.length > 0) conditions.push({ orderId: dbCmd.in(orderIds) })
    if (orderNos.length > 0) conditions.push({ orderNo: dbCmd.in(orderNos) })
    let where = conditions.length > 1 ? dbCmd.or(conditions) : conditions[0]
    if (status !== 'all') {
      where = dbCmd.and([where, { status }])
    }
    const refundsRes = await db.collection('refunds').where(where).orderBy('createdAt', 'desc').limit(100).get()
    if (!refundsRes.data || refundsRes.data.length === 0) return { code: 0, data: [] }
    // join 订单(拿 totalAmount):同时按 _id 和 orderNo 索引,兼容老数据用 orderNo 当 orderId
    const orderMap = {}
    for (const o of orders) {
      if (o._id) orderMap[o._id] = o
      if (o.orderNo) orderMap[o.orderNo] = o
    }
    // join 用户(拿昵称/手机/头像)
    const userIds = [...new Set(refundsRes.data.map(r => r.userId).filter(Boolean))]
    const userMap = {}
    if (userIds.length > 0) {
      const usersRes = await db.collection('users').where({ _id: dbCmd.in(userIds) }).field({ nickname: true, phone: true, avatar: true }).get()
      for (const u of (usersRes.data || [])) userMap[u._id] = u
    }
    // 图片 fileID → 永久 https URL(uniCloud mp- 空间 fileID 须走此转换,小程序 image 组件直接吃 cloud:// 会失败)
    const allFileIds = []
    for (const r of refundsRes.data) {
      if (Array.isArray(r.images)) allFileIds.push(...r.images)
    }
    let fileIdMap = {}
    if (allFileIds.length > 0) {
      try {
        const tempRes = await uniCloud.getTempFileURL({ fileList: allFileIds })
        for (const f of (tempRes.fileList || [])) {
          if (f.fileID && f.tempFileURL) fileIdMap[f.fileID] = f.tempFileURL
        }
      } catch (e) {
        console.warn('[listRefunds] getTempFileURL failed:', e)
      }
    }
    const data = refundsRes.data.map(r => {
      const images = Array.isArray(r.images) ? r.images.map(fid => fileIdMap[fid] || fid) : []
      return {
        ...r,
        images,
        order: orderMap[r.orderId] || null,
        user: r.userId ? (userMap[r.userId] || null) : null
      }
    })
    return { code: 0, data }
  },

  async deleteOrder(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, orderNo } = params
    const where = orderNo ? { orderNo } : { _id: id }
    await db.collection('orders').where(where).remove()
    return { code: 0, data: { success: true } }
  },

  // ==================== 小区管理 ====================

  async getCommunities(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    let r
    if (params.merchantId) {
      // 取该商家的小区 + 没有归属的老数据（保证 APP/WEB 两端看到一致结果）
      r = await db.collection('communities').where(dbCmd.or([
        { merchantId: params.merchantId },
        { merchantId: '' },
        { merchantId: null }
      ])).get()
    } else {
      r = await db.collection('communities').get()
    }
    return { code: 0, data: r.data || [] }
  },

  async addCommunity(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const doc = { ...data, houseCount: data.houseCount || 0, userCount: data.userCount || 0, status: data.status || 'active', createdAt: new Date(), updatedAt: new Date() }
    if (!doc._id) doc._id = 'cm_' + Date.now()
    await db.collection('communities').add(doc)
    return { code: 0, data: { _id: doc._id } }
  },

  async updateCommunity(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, ...update } = params
    update.updatedAt = new Date()
    await db.collection('communities').doc(id).update(update)
    return { code: 0, data: { success: true } }
  },

  async deleteCommunity(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    await db.collection('communities').doc(id).remove()
    return { code: 0, data: { success: true } }
  },

  // ==================== 骑手管理 ====================

  async getRiders(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.merchantId) where.merchantId = params.merchantId
    if (params.riderStatus) where.riderStatus = params.riderStatus
    const r = await db.collection('riders').where(where).get()
    return { code: 0, data: r.data || [] }
  },

  async addRider(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const doc = { ...data, rating: 5.0, deliveryCount: 0, riderStatus: data.riderStatus || 'idle', createdAt: new Date(), updatedAt: new Date() }
    if (!doc._id) doc._id = 'r_' + Date.now()
    await db.collection('riders').add(doc)
    return { code: 0, data: { _id: doc._id } }
  },

  async updateRider(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, ...update } = params
    update.updatedAt = new Date()
    await db.collection('riders').doc(id).update(update)
    return { code: 0, data: { success: true } }
  },

  async deleteRider(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    await db.collection('riders').doc(id).remove()
    return { code: 0, data: { success: true } }
  },

  async autoAssignOrders() {
    const idleRiders = await db.collection('riders').where({ riderStatus: 'idle' }).limit(1).get()
    if (!idleRiders.data || !idleRiders.data.length) return { code: 0, data: { assigned: 0 } }
    const riderId = idleRiders.data[0]._id
    const pendingOrders = await db.collection('orders').where({ status: 'paid', riderId: dbCmd.exists(false), deliveryType: dbCmd.neq('self') }).limit(10).get()
    let count = 0
    for (const o of pendingOrders.data || []) {
      await db.collection('orders').doc(o._id).update({ riderId, status: 'sorting', updatedAt: new Date() })
      count++
    }
    return { code: 0, data: { assigned: count, riderId } }
  },

  // 一次性：给所有老订单补 deliveryType='self'（按用户端默认行为兜底）
  async backfillDeliveryType() {
    const all = await db.collection('orders').where({ deliveryType: dbCmd.exists(false) }).limit(2000).get()
    let n = 0
    for (const o of (all.data || [])) {
      await db.collection('orders').doc(o._id).update({ deliveryType: 'self' })
      n++
    }
    return { code: 0, data: { updated: n, total: (all.data || []).length } }
  },

  async riderLogin(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { phone, password } = params
    let rider = null
    if (uniID) {
      const res = await this.uniID.login({ username: phone, password, queryField: ['phone'] })
      if (res.errCode) return { code: -1, msg: res.errMsg }
      const r = await db.collection('riders').where({ _id: res.uid }).get()
      rider = r.data && r.data[0]
    } else {
      rider = await plainPwdMatch('riders', phone, password)
    }
    if (!rider) return { code: -1, msg: '账号或密码错误' }
    return {
      code: 0,
      data: {
        riderId: rider._id,
        token: 'rider_' + rider._id,
        tokenExpired: Date.now() + 7200000,
        riderInfo: rider
      }
    }
  },

  async riderGetOrders(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { riderId, status, deliveryStatus } = params
    const where = { riderId, deliveryType: dbCmd.neq('self') }
    if (status) where.status = status
    if (deliveryStatus) where.deliveryStatus = deliveryStatus
    const r = await db.collection('orders').where(where).orderBy('createdAt', 'desc').limit(50).get()
    return { code: 0, data: r.data || [] }
  },

  // 骑手抢单池：商家已确认分拣、待骑手接单的订单（按 merchantId 隔离）
  async riderGetAvailableOrders(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const merchantId = params.merchantId
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }
    const r = await db.collection('orders')
      .where({ merchantId, status: 'sorting', deliveryType: dbCmd.neq('self') })
      .orderBy('createdAt', 'asc')
      .limit(50)
      .get()
    // 排除已被骑手接走的（riderId 已存在）
    const list = (r.data || []).filter(o => !o.riderId)
    return { code: 0, data: list }
  },

  // 骑手抢单：把订单分配给自己，订单进入配送中
  async riderClaimOrder(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const orderId = params.orderId
    const riderId = params.riderId
    if (!orderId || !riderId) return { code: -1, msg: 'orderId 和 riderId 必填' }
    // 先读再写，避免覆盖别人的接单
    const r = await db.collection('orders').doc(orderId).get()
    const order = r.data && r.data[0]
    if (!order) return { code: -1, msg: '订单不存在' }
    if (order.deliveryType === 'self') return { code: -1, msg: '该订单为自提单，无需骑手配送' }
    if (order.riderId && order.riderId !== riderId) return { code: -1, msg: '订单已被其他骑手接走' }
    await db.collection('orders').doc(orderId).update({
      riderId,
      deliveryStatus: 'delivering',
      status: 'delivering',
      pickedUpAt: new Date(),
      updatedAt: new Date()
    })
    return { code: 0, data: { success: true } }
  },

  // 一次性修复脚本：老骑手账号没绑 merchantId，按 phone 反推补上
  // 1) 优先用最近订单的 merchantId；2) 否则用唯一的 merchant
  async fixRiderMerchantId(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const phone = params.phone
    if (!phone) return { code: -1, msg: 'phone 必填' }
    const r = await db.collection('riders').where({ phone }).get()
    const rider = r.data && r.data[0]
    if (!rider) return { code: -1, msg: '骑手不存在' }
    if (rider.merchantId) return { code: 0, data: { merchantId: rider.merchantId, fixed: false, msg: 'merchantId 已存在' } }
    let merchantId = null
    // 1) 最近订单的 merchantId
    const o = await db.collection('orders').where({ riderId: rider._id }).orderBy('createdAt', 'desc').limit(1).get()
    if (o.data && o.data[0] && o.data[0].merchantId) {
      merchantId = o.data[0].merchantId
    } else {
      // 2) 单商家场景：直接用唯一的那个
      const m = await db.collection('merchants').limit(2).get()
      if (m.data && m.data.length === 1) {
        merchantId = m.data[0]._id
      }
    }
    if (!merchantId) return { code: -1, msg: '反推不到 merchantId，请商家在骑手管理里删了重加' }
    await db.collection('riders').doc(rider._id).update({ merchantId, updatedAt: new Date() })
    return { code: 0, data: { merchantId, fixed: true, msg: '已自动补上' } }
  },

  async riderToggleStatus(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { riderId, status } = params
    await db.collection('riders').doc(riderId).update({ riderStatus, updatedAt: new Date() })
    return { code: 0, data: { success: true } }
  },

  async riderChangePassword(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { riderId, oldPassword, newPassword } = params
    const r = await db.collection('riders').doc(riderId).get()
    const rider = r.data && r.data[0]
    if (!rider) return { code: -1, msg: '骑手不存在' }
    if (rider.password !== oldPassword) return { code: -1, msg: '原密码错误' }
    await db.collection('riders').doc(riderId).update({ password: newPassword, updatedAt: new Date() })
    return { code: 0, data: { success: true } }
  },

  // ==================== 商家看板 / 报表 ====================

  async getDashboard(params) {
    // 统一从 this.event 拿真实入参（URL 化下解构签名不可靠，_before 已挂到 this.event）
    const _p = (params && Object.keys(params).length) ? params : (this.event || {})
    let merchantId = _p.merchantId
    const timeFilter = _p.timeFilter || 'today'
    const customDate = _p.customDate || ''
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }

    // 商家回退:与 getProducts 一致(行 706-718)。存储里的 merchantId 在 merchants 表里查不到时(uni-id 登录
    // 返回的 uid 与 fixProductsMerchantId 回填的真实 ID 不一致),改用唯一商家,避免静默返回 0。
    {
      const m = await db.collection('merchants').doc(merchantId).get()
      if (!m.data || !m.data.length) {
        const all = await db.collection('merchants').limit(2).get()
        if (all.data && all.data.length === 1) {
          merchantId = all.data[0]._id
        }
      }
    }

    const range = computeTimeRange(timeFilter, customDate)
    const startMs = range.start.getTime()
    const endMs = range.end.getTime()

    // 一次拉完该商家全部订单。limit 10000 处理大单量场景;按 _id 默认排序,不能保证覆盖时间窗口
    // 内的所有单子,所以时间窗口内的统计走下面的 DB 级 createdAt 过滤单独查
    // merchantId 兜底:storage 里的 ID 与实际订单的 ID 不一致(老登录残留 / fixOrders 漏跑),先按 merchantId 查,
    // 若返回 0 单再降级去掉 merchantId(单商家场景);保证至少能拿到数据
    let all = await db.collection('orders').where({ merchantId }).limit(10000).get()
    let list = (all.data || []).filter(o => o.createdAt)
    if (list.length === 0) {
      const fallback = await db.collection('orders').limit(10000).get()
      list = (fallback.data || []).filter(o => o.createdAt)
      console.warn('[getDashboard] orders 按 merchantId 查为空,降级全集合,共:', list.length)
    }

    // 4 卡片:核心语义改为"时间窗口内完成的订单"。
    // 旧版按 createdAt 在窗口内:商家昨天创建今天确认完成的订单会被漏算,实测少了 1 单。
    // 优先用 completedAt(精准),缺省兜底用 updatedAt(老数据未补写 completedAt)。
    // 这里在内存里按 status='completed' + 完成时间过滤,比 DB 级 dbCmd.and 更可靠(uniCloud 某些版本
    // 对 OR/AND 复合条件支持不完整,内存过滤无此隐患)。
    const inRange = list.filter(o => {
      if (normalizeOrderStatus(o.status) !== 'completed') return false
      const t = o.completedAt ? new Date(o.completedAt).getTime()
            : o.updatedAt  ? new Date(o.updatedAt).getTime() : 0
      return t >= startMs && t <= endMs
    })
    // 旧版口径(按 createdAt 在窗口内的全部订单)保留,仅做诊断日志用,不下发
    const legacyInRange = list.filter(o => {
      const t = new Date(o.createdAt).getTime()
      return t >= startMs && t <= endMs
    })
    console.log('[getDashboard] inRange(completed-in-window):', inRange.length, 'timeFilter:', timeFilter, 'range:', { startMs, endMs })
    console.log('[getDashboard] legacyInRange(created-in-window):', legacyInRange.length, 'inRange.length:', inRange.length)
    console.log('[getDashboard] inRange detail:', inRange.map(o => ({
      _id: o._id, orderNo: o.orderNo, createdAt: o.createdAt, updatedAt: o.updatedAt, completedAt: o.completedAt, status: o.status
    })))
    const todayOrders = inRange.length
    // 销售额用同一组完成订单,口径一致
    const totalSales = inRange
      .reduce((s, o) => s + (Number(o.payAmount || o.totalAmount) || 0), 0)

    // 待处理：所有未完成订单（与 4 圈圈口径一致，不受 timeFilter 影响）
    // 用 normalizeOrderStatus 兼容 canonical 英文值 + 中文标签（如"已接单"）
    const pendingOrders = list.filter(o =>
      ['pending_payment', 'paid', 'pending_sorting', 'sorting', 'refunding'].includes(normalizeOrderStatus(o.status))
    ).length

    // 4 状态圈圈：所有时间累计
    const counts = {
      pending_payment: list.filter(o => normalizeOrderStatus(o.status) === 'pending_payment').length,
      pending_sorting: list.filter(o => ['paid', 'pending_sorting'].includes(normalizeOrderStatus(o.status))).length,
      delivering: list.filter(o => normalizeOrderStatus(o.status) === 'delivering').length,
      completed: list.filter(o => normalizeOrderStatus(o.status) === 'completed').length
    }

    // 在线商品：商品管理(全部 products) + 团购特惠页面(fsp_)总和
    // 不按 merchantId 过滤:单商家场景,storage 里的 merchantId 与数据里可能不一致(uni-id uid vs seed m_test_001),
    // 硬卡 merchantId 会静默返回 0。商家要的是"自己平台上有多少商品",直接全集合计数最稳。
    // 用 .get() 代替 .count(),某些 uniCloud 版本 .count() 不带 where 时返回结构异常
    const allProductsRes = await db.collection('products').limit(2000).get()
    const productCount = (allProductsRes.data || []).length
    const fsAll = await db.collection('flash_sales').limit(500).get()
    const flashSaleProductCount = (fsAll.data || []).reduce((sum, fs) => sum + ((fs.products || []).length), 0)
    const onlineProducts = productCount + flashSaleProductCount
    console.log('[getDashboard] onlineProducts breakdown:', { productCount, flashSaleProductCount, onlineProducts, totalProducts: productCount, totalFsDocs: (fsAll.data || []).length })

    // 访客数 + 转化率:从 product_views 聚合(同 viewerId 同日去重由 _id 唯一约束保证)
    const viewsAll = await db.collection('product_views').where({ merchantId }).limit(50000).get()
    const viewList = (viewsAll.data || []).filter(v => {
      const t = new Date(v.createdAt).getTime()
      return t >= startMs && t <= endMs
    })
    const visitorSet = new Set(viewList.map(v => v.viewerId || 'anon'))
    const totalVisitors = visitorSet.size
    // 转化率:窗口内完成的订单 / 窗口内独立访客,与"今日订单"口径一致(都是完成时间)
    const completedCount = inRange.length
    const conversionRate = totalVisitors > 0 ? Number((completedCount / totalVisitors * 100).toFixed(1)) : 0

    return {
      code: 0,
      data: {
        timeRange: { type: timeFilter, label: range.label, start: range.start, end: range.end },
        todayOrders,
        totalSales: Number(totalSales.toFixed(2)),
        totalVisitors,
        conversionRate,
        pendingOrders,
        onlineProducts,
        counts,
        // 调试用:可帮助确认云函数是否跑的是新代码
        _debug: { productCount, flashSaleProductCount, totalProducts: productCount }
      }
    }
  },

  // 数据报表:总览 4 卡片复用 getDashboard,补全销售趋势 / 商品排行 / 分类占比
  async getReportData(params) {
    const _p = (params && Object.keys(params).length) ? params : (this.event || {})
    let merchantId = _p.merchantId
    const timeFilter = _p.timeFilter || 'today'
    const customDate = _p.customDate || ''
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }

    // 商家回退:与 getDashboard 一致
    {
      const m = await db.collection('merchants').doc(merchantId).get()
      if (!m.data || !m.data.length) {
        const all = await db.collection('merchants').limit(2).get()
        if (all.data && all.data.length === 1) {
          merchantId = all.data[0]._id
        }
      }
    }

    const range = computeTimeRange(timeFilter, customDate)
    const startMs = range.start.getTime()
    const endMs = range.end.getTime()

    // 拉订单:走 status='completed' 索引(单商家场景下命中率高,避免 5000 上限截断)
    // 完成时间窗口在内存里二次过滤(uniCloud 的 OR/AND 复合不靠谱,内存过滤更稳)
    // merchantId 兜底:与 getDashboard 一致,storage ID 与实际 ID 不一致时降级全集合
    let ordersRes = await db.collection('orders').where({
      merchantId,
      status: 'completed'
    }).limit(5000).get()
    let allCompleted = ordersRes.data || []
    if (allCompleted.length === 0) {
      const fb = await db.collection('orders').where({
        status: 'completed'
      }).limit(5000).get()
      allCompleted = fb.data || []
      if (allCompleted.length > 0) {
        console.warn('[getReportData] orders 按 merchantId 查为空,降级全集合,共:', allCompleted.length)
      }
    }
    // 内存过滤:完成时间在窗口内(优先 completedAt,缺省 updatedAt 兜底)
    const orders = allCompleted.filter(o => {
      const t = o.completedAt ? new Date(o.completedAt).getTime()
            : o.updatedAt  ? new Date(o.updatedAt).getTime() : 0
      return t >= startMs && t <= endMs
    })
    console.log('[getReportData] inWindow(completed):', orders.length, 'timeFilter:', timeFilter, 'allCompleted:', allCompleted.length)

    // 1. 销售趋势:按时段分桶
    // today → 按小时(0-23); week → 按天(7 天); month → 按天(本月 1-30/31)
    const buckets = []
    const now = new Date()
    if (timeFilter === 'today') {
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
      for (let h = 0; h < 24; h++) {
        buckets.push({
          label: h + '时',
          start: dayStart.getTime() + h * 3600000,
          end:   dayStart.getTime() + (h + 1) * 3600000
        })
      }
    } else if (timeFilter === 'week') {
      const monday = new Date(now)
      monday.setDate(now.getDate() - ((monday.getDay() + 6) % 7))
      monday.setHours(0, 0, 0, 0)
      for (let d = 0; d < 7; d++) {
        const dayStart = new Date(monday); dayStart.setDate(monday.getDate() + d)
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1)
        buckets.push({
          label: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][d],
          start: dayStart.getTime(),
          end: dayEnd.getTime()
        })
      }
    } else if (timeFilter === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const days = Math.round((last - first) / 86400000)
      for (let d = 0; d < days; d++) {
        const dayStart = new Date(first); dayStart.setDate(first.getDate() + d)
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1)
        buckets.push({
          label: (d + 1) + '日',
          start: dayStart.getTime(),
          end: dayEnd.getTime()
        })
      }
    } else {
      // custom 或兜底:按 6 段均分
      const step = Math.max(1, Math.floor((endMs - startMs) / 6))
      for (let i = 0; i < 6; i++) {
        buckets.push({
          label: '段' + (i + 1),
          start: startMs + i * step,
          end: startMs + (i + 1) * step
        })
      }
    }
    // 销售趋势:按"完成时间"分桶(旧版按 createdAt 会漏算跨日完成的订单)
    const salesTrend = buckets.map(b => {
      const inBucket = orders.filter(o => {
        const t = o.completedAt ? new Date(o.completedAt).getTime()
              : o.updatedAt  ? new Date(o.updatedAt).getTime() : 0
        return t >= b.start && t < b.end
      })
      const value = inBucket.reduce((s, o) => s + (Number(o.payAmount || o.totalAmount) || 0), 0)
      return { label: b.label, value: Number(value.toFixed(2)) }
    })

    // 2. 商品销售排行:聚合 orders.items,按 productId 累计 qty + amount,top 10
    const productAgg = {}
    for (const o of orders) {
      for (const it of (o.items || [])) {
        const key = it.productId || it.name  // 兼容没 productId 的
        if (!key) continue
        if (!productAgg[key]) {
          productAgg[key] = {
            productId: it.productId || null,
            name: it.name || '未知商品',
            qty: 0,
            amount: 0
          }
        }
        productAgg[key].qty += Number(it.qty || 0)
        productAgg[key].amount += Number(it.itemTotal || (it.price * it.qty) || 0)
      }
    }
    const productRanking = Object.values(productAgg)
      .map(p => ({ ...p, amount: Number(p.amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // 3. 分类销售占比:item.categoryId 优先,否则 item.name 查 products.name → categoryName,再否则「其他」
    // 同 getDashboard:不卡 merchantId(单商家场景,storage 的 ID 与数据 ID 可能不一致)
    const allProducts = await db.collection('products').limit(2000).get()
    const nameToCat = {}
    for (const p of (allProducts.data || [])) {
      if (p.name && p.categoryName) {
        if (!nameToCat[p.name]) nameToCat[p.name] = p.categoryName
        if (p.categoryId && p.categoryName) {
          nameToCat[p.categoryId] = p.categoryName
        }
      }
    }
    const catAgg = {}
    let catTotal = 0
    for (const o of orders) {
      for (const it of (o.items || [])) {
        let catName = null
        if (it.categoryId && nameToCat[it.categoryId]) catName = nameToCat[it.categoryId]
        else if (it.categoryName) catName = it.categoryName
        else if (it.name && nameToCat[it.name]) catName = nameToCat[it.name]
        if (!catName) catName = '其他'
        const amt = Number(it.itemTotal || (it.price * it.qty) || 0)
        if (!catAgg[catName]) catAgg[catName] = { name: catName, amount: 0, qty: 0 }
        catAgg[catName].amount += amt
        catAgg[catName].qty += Number(it.qty || 0)
        catTotal += amt
      }
    }
    const COLORS = ['#4CAF50', '#FF6B00', '#2196F3', '#9C27B0', '#607D8B', '#FFC107', '#E91E63', '#00BCD4']
    const categoryShare = Object.values(catAgg)
      .map((c, i) => ({
        name: c.name,
        amount: Number(c.amount.toFixed(2)),
        qty: c.qty,
        percent: catTotal > 0 ? Number((c.amount / catTotal * 100).toFixed(1)) : 0,
        color: COLORS[i % COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount)

    return {
      code: 0,
      data: {
        salesTrend,
        productRanking,
        categoryShare,
        totalAmount: Number(catTotal.toFixed(2))
      }
    }
  },

  // ==================== IM 通讯 ====================

  async getConversations(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.merchantId) where.merchantId = params.merchantId
    if (params.userId) where.userId = params.userId
    // 线上老数据用 lastMessageTime（不是 lastMessageAt）
    const r = await db.collection('conversations').where(where).orderBy('lastMessageTime', 'desc').get()
    return { code: 0, data: r.data || [] }
  },

  // 创建或获取已存在的会话（按 merchantId+userId 查重，兼容老数据随机 _id）
  async createConversation(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const { merchantId, userId, userName, orderNo } = data
    if (!merchantId || !userId) return { code: -1, msg: 'merchantId 和 userId 必填' }

    // 查 user 表，拿到真实昵称/头像（用来补全 userName，兼容老会话 userName 字段缺失）
    const userRes = await db.collection('users').where({ _id: userId }).limit(1).get()
    const realUser = userRes.data && userRes.data[0]
    const realUserName = (realUser && (realUser.nickname || realUser.userName)) || userName || ('用户_' + String(userId).slice(-4))

    // 查重：用 where 查同 merchantId+userId 的会话（老数据 _id 是随机的，不能用 doc 查询）
    const exist = await db.collection('conversations').where({ merchantId, userId }).limit(1).get()
    if (exist.data && exist.data[0]) {
      const conv = exist.data[0]
      const update = { updatedAt: new Date() }
      // 始终用真实昵称回写（覆盖老数据里 fallback 的"用户_xxxx"）
      if (realUserName) update.userName = realUserName
      if (orderNo && !conv.orderNo) update.orderNo = orderNo
      if (Object.keys(update).length > 1) {
        await db.collection('conversations').doc(conv._id).update(update)
      }
      return { code: 0, data: { ...conv, ...update } }
    }
    // 新建：字段名跟老数据一致（lastMessageTime / unreadMerchant / unreadUser）
    const now = new Date()
    const conv = {
      merchantId,
      userId,
      userName: realUserName,
      orderNo: orderNo || '',
      lastMessage: '',
      lastMessageTime: now,
      unreadUser: 0,
      unreadMerchant: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    const addRes = await db.collection('conversations').add(conv)
    return { code: 0, data: { _id: addRes.id, ...conv } }
  },

  // 标记会话已读/已解决/重新打开
  async updateConversation(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const { conversationId, status, resetUnread, resetUnreadFor } = data
    if (!conversationId) return { code: -1, msg: 'conversationId 必填' }
    const update = { updatedAt: new Date() }
    if (status) update.status = status
    if (resetUnread) {
      // 默认归零商家侧未读；可选归零用户侧
      update.unreadMerchant = 0
      if (resetUnreadFor === 'user') update.unreadUser = 0
    }
    await db.collection('conversations').doc(conversationId).update(update)
    return { code: 0, data: { success: true } }
  },

  async getMessages(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.conversationId) where.conversationId = params.conversationId
    // 不按 merchantId 过滤：老消息 merchantId 可能是 'default'、'm_test_001' 等不一致值，
    // 商家端 request 会自动注入当前 merchantId，过滤会查不到老数据
    if (params.lastTimestamp) {
      // 老数据用 createTime（毫秒时间戳）
      const ts = Number(params.lastTimestamp)
      if (!isNaN(ts)) {
        where.createTime = dbCmd.gt(ts)
      }
    }
    const r = await db.collection('messages').where(where).orderBy('createTime', 'asc').limit(200).get()
    return { code: 0, data: r.data || [] }
  },

  async sendMessage(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    // 兼容老字段：senderType/senderId；role 视为 senderType 的别名
    const senderType = data.senderType || data.role || 'merchant'
    const senderId = data.senderId || (senderType === 'merchant' ? (data.merchantId || 'merchant') : (data.userId || ''))
    const { content, type, conversationId: cidIn, senderName } = data
    if (!content) return { code: -1, msg: 'content 必填' }
    // 找 conversationId：优先用入参，否则按 merchantId+userId 查
    let conversationId = cidIn
    if (!conversationId && data.merchantId && data.userId) {
      const c = await db.collection('conversations').where({ merchantId: data.merchantId, userId: data.userId }).limit(1).get()
      if (c.data && c.data[0]) conversationId = c.data[0]._id
    }
    if (!conversationId) return { code: -1, msg: '会话不存在，请先 createConversation' }
    const now = Date.now()
    // 字段名跟老数据一致：senderId/senderType/createTime/isRead/type
    const doc = {
      conversationId,
      senderId,
      senderType,
      senderName: senderName || '',
      content,
      type: type || 'text',
      isRead: false,
      createTime: now
    }
    await db.collection('messages').add(doc)
    // 更新会话：lastMessage / lastMessageTime / 对方 unread++
    const isFromMerchant = senderType === 'merchant'
    const convUpdate = {
      lastMessage: content,
      lastMessageTime: now,
      updatedAt: new Date()
    }
    if (!isFromMerchant) {
      try {
        const cur = await db.collection('conversations').doc(conversationId).get()
        if (cur.data && cur.data[0]) {
          convUpdate.unreadMerchant = (cur.data[0].unreadMerchant || 0) + 1
        }
      } catch (e) {}
    } else {
      try {
        const cur = await db.collection('conversations').doc(conversationId).get()
        if (cur.data && cur.data[0]) {
          convUpdate.unreadUser = (cur.data[0].unreadUser || 0) + 1
        }
      } catch (e) {}
    }
    await db.collection('conversations').doc(conversationId).update(convUpdate)
    return { code: 0, data: { conversationId, message: { ...doc, createTime: now } } }
  },

  async markAsRead(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { conversationId, senderType } = params
    const where = {}
    if (conversationId) where.conversationId = conversationId
    if (senderType) where.senderType = senderType
    if (Object.keys(where).length === 0) return { code: -1, msg: '至少传一个过滤条件' }
    // 老数据用 isRead 字段
    await db.collection('messages').where(where).update({ isRead: true })
    // 同步把会话的对应端 unread 归零
    if (conversationId) {
      const convUpdate = { updatedAt: new Date() }
      if (senderType === 'user') convUpdate.unreadMerchant = 0
      if (senderType === 'merchant') convUpdate.unreadUser = 0
      if (Object.keys(convUpdate).length > 1) {
        await db.collection('conversations').doc(conversationId).update(convUpdate)
      }
    }
    return { code: 0, data: { success: true } }
  },

  // ==================== 特惠（Flash Sale） ====================

  async getFlashSale(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.merchantId) where.merchantId = params.merchantId
    const r = await db.collection('flash_sales').where(where).orderBy('startTime', 'desc').get()
    const list = r.data || []
    // 旧数据无 type 字段,默认视为 fixed
    const tagged = list.map(s => ({ ...s, type: s.type || 'fixed' }))
    // 内存互斥:同 merchantId 下,若 daily 有 status=true,则把同 merchant 所有 fixed 标 false;反之亦然(防止脏数据被读到)
    const grouped = {}
    for (const s of tagged) {
      const k = s.merchantId || '_no_merchant_'
      if (!grouped[k]) grouped[k] = []
      grouped[k].push(s)
    }
    for (const k of Object.keys(grouped)) {
      const items = grouped[k]
      const hasDailyOpen = items.some(s => s.type === 'daily' && s.status === true)
      const hasFixedOpen = items.some(s => s.type === 'fixed' && s.status === true)
      for (const s of items) {
        if (hasDailyOpen && s.type === 'fixed') s.status = false
        if (hasFixedOpen && s.type === 'daily') s.status = false
      }
    }
    return { code: 0, data: tagged }
  },

  async saveFlashSale(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    // 兼容前端传 id 或 _id
    const existingId = data._id || data.id
    const docType = data.type || 'fixed'
    const merchantId = data.merchantId || null
    let savedId = existingId
    if (existingId) {
      // update：不改 createdAt，不接受前端传 id
      const update = {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        type: docType,
        dailyStart: data.dailyStart || null,
        dailyEnd: data.dailyEnd || null,
        merchantId: merchantId,
        updatedAt: new Date()
      }
      await db.collection('flash_sales').doc(existingId).update(update)
    } else {
      // add
      const doc = {
        _id: 'fs_' + Date.now(),
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status !== undefined ? data.status : true,
        type: docType,
        dailyStart: data.dailyStart || null,
        dailyEnd: data.dailyEnd || null,
        merchantId: merchantId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await db.collection('flash_sales').add(doc)
      savedId = doc._id
    }
    // 写库互斥:status=true 时,关闭同 merchantId 下其它已开启的 daily + 全部已开启的异 type
    if (data.status === true) {
      const otherType = docType === 'daily' ? 'fixed' : 'daily'
      // 关闭同 type 其它已开启的(排除自己)
      const sameTypeWhere = { type: docType, status: true }
      if (merchantId) sameTypeWhere.merchantId = merchantId
      if (savedId) sameTypeWhere._id = db.command.neq(savedId)
      await db.collection('flash_sales').where(sameTypeWhere).update({ status: false, updatedAt: new Date() })
      // 关闭异 type 全部已开启的
      const otherTypeWhere = { type: otherType, status: true }
      if (merchantId) otherTypeWhere.merchantId = merchantId
      await db.collection('flash_sales').where(otherTypeWhere).update({ status: false, updatedAt: new Date() })
      // 把自己重新打开(防止 same type 误关到自己;虽然有 _id neq 但还是显式置回)
      if (savedId) {
        await db.collection('flash_sales').doc(savedId).update({ status: true, updatedAt: new Date() })
      }
    }
    return { code: 0, data: { id: savedId, _id: savedId } }
  },

  // ==================== 特惠商品（Flash Sale Products） ====================
  // flash_sale_products 是特惠活动下的商品子集。为简化模型，存在 flash_sales.doc.products 数组里

  async getFlashSaleProducts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { flashSaleId } = params
    const r = await db.collection('flash_sales').doc(flashSaleId).get()
    const fs = r.data && r.data[0]
    let list = (fs && fs.products) || []
    // 兜底:daily 文档无商品时,自动读同 merchant 的 fixed 文档的商品(商品只存一处,统一从固定活动拿)
    if (list.length === 0 && fs && (fs.type || 'fixed') === 'daily' && fs.merchantId) {
      const fb = await db.collection('flash_sales')
        .where({ merchantId: fs.merchantId, type: 'fixed' })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
      const fixedDoc = fb.data && fb.data[0]
      if (fixedDoc) list = fixedDoc.products || []
    }
    await resolveFileIdsInItems(list)
    return { code: 0, data: list }
  },

  async addFlashSaleProduct(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    // 前端 saveProduct / addSelectedProducts 发的是 name/image/originalPrice/flashPrice/stock/specs
    // 可选 categoryId/categoryName(从商品库选时由商家端 addFromLib 传入),用于报表分类占比聚合
    const { flashSaleId, name, image, originalPrice, flashPrice, stock, specs, categoryId, categoryName } = params
    if (!flashSaleId) return { code: -1, msg: 'flashSaleId 必填' }
    const r = await db.collection('flash_sales').doc(flashSaleId).get()
    const fs = r.data && r.data[0]
    if (!fs) return { code: -1, msg: '特惠活动不存在' }
    const newProduct = {
      _id: 'fsp_' + Date.now(),
      name, image, originalPrice, flashPrice, stock,
      specs: specs || [],
      categoryId: categoryId || null,
      categoryName: categoryName || null
    }
    const products = (fs.products || []).concat([newProduct])
    await db.collection('flash_sales').doc(flashSaleId).update({ products, updatedAt: new Date() })
    return { code: 0, data: { success: true, product: newProduct } }
  },

  async updateFlashSaleProduct(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, name, image, originalPrice, flashPrice, stock, specs } = params
    if (!id) return { code: -1, msg: 'id 必填' }
    const r = await db.collection('flash_sales').get()
    const sales = r.data || []
    const owner = sales.find(fs => (fs.products || []).some(p => p._id === id))
    if (!owner) return { code: -1, msg: '特惠商品不存在' }
    const newProducts = (owner.products || []).map(p => p._id === id
      ? { ...p, name, image, originalPrice, flashPrice, stock, specs: specs || p.specs || [] }
      : p)
    await db.collection('flash_sales').doc(owner._id).update({ products: newProducts, updatedAt: new Date() })
    return { code: 0, data: { success: true } }
  },

  async deleteFlashSaleProduct(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    if (!id) return { code: -1, msg: 'id 必填' }
    const r = await db.collection('flash_sales').get()
    const sales = r.data || []
    const owner = sales.find(fs => (fs.products || []).some(p => p._id === id))
    if (!owner) return { code: -1, msg: '特惠商品不存在' }
    const newProducts = (owner.products || []).filter(p => p._id !== id)
    await db.collection('flash_sales').doc(owner._id).update({ products: newProducts, updatedAt: new Date() })
    return { code: 0, data: { success: true } }
  },

  // ==================== 商品浏览埋点(用户端进入商品详情时调用,写入 product_views) ====================
  // _id = `${viewerId}#${productId}#${YYYY-MM-DD}` 同用户同商品同日去重
  // viewerId 来自用户端本地缓存(无登录态时为随机 uuid),productId 来自商品详情
  // 用于报表「总访客 / 转化率」统计
  async recordProductView(params) {
    const _p = (params && Object.keys(params).length) ? params : (this.event || {})
    const { merchantId, productId, viewerId } = _p
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }
    if (!productId) return { code: -1, msg: 'productId 必填' }
    if (!viewerId) return { code: -1, msg: 'viewerId 必填' }

    const day = new Date()
    const ymd = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0')
    const viewId = `${viewerId}#${productId}#${ymd}`

    try {
      await db.collection('product_views').add({
        _id: viewId,
        merchantId,
        productId,
        viewerId,
        ymd,
        createdAt: new Date()
      })
      return { code: 0, data: { success: true, viewId, deduped: false } }
    } catch (e) {
      // 重复 _id 走兜底:同日同用户同商品只算一次
      if (e && (e.errCode === 'DOC_ID_DUPLICATE' || /duplicate/i.test(e.errMsg || ''))) {
        return { code: 0, data: { success: true, viewId, deduped: true } }
      }
      return { code: -1, msg: e.errMsg || e.message || '记录失败' }
    }
  },

  // ==================== 图片上传（占位） ====================

  async uploadImage(params) {
    // 两种调用方式都支持：
    // 1. 客户端 uni.uploadFile：event.fileID 是临时文件 ID，cloudPath 从 formData 进 event.cloudPath
    // 2. 兼容旧代码通过 request() 传 fileID + cloudPath（params）
    const event = this.event || {}
    const fileID = event.fileID || (params && params.fileID)
    if (!fileID) return { code: -1, msg: 'fileID 必填（请通过 uni.uploadFile 触发）' }
    const ext = ((event.contentType || 'image/jpeg').split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '')
    // cloudPath 优先从 formData (event.cloudPath) 读，否则从 params，最后兜底默认路径
    const cloudPath = event.cloudPath || (params && params.cloudPath) || ('merchant/' + Date.now() + '.' + (ext || 'jpg'))
    try {
      const r = await uniCloud.uploadFile({ fileID, cloudPath })
      return { code: 0, data: { fileID: r.fileID, url: r.fileURL } }
    } catch (e) {
      return { code: -1, msg: '上传失败: ' + (e.message || e.errMsg || '未知错误') }
    }
  },

  async fixProductCategories() {
    // 批量修正旧分类名 → 新分类名，并同步修正 category 字段（key）
    const nameMap = {
      '蔬菜': '有机蔬菜', '水果': '新鲜水果', '肉禽': '肉禽蛋类', '日用品': '日用百货'
    }
    const keyMap = {
      'vegetable': 'organic_vegetable', 'fruit': 'fresh_fruit', 'meat': 'meat_egg',
      'c_veg': 'c_organic_veg', 'c_fruit': 'c_fresh_fruit', 'c_meat': 'c_meat_egg'
    }
    const allProducts = await db.collection('products').limit(2000).get()
    const products = allProducts.data || []
    let fixed = 0
    const results = []
    for (const p of products) {
      const update = {}
      const oldName = p.categoryName
      const oldKey = p.category
      if (oldName && nameMap[oldName]) update.categoryName = nameMap[oldName]
      if (oldKey && keyMap[oldKey]) update.category = keyMap[oldKey]
      if (Object.keys(update).length > 0) {
        await db.collection('products').doc(p._id).update(update)
        fixed++
        results.push({ _id: p._id, name: p.name, from: { categoryName: oldName, category: oldKey }, to: update })
      }
    }
    return { code: 0, data: { fixed, results } }
  },

  async seedCategories(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    let merchantId = params.merchantId
    if (!merchantId) {
      const all = await db.collection('merchants').limit(2).get()
      if (all.data && all.data.length === 1) merchantId = all.data[0]._id
    }
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }
    const now = new Date()
    const cats = [
      { _id: 'c_organic_veg', name: '有机蔬菜', key: 'organic_vegetable', sort: 1, icon: '🥬' },
      { _id: 'c_fresh_fruit', name: '新鲜水果', key: 'fresh_fruit',       sort: 2, icon: '🍎' },
      { _id: 'c_meat_egg',    name: '肉禽蛋类', key: 'meat_egg',          sort: 3, icon: '🥩' },
      { _id: 'c_mushroom',    name: '菌菇干货', key: 'mushroom',          sort: 4, icon: '🍄' },
      { _id: 'c_tofu',        name: '豆制品',   key: 'tofu',              sort: 5, icon: '🫘' },
      { _id: 'c_root',        name: '根茎类',   key: 'root_vegetable',   sort: 6, icon: '🥔' },
      { _id: 'c_daily',       name: '日用百货', key: 'daily_goods',      sort: 7, icon: '🧹' }
    ]
    const results = []
    for (const c of cats) {
      const existing = await db.collection('categories').where({ _id: c._id }).get()
      if (existing.data && existing.data.length) {
        results.push({ name: c.name, _action: 'exists' })
      } else {
        await db.collection('categories').add({ ...c, merchantId, createdAt: now, updatedAt: now })
        results.push({ name: c.name, _action: 'created' })
      }
    }
    return { code: 0, data: { created: results.filter(r => r._action === 'created').length, results } }
  },

  async diagnoseCategories() {
    const r = await db.collection('categories').limit(100).get()
    return { code: 0, data: { count: (r.data || []).length, items: r.data || [] } }
  },

  async debugCategoryPage() {
    return { code: 0, data: { debug: 'no-op' } }
  },

  // 清理空 flash_sale 文档（无商品的）。保留至少 1 条用于前端展示。
  async fixFlashSalesCleanup() {
    const r = await db.collection('flash_sales').get()
    const all = r.data || []
    const withProducts = all.filter(s => (s.products || []).length > 0)
    const empty = all.filter(s => (s.products || []).length === 0)
    // 如果空活动数量 > 0 且至少有一条有商品的活动，全删空活动
    if (empty.length > 0 && withProducts.length >= 1) {
      for (const s of empty) {
        await db.collection('flash_sales').doc(s._id).remove()
      }
      return { code: 0, data: { deleted: empty.length, kept: withProducts.length, keptIds: withProducts.map(s => s._id) } }
    }
    return { code: 0, data: { deleted: 0, kept: all.length, note: empty.length === 0 ? '没有空活动' : '有商品的活动不足1条，未清理' } }
  },

  // 一次性数据修复：回填商品划线价（originalPrice）
  // 适用：历史商品没填原价，或原价 < 售价（不合理）；统一兜底为 price * 1.5
  // 同时修顶层 originalPrice 和 specs[i].originalPrice
  async fixProductsOriginalPrice() {
    const all = await db.collection('products').limit(1000).get()
    const products = all.data || []
    let fixed = 0
    for (const p of products) {
      const upd = {}
      // 顶层
      const tp = Number(p.price) || 0
      const top0 = Number(p.originalPrice) || 0
      if (tp > 0 && (!top0 || top0 < tp)) {
        upd.originalPrice = Number((tp * 1.5).toFixed(2))
      }
      // specs
      if (Array.isArray(p.specs)) {
        const newSpecs = p.specs.map(s => {
          const sp = Number(s.price) || 0
          const sop = Number(s.originalPrice) || 0
          if (sp > 0 && (!sop || sop < sp)) {
            return { ...s, originalPrice: Number((sp * 1.5).toFixed(2)) }
          }
          return s
        })
        // 检测是否有变化
        const changed = newSpecs.some((s, i) => s.originalPrice !== p.specs[i].originalPrice)
        if (changed) upd.specs = newSpecs
      }
      if (Object.keys(upd).length) {
        upd.updatedAt = new Date()
        await db.collection('products').doc(p._id).update(upd)
        fixed++
      }
    }
    return { code: 0, data: { total: products.length, fixed } }
  },

  // ==================== 邻里（Posts） ====================

  async getPosts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = { status: 'active' }
    if (params.communityId) where.communityId = params.communityId
    if (params.userId) where.userId = params.userId
    // 按分类名过滤(中文字符串);为空/'all' → 不过滤,返回全部
    // 用 categoryName 而不是 categoryIndex 字段,是因为 categoryIndex 是后端动态分配,改顺序就变;categoryName 更稳定
    if (params.categoryName && params.categoryName !== 'all') where.categoryName = params.categoryName
    const r = await db.collection('posts').where(where).orderBy('createdAt', 'desc').limit(50).get()
    const posts = r.data || []
    // join users 表,补全发帖人昵称/头像(给用户端列表/详情页用)
    // 主路径:post.userId → users._id
    // 兜底路径:post._openid(uniCloud 内置,创建者 openid) → users.wxOpenId,处理老数据 userId 缺失
    const userIds = [...new Set(posts.map(p => p.userId).filter(Boolean))]
    const openids = [...new Set(posts.map(p => p._openid).filter(Boolean))]
    console.log('[getPosts] post count:', posts.length, 'userIds:', userIds, 'openids:', openids)
    const userMap = {} // key: user._id 或 user.wxOpenId
    if (userIds.length > 0) {
      const ur = await db.collection('users').where({ _id: dbCmd.in(userIds) }).field({ _id: true, nickname: true, avatar: true, wxOpenId: true }).get()
      ;(ur.data || []).forEach(u => { userMap[u._id] = u; if (u.wxOpenId) userMap[u.wxOpenId] = u })
    }
    if (openids.length > 0) {
      const ur = await db.collection('users').where({ wxOpenId: dbCmd.in(openids) }).field({ _id: true, nickname: true, avatar: true, wxOpenId: true }).get()
      ;(ur.data || []).forEach(u => { userMap[u._id] = u; if (u.wxOpenId) userMap[u.wxOpenId] = u })
    }
    console.log('[getPosts] users resolved:', Object.keys(userMap).length, 'posts with authorNickname:', posts.filter(p => {
      const u = (p.userId && userMap[p.userId]) || (p._openid && userMap[p._openid])
      return u && u.nickname
    }).length)
    // 查 certifications 表,回填 isCertified
    const certifiedUserIds = new Set()
    if (userIds.length > 0) {
      const cr = await db.collection('certifications').where({
        userId: dbCmd.in(userIds),
        status: 'certified'
      }).field({ userId: true }).get()
      ;(cr.data || []).forEach(c => { if (c.userId) certifiedUserIds.add(c.userId) })
    }
    console.log('[getPosts] certified users:', certifiedUserIds.size)
    posts.forEach(p => {
      const u = (p.userId && userMap[p.userId]) || (p._openid && userMap[p._openid]) || null
      p.authorNickname = (u && u.nickname) || ''
      p.authorAvatar = (u && u.avatar) || ''
      p.isCertified = !!(p.userId && certifiedUserIds.has(p.userId))
      // 兼容老字段名(老调用方还在用 likes/comments)
      if (p.likeCount !== undefined && p.likes === undefined) p.likes = p.likeCount
      if (p.commentCount !== undefined && p.comments === undefined) p.comments = p.commentCount
    })
    return { code: 0, data: posts }
  },

  async getPostDetail(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { postId, userId } = params
    if (!postId) return { code: -1, msg: 'postId 必填' }
    // 用 .doc(postId) 精确匹配,不暴露用户隐私(社区公共流用 getPosts,详情按 ID 走这里)
    const r = await db.collection('posts').doc(postId).get()
    const post = r.data && r.data[0]
    if (!post) return { code: -1, msg: '帖子不存在' }
    // 软删帖子不可见(与 getMyPosts 一致)
    if (post.status === 'deleted') return { code: -1, msg: '帖子已删除' }
    // 兼容老字段名
    if (post.likeCount !== undefined && post.likes === undefined) post.likes = post.likeCount
    if (post.commentCount !== undefined && post.comments === undefined) post.comments = post.comments || post.commentCount
    // join 作者昵称/头像/认证状态(与 getPosts 一致)
    let authorNickname = ''
    let authorAvatar = ''
    let isCertified = false
    if (post.userId) {
      const ur = await db.collection('users').doc(post.userId).field({ nickname: true, avatar: true }).get()
      const u = ur.data && ur.data[0]
      if (u) { authorNickname = u.nickname || ''; authorAvatar = u.avatar || '' }
      const cr = await db.collection('certifications').where({ userId: post.userId, status: 'certified' }).limit(1).get()
      isCertified = !!(cr.data && cr.data.length)
    } else if (post._openid) {
      const ur = await db.collection('users').where({ wxOpenId: post._openid }).field({ nickname: true, avatar: true }).limit(1).get()
      const u = ur.data && ur.data[0]
      if (u) { authorNickname = u.nickname || ''; authorAvatar = u.avatar || '' }
    }
    post.authorNickname = authorNickname
    post.authorAvatar = authorAvatar
    post.isCertified = isCertified
    // 当前用户是否已点赞(详情页要用)
    if (userId) {
      const lr = await db.collection('likes').where({ postId, userId }).limit(1).get()
      post.isLiked = !!(lr.data && lr.data.length)
    }
    // 与 getProductDetail 一致:返回解包后的单个对象,而不是数组
    return { code: 0, data: post }
  },

  async updatePost(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    if (!id) return { code: -1, msg: 'id 必填' }
    // 白名单:只允许更新这几个内容字段,其他(用户/作者/创建时间/点赞数/_id)一律不让改
    // status 也排除,避免前端误传 status: 1 把"已隐藏"的帖子改回 active
    const allowKeys = ['categoryIndex', 'categoryName', 'title', 'content', 'images', 'contactPhone', 'price']
    const update = { updatedAt: new Date() }
    allowKeys.forEach(k => { if (params[k] !== undefined) update[k] = params[k] })
    try {
      const res = await db.collection('posts').doc(id).update(update)
      if (res.updated === 0) {
        return { code: -1, msg: '帖子不存在或未变更' }
      }
      return { code: 0, data: { _id: id, updated: res.updated } }
    } catch (e) {
      return { code: -1, msg: '保存失败:' + (e.message || e.errMsg || '') }
    }
  },

  async createPost(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    // 白名单过滤:只接受这些字段,防止前端塞 status: 'admin' / role 等敏感字段
    const allowKeys = ['_id', 'categoryIndex', 'categoryName', 'title', 'content', 'images', 'contactPhone', 'price', 'userId', 'authorName']
    const safeDoc = { likeCount: 0, commentCount: 0, status: 'active', createdAt: new Date(), updatedAt: new Date() }
    allowKeys.forEach(k => { if (data[k] !== undefined) safeDoc[k] = data[k] })
    if (!safeDoc._id) safeDoc._id = 'post_' + Date.now()
    await db.collection('posts').add(safeDoc)
    return { code: 0, data: { _id: safeDoc._id } }
  },

  async toggleLike(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { postId, userId } = params
    const r = await db.collection('posts').doc(postId).get()
    const post = r.data && r.data[0]
    if (!post) return { code: -1, msg: '帖子不存在' }
    const liked = (post.likedUserIds || []).includes(userId)
    const likedUserIds = liked
      ? post.likedUserIds.filter(id => id !== userId)
      : [...(post.likedUserIds || []), userId]
    await db.collection('posts').doc(postId).update({
      likedUserIds,
      likeCount: likedUserIds.length,
      updatedAt: new Date()
    })
    return { code: 0, data: { liked: !liked, likeCount: likedUserIds.length } }
  },

  async getComments(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { postId, page = 1, pageSize = 50 } = params
    if (!postId) return { code: -1, msg: 'postId 必填' }
    const r = await db.collection('comments').where({ postId, status: 'active' })
      .orderBy('createdAt', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    const list = r.data || []
    // join users 取昵称/头像
    const userIds = [...new Set(list.map(c => c.userId).filter(Boolean))]
    const userMap = {}
    if (userIds.length > 0) {
      const ur = await db.collection('users').where({ _id: dbCmd.in(userIds) }).field({ _id: true, nickname: true, avatar: true }).get()
      ;(ur.data || []).forEach(u => { userMap[u._id] = u })
    }
    list.forEach(c => {
      const u = userMap[c.userId] || null
      c.authorNickname = (u && u.nickname) || c.authorName || ''
      c.authorAvatar = (u && u.avatar) || ''
    })
    return { code: 0, data: { list, total: list.length } }
  },

  async createComment(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { postId, userId, content, authorName } = params
    if (!postId || !userId || !content) return { code: -1, msg: 'postId/userId/content 必填' }
    const trimmed = String(content).trim().slice(0, 500)
    if (!trimmed) return { code: -1, msg: '评论内容不能为空' }
    const doc = {
      _id: 'comment_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      postId,
      userId,
      authorName: authorName || '',
      content: trimmed,
      status: 'active',
      createdAt: new Date()
    }
    await db.collection('comments').add(doc)
    // 帖子评论数 +1
    try {
      await db.collection('posts').doc(postId).update({ commentCount: dbCmd.inc(1) })
    } catch (e) {
      console.warn('[createComment] 更新 commentCount 失败:', e.message)
    }
    // 回填昵称/头像
    try {
      const ur = await db.collection('users').doc(userId).field({ nickname: true, avatar: true }).get()
      const u = ur.data && ur.data[0]
      if (u) {
        doc.authorNickname = u.nickname || doc.authorName
        doc.authorAvatar = u.avatar || ''
      }
    } catch (e) {}
    return { code: 0, data: doc }
  },

  async togglePostStatus(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, status } = params
    if (!id) return { code: -1, msg: 'id 必填' }
    // 前端 0=隐藏 1=显示,映射成云端 'closed' / 'active'(与 getPosts 的 where.status = 'active' 对齐)
    const mapped = (status === 1 || status === '1' || status === true || status === 'active' || status === 'online') ? 'active' : 'closed'
    try {
      await db.collection('posts').doc(id).update({ status: mapped, updatedAt: new Date() })
      return { code: 0, data: { _id: id, status: mapped, display: mapped === 'active' } }
    } catch (e) {
      return { code: -1, msg: '更新失败:' + (e.message || e.errMsg || '') }
    }
  },

  // 软删除帖子(用户端"我的发布"点删除走这里;与 neighbor_categories 软删模式一致,getPosts 过滤 status='active' 自动隐藏)
  async deletePost(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    if (!id) return { code: -1, msg: 'id 必填' }
    try {
      await db.collection('posts').doc(id).update({ status: 'deleted', updatedAt: new Date() })
      return { code: 0, data: { _id: id, status: 'deleted' } }
    } catch (e) {
      return { code: -1, msg: '删除失败:' + (e.message || e.errMsg || '') }
    }
  },

  async getMyPosts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { userId, page, pageSize } = params
    // 排除软删帖子(status='deleted'),否则用户点删除后下次登录"我的发布"里还能看到。
    // 下架('closed')保留可见,方便用户恢复。
    const where = { userId, status: dbCmd.neq('deleted') }
    const r = await db.collection('posts').where(where).orderBy('createdAt', 'desc').get()
    return { code: 0, data: r.data || [] }
  },

  // ==================== 邻里分类管理(商家后台) ====================

  async listNeighborCategories(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const r = await db.collection('neighbor_categories')
      .where({ status: dbCmd.neq('deleted') })
      .orderBy('sort', 'asc')
      .orderBy('index', 'asc')
      .get()
    return { code: 0, data: { list: r.data || [] } }
  },

  async createNeighborCategory(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { name, sort = 0 } = params
    if (!name || !String(name).trim()) return { code: -1, msg: '分类名不能为空' }
    const last = await db.collection('neighbor_categories')
      .orderBy('index', 'desc')
      .limit(1)
      .get()
    const nextIndex = (last.data && last.data[0] && last.data[0].index) ? (last.data[0].index + 1) : 1
    const doc = {
      _id: 'ncat_' + Date.now(),
      name: String(name).trim().slice(0, 20),
      index: nextIndex,
      sort: Number(sort) || 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    await db.collection('neighbor_categories').add(doc)
    return { code: 0, data: doc }
  },

  async updateNeighborCategory(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, name, sort } = params
    if (!id) return { code: -1, msg: 'id 必填' }
    const upd = { updatedAt: new Date() }
    if (name !== undefined) {
      if (!String(name).trim()) return { code: -1, msg: '分类名不能为空' }
      upd.name = String(name).trim().slice(0, 20)
    }
    if (sort !== undefined) upd.sort = Number(sort) || 0
    await db.collection('neighbor_categories').doc(id).update(upd)
    return { code: 0, data: { _id: id, ...upd } }
  },

  async deleteNeighborCategory(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id } = params
    if (!id) return { code: -1, msg: 'id 必填' }
    await db.collection('neighbor_categories').doc(id).update({ status: 'deleted', updatedAt: new Date() })
    return { code: 0, data: { _id: id, status: 'deleted' } }
  },

  // 一次性初始化邻里分类(只在库里没数据时塞 5 条默认)
  async seedNeighborCategories() {
    const existing = await db.collection('neighbor_categories').where({ status: dbCmd.neq('deleted') }).limit(1).get()
    if (existing.data && existing.data.length > 0) {
      return { code: 0, msg: '已有数据,跳过', data: { skipped: true, count: existing.data.length } }
    }
    const defaults = [
      { name: '邻里互助', sort: 0 },
      { name: '手艺服务', sort: 0 },
      { name: '相约同行', sort: 0 },
      { name: '相亲交友', sort: 0 },
      { name: '二手闲置', sort: 0 }
    ]
    const now = new Date()
    for (let i = 0; i < defaults.length; i++) {
      await db.collection('neighbor_categories').add({
        _id: 'ncat_seed_' + (i + 1),
        name: defaults[i].name,
        index: i + 1,
        sort: defaults[i].sort,
        status: 'active',
        createdAt: now,
        updatedAt: now
      })
    }
    return { code: 0, msg: '已初始化 5 条', data: { skipped: false, count: defaults.length } }
  },

  // ==================== 文件上传（base64 通道，用户端无 uniCloud 绑定时走这里） ====================

  // 接收 { fileData: 'data:image/jpeg;base64,xxx', cloudPath: 'certs/xxx.jpg' }
  // 把 base64 解码后存到云存储，返回 fileID（cloud://xxx）
  // 用法：用户端用 getFileSystemManager().readFileSync(tempPath, 'base64') 后 POST 过来
  // 注意：方法名必须保留为 uploadImageBase64（不能叫 uploadImage），否则会和上面 line 1683 的
  // uni.uploadFile 版同名覆盖，导致 uni.uploadFile 通道走不到 fileID 逻辑
  async uploadImageBase64(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { fileData, cloudPath } = params
    if (!fileData) return { code: -1, msg: 'fileData 必填' }
    if (!cloudPath) return { code: -1, msg: 'cloudPath 必填' }
    // 解析 data URI
    let base64Str = fileData
    if (fileData.startsWith('data:')) {
      const m = fileData.match(/^data:[^;]+;base64,(.+)$/)
      if (!m) return { code: -1, msg: 'fileData 格式错误（需为 data:mime;base64,xxx）' }
      base64Str = m[1]
    }
    try {
      const buffer = Buffer.from(base64Str, 'base64')
      if (!buffer || buffer.length === 0) return { code: -1, msg: 'base64 解码后为空' }
      // 限制单文件 5MB（防止滥用）
      if (buffer.length > 5 * 1024 * 1024) return { code: -1, msg: '文件超过 5MB 限制' }
      const result = await uniCloud.uploadFile({ cloudPath, fileContent: buffer })
      return { code: 0, data: { fileID: result.fileID } }
    } catch (e) {
      return { code: -1, msg: '上传失败: ' + (e.message || e.errMsg || '未知错误') }
    }
  },

  // ==================== 认证（Certifications） ====================

  async getCertStatus(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { userId } = params
    const r = await db.collection('certifications').where({ userId }).orderBy('createdAt', 'desc').limit(1).get()
    return { code: 0, data: r.data && r.data[0] ? r.data[0] : { status: 'none' } }
  },

  async submitCert(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const { userId } = data
    if (!userId) return { code: -1, msg: 'userId 必填' }
    // 确定性 _id：一个用户只允许一条认证记录
    const certId = 'cert_' + userId
    const existing = await db.collection('certifications').doc(certId).get()
    if (existing.data && existing.data[0]) {
      const cur = existing.data[0]
      if (cur.status === 'pending' || cur.status === 'certified') {
        return { code: -1, msg: cur.status === 'pending' ? '认证审核中，请勿重复提交' : '已认证，无需重复提交' }
      }
      // none / rejected：覆盖旧记录
      await db.collection('certifications').doc(certId).update({
        ...data, status: 'pending', rejectReason: '', reviewedAt: null, createdAt: new Date(), updatedAt: new Date()
      })
    } else {
      const doc = { ...data, _id: certId, status: 'pending', createdAt: new Date(), updatedAt: new Date() }
      await db.collection('certifications').add(doc)
    }
    return { code: 0, data: { _id: certId } }
  },

  // 用户主动重置自己的认证（"已认证"页点重新认证时调用）
  // 把 cert 表状态和 users.certStatus 都清回 'none'
  async resetMyCert(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { userId } = params
    if (!userId) return { code: -1, msg: 'userId 必填' }
    const certId = 'cert_' + userId
    const existing = await db.collection('certifications').doc(certId).get()
    if (existing.data && existing.data[0]) {
      await db.collection('certifications').doc(certId).update({
        status: 'none', rejectReason: '', reviewedAt: null, reviewedBy: '', updatedAt: new Date()
      })
    }
    await db.collection('users').doc(userId).update({ certStatus: 'none', updatedAt: new Date() })
    return { code: 0, data: { success: true } }
  },

  // ==================== 微信登录（WeChat） ====================

  // 微信一键登录：前端 wx.login() 拿 code，传给云端，云端 code2Session 拿 openid，查/建 user
  async loginByWeixin(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { code } = params
    if (!code) return { code: -1, msg: 'code 必填' }
    const secret = process.env.WX_APPSECRET
    if (!secret) return { code: -1, msg: '云函数未配置 WX_APPSECRET 环境变量' }
    const r = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${secret}&js_code=${code}&grant_type=authorization_code`,
      { method: 'GET', dataType: 'json' }
    )
    if (r.data && r.data.errcode) {
      return { code: -1, msg: '微信登录失败: ' + (r.data.errmsg || r.data.errcode) }
    }
    const { openid, unionid } = r.data
    // 查 user
    const exist = await db.collection('users').where({ wxOpenId: openid }).get()
    let user, isNew = false
    if (exist.data && exist.data[0]) {
      user = exist.data[0]
      // 存量老用户没有 account 的补一个
      if (!user.account) {
        user.account = await generateUniqueAccount()
        await db.collection('users').doc(user._id).update({ account: user.account, updatedAt: new Date() })
      }
    } else {
      isNew = true
      const _id = 'u_wx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
      const account = await generateUniqueAccount()
      user = {
        _id, account, wxOpenId: openid, wxUnionId: unionid || '',
        nickname: '微信用户', avatar: 'https://img.icons8.com/color/96/user.png',
        phone: '', certStatus: 'none', communityId: '',
        createdAt: new Date(), updatedAt: new Date()
      }
      await db.collection('users').add(user)
    }
    const token = 'wx_' + user._id
    const tokenExpired = Date.now() + 30 * 24 * 3600 * 1000
    return { code: 0, data: { token, tokenExpired, userInfo: user, isNew } }
  },

  // 绑定微信手机号：getPhoneNumber 拿到一次性 code，云端调 getuserphonenumber 解密
  // 同手机号自动合并：老 SMS 账户（无 wxOpenId）合并到新微信用户；已绑其他微信则拒绝
  async bindWxPhone(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { code, userId } = params
    if (!code || !userId) return { code: -1, msg: 'code 和 userId 必填' }
    let accessToken
    try {
      accessToken = await getWxAccessToken()
    } catch (e) {
      return { code: -1, msg: e.message || 'access_token 获取失败' }
    }
    const r = await uniCloud.httpclient.request(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
      { method: 'POST', contentType: 'json', data: { code }, dataType: 'json' }
    )
    if (r.data && r.data.errcode) {
      return { code: -1, msg: '获取手机号失败: ' + (r.data.errmsg || r.data.errcode) }
    }
    const phone = r.data.phone_info && r.data.phone_info.phoneNumber
    if (!phone) return { code: -1, msg: '手机号解析失败' }

    const cur = await db.collection('users').doc(userId).get()
    const curUser = cur.data && cur.data[0]
    if (!curUser) return { code: -1, msg: '用户不存在' }

    // 查同手机号
    const samePhone = await db.collection('users').where({ phone }).get()
    let merged = false, targetUserId = userId
    if (samePhone.data && samePhone.data[0] && samePhone.data[0]._id !== userId) {
      const old = samePhone.data[0]
      if (old.wxOpenId) {
        return { code: -1, msg: '该手机号已绑定其他微信账号' }
      }
      // 老 SMS 账户：合并到老的（保留历史订单/认证/地址）
      await db.collection('users').doc(old._id).update({
        wxOpenId: curUser.wxOpenId,
        wxUnionId: curUser.wxUnionId || '',
        nickname: curUser.nickname || old.nickname,
        avatar: curUser.avatar || old.avatar,
        updatedAt: new Date()
      })
      // 删新建的临时 user
      await db.collection('users').doc(userId).remove()
      targetUserId = old._id
      merged = true
    } else {
      await db.collection('users').doc(userId).update({ phone, updatedAt: new Date() })
    }
    const after = await db.collection('users').doc(targetUserId).get()
    // 确保 target user 有 account
    if (after.data[0] && !after.data[0].account) {
      const account = await generateUniqueAccount()
      await db.collection('users').doc(targetUserId).update({ account, updatedAt: new Date() })
      after.data[0].account = account
    }
    return { code: 0, data: { userInfo: after.data[0], merged, userId: targetUserId } }
  },

  // 更新昵称/头像（profile-complete 提交时调用）
  async updateProfile(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { userId, nickname, avatar, gender, birthday } = params
    if (!userId) return { code: -1, msg: 'userId 必填' }
    const update = { updatedAt: new Date() }
    if (nickname !== undefined) update.nickname = nickname
    if (avatar) update.avatar = avatar
    if (gender !== undefined) update.gender = gender
    if (birthday !== undefined) update.birthday = birthday || null
    await db.collection('users').doc(userId).update(update)
    const after = await db.collection('users').doc(userId).get()
    return { code: 0, data: { userInfo: after.data && after.data[0] } }
  },

  // 拉取当前用户的最新信息（解决 storage 缓存不一致问题）
  async getMyUserInfo(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { userId } = params
    if (!userId) return { code: -1, msg: 'userId 必填' }
    const r = await db.collection('users').doc(userId).get()
    const userInfo = r.data && r.data[0]
    if (!userInfo) return { code: -1, msg: '用户不存在' }
    // 存量用户懒回填 account
    if (!userInfo.account) {
      userInfo.account = await generateUniqueAccount()
      await db.collection('users').doc(userId).update({ account: userInfo.account, updatedAt: new Date() })
    }
    return { code: 0, data: { userInfo } }
  },

  async checkCert(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, action, rejectReason } = params
    if (!id || !action) return { code: -1, msg: 'id 和 action 必填' }
    let update
    if (action === 'approve') {
      update = { status: 'certified', rejectReason: '', reviewedAt: new Date() }
    } else if (action === 'reject') {
      update = { status: 'rejected', rejectReason: rejectReason || '资料不符合要求', reviewedAt: new Date() }
    } else if (action === 'revoke') {
      // 撤销：清空状态回到 'none'，让用户回到"未认证"初始态重新上传资料
      // （如果用 'pending'，用户端看到"审核中"但又没在审，无重新提交入口，会卡住）
      update = { status: 'none', rejectReason: '', reviewedAt: null }
    } else {
      return { code: -1, msg: 'action 必须是 approve/reject/revoke' }
    }
    update.updatedAt = new Date()
    await db.collection('certifications').doc(id).update(update)
    // 同步 users.certStatus（撤销时同步回 'none'，让用户端能立刻重新提交）
    const cur = await db.collection('certifications').doc(id).get()
    const c = cur.data && cur.data[0]
    if (c && c.userId) {
      await db.collection('users').doc(c.userId).update({ certStatus: update.status, updatedAt: new Date() })
    }
    return { code: 0, data: { success: true, newStatus: update.status } }
  },

  // 商家端认证审核列表
  async listCertifications(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.status && params.status !== 'all') where.status = params.status
    const keyword = (params.keyword || '').trim()
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    // 拉一批后内存去重：同 userId 只保留 createdAt 最新的一条
    // 解决历史脏数据（重复提交产生的多条 cert_xxxx 记录）显示问题
    const big = await db.collection('certifications').where(where).limit(1000).orderBy('createdAt', 'desc').get()
    const seen = new Set()
    const deduped = []
    for (const c of (big.data || [])) {
      if (!c.userId) continue
      if (seen.has(c.userId)) continue
      seen.add(c.userId)
      deduped.push(c)
    }
    let list
    if (keyword) {
      list = deduped.filter(c =>
        (c.userName && c.userName.includes(keyword)) ||
        (c.name && c.name.includes(keyword)) ||
        (c.phone && c.phone.includes(keyword)) ||
        (c.communityName && c.communityName.includes(keyword))
      )
    } else {
      list = deduped
    }
    const total = list.length
    const sliced = list.slice((page - 1) * pageSize, page * pageSize)
    await resolveFileIdsInItems(sliced)
    return { code: 0, data: { list: sliced, total } }
  },

  // 商家端全量帖子（按状态/分类过滤 + 关键词搜索）
  async listAllPosts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.status && params.status !== 'all') where.status = params.status
    const keyword = (params.keyword || '').trim()
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    if (keyword) {
      const big = await db.collection('posts').where(where).limit(500).orderBy('createdAt', 'desc').get()
      const list = (big.data || []).filter(o =>
        (o.title && o.title.includes(keyword)) ||
        (o.content && o.content.includes(keyword)) ||
        (o.authorName && o.authorName.includes(keyword))
      )
      const sliced = list.slice((page - 1) * pageSize, page * pageSize)
      await resolveFileIdsInItems(sliced)
      return { code: 0, data: { list: sliced, total: list.length } }
    }
    const r = await db.collection('posts').where(where)
      .skip((page - 1) * pageSize).limit(pageSize).orderBy('createdAt', 'desc').get()
    const list = r.data || []
    await resolveFileIdsInItems(list)  // 图片 fileID → https 临时 URL
    return { code: 0, data: { list, total: list.length } }
  },

  // 帖子管理：下架 closed / 上架 active / 删除 deleted（软删）
  async adminOperatePost(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, action, reason } = params
    if (!id || !action) return { code: -1, msg: 'id 和 action 必填' }
    let update
    if (action === 'offline') update = { status: 'closed', downReason: reason || '', downAt: new Date() }
    else if (action === 'online') update = { status: 'active', downReason: '', downAt: null }
    else if (action === 'delete') update = { status: 'deleted', downReason: reason || '商家删除', downAt: new Date() }
    else return { code: -1, msg: 'action 必须是 offline/online/delete' }
    update.updatedAt = new Date()
    await db.collection('posts').doc(id).update(update)
    return { code: 0, data: { success: true, newStatus: update.status } }
  },

  // ==================== 用户注册（测试用） ====================

  async userRegister(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { phone, password, nickname } = params
    const existing = await db.collection('users').where({ phone }).get()
    if (existing.data && existing.data.length) return { code: -1, msg: '手机号已注册' }
    const doc = {
      _id: 'u_' + Date.now(),
      phone, password, nickname: nickname || '用户' + phone.slice(-4),
      avatar: 'https://img.icons8.com/color/96/user.png',
      communityId: communityId || '',
      certStatus: 'none',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    await db.collection('users').add(doc)
    return { code: 0, data: { userId: doc._id, token: 'user_' + doc._id, tokenExpired: Date.now() + 7200000 } }
  },

  async userLogin(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { phone, password } = params
    let user = null
    if (uniID) {
      const res = await this.uniID.login({ username: phone, password, queryField: ['phone'] })
      if (res.errCode) return { code: -1, msg: res.errMsg }
      const r = await db.collection('users').where({ _id: res.uid }).get()
      user = r.data && r.data[0]
    } else {
      user = await plainPwdMatch('users', phone, password)
    }
    if (!user) return { code: -1, msg: '账号或密码错误' }
    return {
      code: 0,
      data: {
        userId: user._id,
        token: 'user_' + user._id,
        tokenExpired: Date.now() + 7200000,
        userInfo: user
      }
    }
  },

  // ==================== 一次性 seed 端点 ====================
  // 浏览器 GET 访问 https://.../merchant-api/seed 即可生成测试数据
  // 仅用于联调测试，联调完成后请删除此方法

  // 清空 orders（联调时清旧脏数据用）
  async clearOrders() {
    const r = await db.collection('orders').where({ _id: dbCmd.exists(true) }).remove()
    return { code: 0, data: { removed: r.deleted || 0 } }
  },

  // 诊断：尝试 add 一条带 orderNo/merchantId/products 的订单，看落库结构
  async diagAdd() {
    const sample = {
      orderNo: 'DIAG_' + Date.now(),
      merchantId: 'm_test_001',
      userId: 'u_test_001',
      items: [{ name: '番茄', spec: '500g', price: 3.5, qty: 2 }],
      totalAmount: 7.0,
      payAmount: 7.0,
      address: { name: 'test', phone: '13800000000', address: '测试', doorNo: '101' },
      payMethod: '微信支付',
      status: 'pending_payment',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const r = await db.collection('orders').add(sample)
    return { code: 0, data: { id: r.id, sample } }
  },

  // 验证云对象方法入参机制
  async diagMethod(data) {
    const _rawData = data
    const _rawDataKeys = data && typeof data === 'object' ? Object.keys(data) : null
    const _rawDataSerialized = data ? JSON.stringify(data).slice(0, 400) : 'NULL'
    const _rawThisEvent = this.event
    const _rawThisEventKeys = this.event && typeof this.event === 'object' ? Object.keys(this.event) : null
    const _rawThisEventSerialized = this.event ? JSON.stringify(this.event).slice(0, 400) : 'NO_EVENT'
    const _rawEventBefore = this._rawEventBefore
    const _rawEventBeforeKeys = this._rawEventBefore && typeof this._rawEventBefore === 'object' ? Object.keys(this._rawEventBefore) : null
    const _rawEventBeforeSerialized = this._rawEventBefore ? JSON.stringify(this._rawEventBefore).slice(0, 400) : 'NULL'

    // 用 getHttpInfo 拿完整 HTTP 信息
    let httpInfo = null
    try { httpInfo = this.getHttpInfo() } catch (e) { httpInfo = { error: e.message } }

    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    return {
      code: 0,
      data: {
        argsLength: arguments.length,
        rawDataKeys: _rawDataKeys,
        rawDataSerialized: _rawDataSerialized,
        rawEventBeforeKeys: _rawEventBeforeKeys,
        rawEventBeforeSerialized: _rawEventBeforeSerialized,
        rawThisEventKeys: _rawThisEventKeys,
        rawThisEventSerialized: _rawThisEventSerialized,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
        dataSerialized: data ? JSON.stringify(data).slice(0, 400) : 'NULL',
        httpInfoKeys: httpInfo && typeof httpInfo === 'object' ? Object.keys(httpInfo) : null,
        httpInfoSerialized: httpInfo ? JSON.stringify(httpInfo).slice(0, 800) : 'NO_HTTP_INFO'
      }
    }
  },

  // 诊断：读最后一条订单的完整结构
  async diagLastOrder() {
    const r = await db.collection('orders').orderBy('createdAt', 'desc').limit(1).get()
    return { code: 0, data: r.data && r.data[0] }
  },

  async seed() {
    const report = { merchants: [], categories: [], products: [], communities: [], riders: [], users: [] }

    const merchantId = 'm_test_001'
    const merchantPwd = 'merchant123'
    const m = await ensureSeedDoc('merchants', {
      _id: merchantId,
      shopName: '老李家生鲜',
      ownerName: '李老板',
      phone: '13800138000',
      password: merchantPwd,
      address: '杭州市西湖区文一路 1 号',
      logo: 'https://img.icons8.com/color/96/shop.png',
      status: 'online',
      rating: 4.8,
      salesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    report.merchants.push(m)

    const cats = [
      { _id: 'c_organic_veg',  name: '有机蔬菜', key: 'organic_vegetable', sort: 1, icon: '🥬' },
      { _id: 'c_fresh_fruit',  name: '新鲜水果', key: 'fresh_fruit',       sort: 2, icon: '🍎' },
      { _id: 'c_meat_egg',     name: '肉禽蛋类', key: 'meat_egg',          sort: 3, icon: '🥩' },
      { _id: 'c_mushroom',     name: '菌菇干货', key: 'mushroom',          sort: 4, icon: '🍄' },
      { _id: 'c_tofu',         name: '豆制品',   key: 'tofu',              sort: 5, icon: '🫘' },
      { _id: 'c_root',         name: '根茎类',   key: 'root_vegetable',   sort: 6, icon: '🥔' },
      { _id: 'c_daily',        name: '日用百货', key: 'daily_goods',      sort: 7, icon: '🧹' }
    ]
    for (const c of cats) {
      const r = await ensureSeedDoc('categories', { ...c, merchantId, createdAt: new Date(), updatedAt: new Date() })
      report.categories.push(r)
    }

    const products = [
      { _id: 'p_001', category: 'c_organic_veg', name: '本地青菜',   spec: '500g', price: 3.5,  originalPrice: 5.0,  stock: 100, coverImage: 'https://img.icons8.com/color/96/broccoli.png', tags: ['新鲜', '当日采摘'], status: 'online' },
      { _id: 'p_002', category: 'c_organic_veg', name: '西红柿',     spec: '500g', price: 4.8,  originalPrice: 6.0,  stock: 80,  coverImage: 'https://img.icons8.com/color/96/tomato.png',     tags: ['沙瓤'],         status: 'online' },
      { _id: 'p_003', category: 'c_fresh_fruit', name: '山东红富士', spec: '1kg',  price: 9.9,  originalPrice: 12.0, stock: 60,  coverImage: 'https://img.icons8.com/color/96/apple.png',       tags: ['脆甜'],         status: 'online' },
      { _id: 'p_004', category: 'c_fresh_fruit', name: '海南香蕉',   spec: '1kg',  price: 6.5,  originalPrice: 8.0,  stock: 50,  coverImage: 'https://img.icons8.com/color/96/banana.png',      tags: ['自然熟'],       status: 'online' },
      { _id: 'p_005', category: 'c_meat_egg',    name: '土鸡蛋',     spec: '30枚', price: 28.0, originalPrice: 35.0, stock: 40,  coverImage: 'https://img.icons8.com/color/96/eggs.png',        tags: ['散养'],         status: 'online' }
    ]
    for (const p of products) {
      const r = await ensureSeedDoc('products', { ...p, merchantId, sold: 0, images: [p.coverImage], description: p.name, createdAt: new Date(), updatedAt: new Date() })
      report.products.push(r)
    }

    const cm = await ensureSeedDoc('communities', {
      _id: 'cm_001',
      merchantId,
      name: '文一路怡景湾',
      address: '杭州市西湖区文一路 188 号',
      longitude: 120.123,
      latitude: 30.276,
      houseCount: 600,
      userCount: 1200,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    report.communities.push(cm)

    const riderId = 'r_test_001'
    const riderPwd = 'rider123'
    const r = await ensureSeedDoc('riders', {
      _id: riderId,
      phone: '13900139000',
      password: riderPwd,
      name: '王骑手',
      avatar: 'https://img.icons8.com/color/96/user.png',
      merchantId,
      riderStatus: 'idle',
      rating: 4.9,
      deliveryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    report.riders.push(r)

    const userId = 'u_test_001'
    const userPwd = 'user123'
    const u = await ensureSeedDoc('users', {
      _id: userId,
      nickname: '小张',
      avatar: 'https://img.icons8.com/color/96/user-female.png',
      phone: '13700137000',
      password: userPwd,
      communityId: 'cm_001',
      certStatus: 'none',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    report.users.push(u)

    return {
      code: 0,
      msg: 'seed 完成（明文密码模式，uni-id-common 未加载时）',
      mode: uniID ? 'uni-id' : 'plaintext-fallback',
      counts: {
        merchants: report.merchants.length,
        categories: report.categories.length,
        products: report.products.length,
        communities: report.communities.length,
        riders: report.riders.length,
        users: report.users.length
      },
      testAccounts: {
        merchant: { id: merchantId, password: 'merchant123', name: '老李家生鲜' },
        rider:    { id: riderId,    password: 'rider123',    name: '王骑手',   phone: '13900139000' },
        user:     { id: userId,     password: 'user123',     name: '小张',     phone: '13700137000' }
      },
      note: '_action=created 表示新建；=exists 表示已存在（可重跑，不会重复）'
    }
  }
}
