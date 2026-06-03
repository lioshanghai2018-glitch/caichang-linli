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
// 扫描 image / coverImage / images 三个常见字段
async function resolveFileIdsInItems(items) {
  if (!Array.isArray(items) || items.length === 0) return
  const fileIds = new Set()
  for (const it of items) {
    if (!it) continue
    const fields = [it.image, it.coverImage]
    if (Array.isArray(it.images)) fields.push(...it.images)
    for (const f of fields) {
      if (typeof f === 'string' && f.startsWith('cloud://')) fileIds.add(f)
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
      if (typeof it.image === 'string' && map[it.image]) it.image = map[it.image]
      if (typeof it.coverImage === 'string' && map[it.coverImage]) it.coverImage = map[it.coverImage]
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
    const updateData = { status, updatedAt: new Date(), ...extraData }
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
    const doc = Object.assign({}, orderData, {
      items,
      status: orderData.status || 'pending_payment',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    delete doc.products
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
    const { id, orderNo, reason } = params
    // 兼容 _id 和 orderNo 两种入参（jql 的 where _id 要求 ObjectId 类型，传字符串不匹配）
    const where = orderNo ? { orderNo } : { _id: id }
    await db.collection('orders').where(where).update({
      status: 'refunding',
      refundReason: reason,
      updatedAt: new Date()
    })
    await db.collection('refunds').add({
      orderId: id || orderNo,
      orderNo: orderNo,
      reason,
      status: 'pending',
      createdAt: new Date()
    })
    return { code: 0, data: { success: true } }
  },

  async processRefund(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, refundAmount, action } = params
    const status = action === 'approve' ? 'refunded' : 'paid'
    await db.collection('orders').doc(id).update({
      status,
      refundAmount,
      updatedAt: new Date()
    })
    await db.collection('refunds').where({ orderId: id }).update({
      status: action === 'approve' ? 'approved' : 'rejected',
      refundAmount,
      processedAt: new Date()
    })
    return { code: 0, data: { success: true } }
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
    const where = {}
    if (params.merchantId) where.merchantId = params.merchantId
    const r = await db.collection('communities').where(where).get()
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
    const pendingOrders = await db.collection('orders').where({ status: 'paid', riderId: dbCmd.exists(false) }).limit(10).get()
    let count = 0
    for (const o of pendingOrders.data || []) {
      await db.collection('orders').doc(o._id).update({ riderId, status: 'sorting', updatedAt: new Date() })
      count++
    }
    return { code: 0, data: { assigned: count, riderId } }
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
    const where = { riderId }
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
      .where({ merchantId, status: 'sorting' })
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
    const merchantId = _p.merchantId
    const timeFilter = _p.timeFilter || 'today'
    const customDate = _p.customDate || ''
    if (!merchantId) return { code: -1, msg: 'merchantId 必填' }

    const range = computeTimeRange(timeFilter, customDate)
    const startMs = range.start.getTime()
    const endMs = range.end.getTime()

    // 一次拉完该商家全部订单（limit 2000，业务量级够用；超量改分页聚合）
    const all = await db.collection('orders').where({ merchantId }).limit(2000).get()
    const list = (all.data || []).filter(o => o.createdAt)

    // 4 卡片：时间范围内所有订单
    const inRange = list.filter(o => {
      const t = new Date(o.createdAt).getTime()
      return t >= startMs && t <= endMs
    })
    const todayOrders = inRange.length
    const totalSales = inRange
      .filter(o => o.status === 'completed')
      .reduce((s, o) => s + (Number(o.payAmount || o.totalAmount) || 0), 0)

    // 待处理：所有未完成订单（与 4 圈圈口径一致，不受 timeFilter 影响）
    // 用 normalizeOrderStatus 兼容 canonical 英文值 + 中文标签（如"已接单"）
    const pendingOrders = list.filter(o =>
      ['pending_payment', 'paid', 'pending_sorting', 'sorting'].includes(normalizeOrderStatus(o.status))
    ).length

    // 4 状态圈圈：所有时间累计
    const counts = {
      pending_payment: list.filter(o => normalizeOrderStatus(o.status) === 'pending_payment').length,
      pending_sorting: list.filter(o => ['paid', 'pending_sorting'].includes(normalizeOrderStatus(o.status))).length,
      delivering: list.filter(o => normalizeOrderStatus(o.status) === 'delivering').length,
      completed: list.filter(o => normalizeOrderStatus(o.status) === 'completed').length
    }

    // 在线商品：一次 count 查询
    const p = await db.collection('products').where({ merchantId, status: 'online' }).count()
    const onlineProducts = (p.result && p.result.total) || 0

    return {
      code: 0,
      data: {
        timeRange: { type: timeFilter, label: range.label, start: range.start, end: range.end },
        todayOrders,
        totalSales: Number(totalSales.toFixed(2)),
        pendingOrders,
        onlineProducts,
        counts
      }
    }
  },

  async getReportData(params) {
    return await this.getDashboard(params)
  },

  // ==================== IM 通讯 ====================

  async getConversations(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.merchantId) where.merchantId = params.merchantId
    if (params.userId) where.userId = params.userId
    const r = await db.collection('conversations').where(where).orderBy('lastMessageAt', 'desc').get()
    return { code: 0, data: r.data || [] }
  },

  async getMessages(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.conversationId) where.conversationId = params.conversationId
    if (params.merchantId) where.merchantId = params.merchantId
    const r = await db.collection('messages').where(where).orderBy('createdAt', 'asc').limit(100).get()
    return { code: 0, data: r.data || [] }
  },

  async sendMessage(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const doc = { ...data, createdAt: new Date(), resolved: false }
    if (!doc.conversationId) doc.conversationId = 'c_' + (data.merchantId || '') + '_' + (data.userId || '')
    await db.collection('messages').add(doc)
    await db.collection('conversations').where({ _id: doc.conversationId }).update({
      lastMessage: data.content,
      lastMessageAt: new Date(),
      updatedAt: new Date()
    })
    return { code: 0, data: { success: true } }
  },

  async markAsRead(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = { ...params }
    await db.collection('messages').where(where).update({ read: true })
    return { code: 0, data: { success: true } }
  },

  // ==================== 特惠（Flash Sale） ====================

  async getFlashSale(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const where = {}
    if (params.merchantId) where.merchantId = params.merchantId
    const r = await db.collection('flash_sales').where(where).orderBy('startTime', 'desc').get()
    return { code: 0, data: r.data || [] }
  },

  async saveFlashSale(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    // 兼容前端传 id 或 _id
    const existingId = data._id || data.id
    if (existingId) {
      // update：不改 createdAt，不接受前端传 id
      const update = {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        updatedAt: new Date()
      }
      await db.collection('flash_sales').doc(existingId).update(update)
      return { code: 0, data: { id: existingId, _id: existingId } }
    } else {
      // add
      const doc = {
        _id: 'fs_' + Date.now(),
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status !== undefined ? data.status : true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await db.collection('flash_sales').add(doc)
      return { code: 0, data: { id: doc._id, _id: doc._id } }
    }
  },

  // ==================== 特惠商品（Flash Sale Products） ====================
  // flash_sale_products 是特惠活动下的商品子集。为简化模型，存在 flash_sales.doc.products 数组里

  async getFlashSaleProducts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { flashSaleId } = params
    const r = await db.collection('flash_sales').doc(flashSaleId).get()
    const fs = r.data && r.data[0]
    const list = (fs && fs.products) || []
    await resolveFileIdsInItems(list)
    return { code: 0, data: list }
  },

  async addFlashSaleProduct(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    // 前端 saveProduct / addSelectedProducts 发的是 name/image/originalPrice/flashPrice/stock/specs
    const { flashSaleId, name, image, originalPrice, flashPrice, stock, specs } = params
    if (!flashSaleId) return { code: -1, msg: 'flashSaleId 必填' }
    const r = await db.collection('flash_sales').doc(flashSaleId).get()
    const fs = r.data && r.data[0]
    if (!fs) return { code: -1, msg: '特惠活动不存在' }
    const newProduct = { _id: 'fsp_' + Date.now(), name, image, originalPrice, flashPrice, stock, specs: specs || [] }
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

  // ==================== 图片上传（占位） ====================

  async uploadImage(params) {
    // 客户端走 uni.uploadFile，云端 event.fileID 是临时文件 ID
    // 客户端可在 formData 里传 cloudPath 自定义路径
    const event = this.event || {}
    const fileID = event.fileID || (params && params.fileID)
    if (!fileID) return { code: -1, msg: 'fileID 必填（请通过 uni.uploadFile 触发）' }
    const ext = ((event.contentType || 'image/jpeg').split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '')
    const cloudPath = (params && params.cloudPath) || ('merchant/' + Date.now() + '.' + (ext || 'jpg'))
    try {
      const r = await uniCloud.uploadFile({ fileID, cloudPath })
      return { code: 0, data: { fileID: r.fileID, url: r.fileURL } }
    } catch (e) {
      return { code: -1, msg: '上传失败: ' + (e.message || e.errMsg || '未知错误') }
    }
  },

  async fixProductCategories() {
    return { code: 0, data: { fixed: 0, note: '无分类错位，无需修复' } }
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
    const r = await db.collection('posts').where(where).orderBy('createdAt', 'desc').limit(50).get()
    return { code: 0, data: r.data || [] }
  },

  async createPost(data) {
    const data_unwrapped = ((data && data.params) || (data && Object.keys(data).length ? data : null) || (this.event && this.event.params) || this.event || {})
    var data = data_unwrapped
    const doc = { ...data, likeCount: 0, commentCount: 0, status: 'active', createdAt: new Date(), updatedAt: new Date() }
    if (!doc._id) doc._id = 'post_' + Date.now()
    await db.collection('posts').add(doc)
    return { code: 0, data: { _id: doc._id } }
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

  async getMyPosts(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { userId, page, pageSize } = params
    const r = await db.collection('posts').where({ userId }).orderBy('createdAt', 'desc').get()
    return { code: 0, data: r.data || [] }
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
    const doc = { ...data, status: 'pending', createdAt: new Date(), updatedAt: new Date() }
    if (!doc._id) doc._id = 'cert_' + Date.now()
    await db.collection('certifications').add(doc)
    return { code: 0, data: { _id: doc._id } }
  },

  async checkCert(params) {
    const params_unwrapped = ((params && params.params) || (params && Object.keys(params).length ? params : null) || (this.event && this.event.params) || this.event || {})
    var params = params_unwrapped
    const { id, action, rejectReason } = params
    const status = action === 'approve' ? 'certified' : 'rejected'
    await db.collection('certifications').doc(id).update({
      status,
      rejectReason: action === 'approve' ? '' : (rejectReason || ''),
      reviewedAt: new Date(),
      updatedAt: new Date()
    })
    return { code: 0, data: { success: true } }
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
      { _id: 'c_veg',  name: '蔬菜', key: 'vegetable', sort: 1, icon: '🥬' },
      { _id: 'c_fruit',name: '水果', key: 'fruit',     sort: 2, icon: '🍎' },
      { _id: 'c_meat', name: '肉禽', key: 'meat',      sort: 3, icon: '🍖' }
    ]
    for (const c of cats) {
      const r = await ensureSeedDoc('categories', { ...c, merchantId, createdAt: new Date(), updatedAt: new Date() })
      report.categories.push(r)
    }

    const products = [
      { _id: 'p_001', category: 'c_veg',   name: '本地青菜',     spec: '500g', price: 3.5,  originalPrice: 5.0,  stock: 100, coverImage: 'https://img.icons8.com/color/96/broccoli.png', tags: ['新鲜', '当日采摘'], status: 'online' },
      { _id: 'p_002', category: 'c_veg',   name: '西红柿',       spec: '500g', price: 4.8,  originalPrice: 6.0,  stock: 80,  coverImage: 'https://img.icons8.com/color/96/tomato.png',     tags: ['沙瓤'],         status: 'online' },
      { _id: 'p_003', category: 'c_fruit', name: '山东红富士',   spec: '1kg',  price: 9.9,  originalPrice: 12.0, stock: 60,  coverImage: 'https://img.icons8.com/color/96/apple.png',       tags: ['脆甜'],         status: 'online' },
      { _id: 'p_004', category: 'c_fruit', name: '海南香蕉',     spec: '1kg',  price: 6.5,  originalPrice: 8.0,  stock: 50,  coverImage: 'https://img.icons8.com/color/96/banana.png',      tags: ['自然熟'],       status: 'online' },
      { _id: 'p_005', category: 'c_meat',  name: '土鸡蛋',       spec: '30枚', price: 28.0, originalPrice: 35.0, stock: 40,  coverImage: 'https://img.icons8.com/color/96/eggs.png',        tags: ['散养'],         status: 'online' }
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
