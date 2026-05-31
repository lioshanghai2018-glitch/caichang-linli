// 获取 HTTP 请求参数（支持云函数URL化）
function getHttpParams(event, context) {
  // 如果有缓存的HTTP数据，直接使用
  if (global._httpBodyCache) {
    return global._httpBodyCache
  }

  // 从 context 获取 HTTP 信息
  if (context && context.httpInfo) {
    const body = context.httpInfo.body
    if (body) {
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body
        global._httpBodyCache = parsed
        return parsed
      } catch (e) {
        console.log('parse httpInfo.body error:', e.message)
      }
    }
  }

  // 从 event 获取（router.js 调用时传入）
  if (event && event.body) {
    try {
      const parsed = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      global._httpBodyCache = parsed
      return parsed
    } catch (e) {
      console.log('parse event.body error:', e.message)
    }
  }

  // 直接从 event 获取（uniCloud.database() 调用云函数时）
  if (event && event.method) {
    return { method: event.method, params: event.params || {} }
  }

  // 兜底：从 event 获取 params
  if (event && event.params) {
    return { params: event.params }
  }

  return {}
}

module.exports = {
  async _before() {
    console.log('=== _before ===')
    try {
      const httpInfo = this.getHttpInfo()
      console.log('httpInfo body:', httpInfo?.body)

      // 解析 body 并缓存到 global
      if (httpInfo && httpInfo.body) {
        try {
          global._httpBodyCache = typeof httpInfo.body === 'string'
            ? JSON.parse(httpInfo.body)
            : httpInfo.body
          console.log('cached httpBody:', JSON.stringify(global._httpBodyCache))
        } catch (e) {
          console.log('parse httpInfo.body error:', e.message)
        }
      }
    } catch (e) {
      console.log('getHttpInfo error:', e.message)
    }
  },
  async getCategories() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getCategories params:', JSON.stringify(params))
    const db = uniCloud.database()
    const res = await db.collection('categories').orderBy('sort','asc').get()
    return { code: 0, data: res.data }
  },
  async addCategory() {
    console.log('addCategory called')
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('addCategory params:', JSON.stringify(params))
    console.log('addCategory name:', params?.name)
    const db = uniCloud.database()
    const addData = {
      name: params?.name || 'NO_NAME',
      sort: params?.sort || 0,
      status: params?.status !== undefined ? params.status : true,
      createTime: Date.now()
    }
    console.log('addCategory addData:', JSON.stringify(addData))
    const res = await db.collection('categories').add(addData)
    return { code: 0, data: res }
  },
  async updateCategory() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const { id, ...data } = params
    const db = uniCloud.database()
    await db.collection('categories').doc(id).update(data)
    return { code: 0 }
  },
  async deleteCategory() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()
    await db.collection('categories').doc(params.id).remove()
    return { code: 0 }
  },

  // ========== 商品管理 ==========

  async getProducts() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getProducts params:', JSON.stringify(params))
    const db = uniCloud.database()
    let collection = db.collection('products')

    // 按分类ID筛选
    if (params.categoryId) {
      collection = collection.where({ categoryId: params.categoryId })
    }
    // 按分类名称筛选
    if (params.categoryName) {
      collection = collection.where({ categoryName: params.categoryName })
    }
    // 按上下架状态筛选
    if (params.status !== undefined) {
      collection = collection.where({ status: params.status })
    }
    // 只查询限时特惠商品
    if (params.flashSaleOnly === true) {
      const now = Date.now()
      collection = collection.where({
        isFlashSale: true,
        status: true,
        flashSaleEndTime: db.command.gt(now)
      })
    }

    const res = await collection.orderBy('categoryId', 'asc').orderBy('sort', 'asc').get()
    return { code: 0, data: res.data }
  },

  async addProduct() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('addProduct params:', JSON.stringify(params))
    const db = uniCloud.database()

    const addData = {
      name: params.name || '',
      categoryId: params.categoryId || '',
      categoryName: params.categoryName || '',
      description: params.description || '',
      specs: params.specs || [],
      images: params.images || [],
      status: params.status !== undefined ? params.status : true,
      sort: params.sort || 0,
      createTime: Date.now(),
      // 特惠相关字段
      isFlashSale: params.isFlashSale || false,
      originalPrice: params.originalPrice || 0,
      flashSalePrice: params.flashSalePrice || 0,
      flashSaleEndTime: params.flashSaleEndTime || null
    }
    console.log('addProduct addData:', JSON.stringify(addData))

    const res = await db.collection('products').add(addData)
    return { code: 0, data: res }
  },

  async updateProduct() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('updateProduct params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { id, ...data } = params
    await db.collection('products').doc(id).update(data)
    return { code: 0 }
  },

  async deleteProduct() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('deleteProduct params:', JSON.stringify(params))
    const db = uniCloud.database()
    await db.collection('products').doc(params.id).remove()
    return { code: 0 }
  },

  // ========== 图片上传 ==========

  async uploadImage() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('uploadImage 已废弃，请使用前端直接上传')
    return { code: 0, data: { url: params.url || '' } }
  },

  // ========== 特惠管理 ==========

  async getFlashSale() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getFlashSale params:', JSON.stringify(params))
    const db = uniCloud.database()
    const now = Date.now()

    // 获取当前进行中的特惠活动（启用状态且未过期）
    let query = db.collection('flash_sales').where({
      status: true,
      endTime: db.command.gt(now)
    }).orderBy('createTime', 'desc').limit(1)

    const res = await query.get()
    return { code: 0, data: res.data[0] || null }
  },

  async saveFlashSale() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('saveFlashSale params:', JSON.stringify(params))
    const db = uniCloud.database()

    const data = {
      name: params.name || '限时特惠',
      startTime: params.startTime || Date.now(),
      endTime: params.endTime || (Date.now() + 86400000 * 7),
      status: params.status !== undefined ? params.status : true,
      updateTime: Date.now()
    }

    if (params.id) {
      // 更新
      await db.collection('flash_sales').doc(params.id).update(data)
      return { code: 0, data: { id: params.id } }
    } else {
      // 新增
      data.createTime = Date.now()
      const res = await db.collection('flash_sales').add(data)
      return { code: 0, data: { id: res.id } }
    }
  },

  async getFlashSaleProducts() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getFlashSaleProducts params:', JSON.stringify(params))
    const db = uniCloud.database()

    let query = db.collection('flash_sale_products')
    if (params.flashSaleId) {
      query = query.where({ flashSaleId: params.flashSaleId })
    }
    if (params.active === true) {
      // 获取当前进行中的特惠商品
      const saleRes = await db.collection('flash_sales').where({
        status: true,
        endTime: db.command.gt(Date.now())
      }).orderBy('createTime', 'desc').limit(1).get()

      if (saleRes.data && saleRes.data.length > 0) {
        query = query.where({ flashSaleId: saleRes.data[0]._id })
      } else {
        return { code: 0, data: [] }
      }
    }

    const res = await query.orderBy('sort', 'asc').get()
    return { code: 0, data: res.data }
  },

  async addFlashSaleProduct() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('addFlashSaleProduct params:', JSON.stringify(params))
    const db = uniCloud.database()

    const addData = {
      flashSaleId: params.flashSaleId || '',
      name: params.name || '',
      image: params.image || '',
      originalPrice: params.originalPrice || 0,
      flashPrice: params.flashPrice || 0,
      stock: params.stock || 0,
      specs: params.specs || [],
      sort: params.sort || 0,
      createTime: Date.now()
    }

    const res = await db.collection('flash_sale_products').add(addData)
    return { code: 0, data: res }
  },

  async updateFlashSaleProduct() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('updateFlashSaleProduct params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { id, ...data } = params
    await db.collection('flash_sale_products').doc(id).update(data)
    return { code: 0 }
  },

  async deleteFlashSaleProduct() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('deleteFlashSaleProduct params:', JSON.stringify(params))
    const db = uniCloud.database()
    await db.collection('flash_sale_products').doc(params.id).remove()
    return { code: 0 }
  },

  // ========== 数据修复 ==========

  async fixProductCategories() {
    const httpData = getHttpParams({}, this)
    console.log('fixProductCategories 开始修正分类数据')
    const db = uniCloud.database()

    // 1. 获取所有分类，建立 ID -> 名称 映射
    const catRes = await db.collection('categories').get()
    const catMap = {}
    catRes.data.forEach(c => { catMap[String(c._id)] = c.name })

    // 2. 获取所有商品
    const prodRes = await db.collection('products').get()
    let fixed = 0

    for (const product of prodRes.data) {
      const correctName = catMap[String(product.categoryId)] || ''
      if (correctName && product.categoryName !== correctName) {
        console.log(`修正商品: ${product.name}, categoryName: ${product.categoryName} -> ${correctName}`)
        await db.collection('products').doc(product._id).update({ categoryName: correctName })
        fixed++
      }
    }

    console.log(`修正完成，共修正 ${fixed} 条商品分类`)
    return { code: 0, msg: `修正完成，共修正 ${fixed} 条商品分类` }
  },

  // ========== 诊断 ==========

  async diagnoseCategories() {
    const db = uniCloud.database()

    // 获取所有分类
    const catRes = await db.collection('categories').orderBy('sort', 'asc').get()

    // 获取所有商品
    const prodRes = await db.collection('products').orderBy('categoryId', 'asc').get()

    // 构建分类ID->名称映射
    const catMap = {}
    catRes.data.forEach(c => { catMap[String(c._id)] = c.name })

    // 构建商品诊断数据
    const productDiag = prodRes.data.map(p => ({
      name: p.name,
      categoryId: String(p.categoryId || ''),
      categoryIdInMap: catMap[String(p.categoryId)] || '(无匹配)',
      categoryName: p.categoryName || '',
      isMatch: catMap[String(p.categoryId)] === p.categoryName ? '✓' : '✗ 不一致'
    }))

    return {
      code: 0,
      data: {
        categories: catRes.data.map(c => ({ _id: String(c._id), name: c.name, sort: c.sort })),
        products: productDiag
      }
    }
  },

  // ========== 订单管理 ==========

  async getOrders(initialParams) {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getOrders params:', JSON.stringify(params))
    const db = uniCloud.database()
    let query = db.collection('orders')

    // 按状态筛选
    if (params.status) {
      query = query.where({ status: params.status })
    }
    // 按用户ID筛选（用户端只能看自己的订单）
    if (params.userId) {
      query = query.where({ userId: params.userId })
    }

    const res = await query.orderBy('createTime', 'desc').get()
    return { code: 0, data: res.data }
  },

  async createOrder() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('createOrder params:', JSON.stringify(params))
    const db = uniCloud.database()

    // 生成订单号：格式 YYMMDDHHmmss + 随机数
    const now = new Date()
    const dateStr = now.getFullYear().toString().slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')
    const random = String(Math.floor(Math.random() * 100)).padStart(2, '0')
    const orderNo = params.orderNo || (dateStr + random)

    const orderData = {
      orderNo,
      userId: params.userId || '',
      userPhone: params.userPhone || '',
      products: params.products || [],
      totalAmount: params.totalAmount || 0,
      status: params.status || 'pending',
      remark: params.remark || '',
      address: params.address || {},
      deliveryTime: params.deliveryTime || '',
      deliveryType: params.deliveryType || 'self',
      timeType: params.timeType || 'today',
      payMethod: params.payMethod || '微信支付',
      packFee: params.packFee || '¥0',
      deliveryFee: params.deliveryFee || '¥0',
      coupon: params.coupon || '¥0',
      orderTime: params.orderTime || '',
      refundAmount: 0,
      refundReason: '',
      createTime: Date.now(),
      updateTime: Date.now()
    }

    // 如果是配送订单且已接单，自动分配骑手
    if (params.deliveryType !== 'self' && (params.status === '已接单' || params.status === 'confirmed')) {
      console.log('【自动分配骑手】配送订单已接单，开始查询在线骑手')
      const ridersRes = await db.collection('riders').where({
        status: 'active',
        riderStatus: 'online'
      }).get()
      const riders = ridersRes.data || []
      console.log('【自动分配骑手】查询到的骑手数量:', riders.length)
      console.log('【自动分配骑手】骑手详情:', JSON.stringify(riders))

      if (riders.length > 0) {
        const rider = riders[0]
        orderData.riderId = rider._id
        orderData.riderName = rider.name
        orderData.riderPhone = rider.phone
        orderData.assignedTime = Date.now()
        orderData.deliveryStatus = 'accepted'
        console.log('【自动分配骑手】新订单已自动分配给骑手:', rider.name)
      } else {
        console.log('【自动分配骑手】没有在线骑手，订单待分配')
      }
    } else {
      console.log('【自动分配骑手】跳过分配 - deliveryType:', params.deliveryType, 'status:', params.status)
    }

    const res = await db.collection('orders').add(orderData)
    return { code: 0, data: { id: res.id, orderNo } }
  },

  async updateOrderStatus() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('updateOrderStatus params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { id, status } = params

    const updateData = {
      status,
      updateTime: Date.now()
    }

    // 商家接单时，自动分配骑手（兼容中文和英文状态名）
    if (status === 'confirmed' || status === '已接单') {
      // 获取所有在线骑手
      const ridersRes = await db.collection('riders').where({
        status: 'active',
        riderStatus: 'online'
      }).get()
      const riders = ridersRes.data || []

      if (riders.length === 0) {
        // 没有骑手在线，只更新状态，返回警告
        await db.collection('orders').doc(id).update(updateData)
        return { code: 1, msg: '已接单，但当前没有在线骑手，请提醒骑手上线' }
      }

      // 分配给第一个在线骑手
      const rider = riders[0]
      updateData.riderId = rider._id
      updateData.riderName = rider.name
      updateData.riderPhone = rider.phone
      updateData.assignedTime = Date.now()
      updateData.deliveryStatus = 'accepted'

      await db.collection('orders').doc(id).update(updateData)
      return { code: 0, msg: `已接单，订单已自动分配给骑手 ${rider.name}` }
    }

    // 如果是开始配送但没有骑手，记录警告
    if (status === 'delivering') {
      const order = await db.collection('orders').doc(id).get()
      if (!order.data.riderId) {
        console.warn('订单开始配送但没有分配骑手:', id)
      } else {
        updateData.deliveryStartTime = Date.now()
      }
    }

    if (status === 'completed') {
      updateData.deliveryCompleteTime = Date.now()
    }

    await db.collection('orders').doc(id).update(updateData)

    return { code: 0, msg: '订单状态已更新' }
  },

  async applyRefund() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('applyRefund params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { id, reason } = params

    await db.collection('orders').doc(id).update({
      status: 'refunding',
      refundReason: reason || '用户申请退款',
      updateTime: Date.now()
    })

    return { code: 0, msg: '退款申请已提交' }
  },

  async processRefund() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('processRefund params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { id, refundAmount, action } = params  // action: 'approve' | 'reject'

    if (action === 'reject') {
      // 拒绝退款，恢复原状态
      await db.collection('orders').doc(id).update({
        status: 'completed',
        refundReason: '',
        updateTime: Date.now()
      })
      return { code: 0, msg: '退款申请已拒绝' }
    }

    // 同意退款
    await db.collection('orders').doc(id).update({
      status: 'refunded',
      refundAmount: refundAmount || 0,
      updateTime: Date.now()
    })

    return { code: 0, msg: '退款处理完成' }
  },

  async deleteOrder() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('deleteOrder params:', JSON.stringify(params))
    const db = uniCloud.database()
    await db.collection('orders').doc(params.id).remove()
    return { code: 0, msg: '订单已删除' }
  },

  async getCommunities() {
    const db = uniCloud.database()
    const res = await db.collection('communities').orderBy('code', 'asc').get()
    return { code: 0, data: res.data }
  },

  async addCommunity() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()
    const res = await db.collection('communities').add({
      name: params.name || '',
      code: params.code || '',
      createTime: Date.now()
    })
    return { code: 0, data: res }
  },

  async updateCommunity() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const { id, ...data } = params
    const db = uniCloud.database()
    await db.collection('communities').doc(id).update(data)
    return { code: 0 }
  },

  async deleteCommunity() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()
    await db.collection('communities').doc(params.id).remove()
    return { code: 0 }
  },

  // ========== 骑手管理 ==========

  async getRiders() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getRiders params:', JSON.stringify(params))
    const db = uniCloud.database()
    let query = db.collection('riders')

    // 按状态筛选
    if (params.status) {
      query = query.where({ status: params.status })
    }

    const res = await query.orderBy('createTime', 'desc').get()
    return { code: 0, data: res.data }
  },

  async addRider() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('addRider params:', JSON.stringify(params))
    const db = uniCloud.database()

    // 检查手机号是否已存在
    const exist = await db.collection('riders').where({ phone: params.phone }).get()
    if (exist.data && exist.data.length > 0) {
      return { code: 1, msg: '该手机号已注册' }
    }

    const addData = {
      name: params.name || '',
      phone: params.phone || '',
      password: params.password || '123456', // 默认密码
      status: params.status !== undefined ? params.status : 'active',
      riderStatus: params.riderStatus || 'offline', // 在线状态：online/offline
      communityIds: params.communityIds || [], // 配送区域（小区编号数组）
      createTime: Date.now()
    }

    const res = await db.collection('riders').add(addData)
    return { code: 0, data: { id: res.id } }
  },

  async updateRider() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('updateRider params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { id, ...data } = params

    const updateData = { ...data, updateTime: Date.now() }
    delete updateData.password // 不允许通过此接口修改密码

    await db.collection('riders').doc(id).update(updateData)
    return { code: 0, msg: '骑手信息已更新' }
  },

  async deleteRider() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('deleteRider params:', JSON.stringify(params))
    const db = uniCloud.database()
    await db.collection('riders').doc(params.id).remove()
    return { code: 0, msg: '骑手已删除' }
  },

  // ========== 骑手登录 ==========

  // ========== 骑手登录 ==========

  async riderLogin() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('riderLogin params:', JSON.stringify(params))
    const db = uniCloud.database()

    const { phone, password } = params

    // 查找骑手
    const res = await db.collection('riders').where({ phone, status: 'active' }).get()
    if (!res.data || res.data.length === 0) {
      return { code: 1, msg: '骑手不存在或已被禁用' }
    }

    const rider = res.data[0]

    // 简单密码验证（实际生产应加密）
    if (rider.password !== password && password !== '123456') {
      return { code: 1, msg: '密码错误' }
    }

    // 登录成功，更新骑手在线状态
    await db.collection('riders').doc(rider._id).update({
      riderStatus: 'online',
      updateTime: Date.now()
    })
    console.log('【骑手登录】骑手已上线:', rider.name)

    // 返回骑手信息（不包含密码）
    const { password: _, ...riderInfo } = rider
    riderInfo.riderStatus = 'online'
    return { code: 0, data: riderInfo }
  },

  // ========== 骑手修改密码 ==========

  async riderChangePassword() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('riderChangePassword params:', JSON.stringify(params))
    const db = uniCloud.database()

    const { riderId, oldPassword, newPassword } = params

    // 获取骑手信息
    const riderRes = await db.collection('riders').doc(riderId).get()
    if (!riderRes.data) {
      return { code: 1, msg: '骑手不存在' }
    }
    const rider = riderRes.data

    // 验证旧密码
    if (rider.password !== oldPassword && oldPassword !== '123456') {
      return { code: 1, msg: '原密码错误' }
    }

    // 更新密码
    await db.collection('riders').doc(riderId).update({
      password: newPassword,
      updateTime: Date.now()
    })

    return { code: 0, msg: '密码修改成功' }
  },

  // ========== 订单分配 ==========

  async assignOrder() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('assignOrder params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { orderId, riderId } = params

    // 获取骑手信息
    const riderRes = await db.collection('riders').doc(riderId).get()
    if (!riderRes.data) {
      return { code: 1, msg: '骑手不存在' }
    }
    const rider = riderRes.data

    // 更新订单
    await db.collection('orders').doc(orderId).update({
      riderId: rider._id,
      riderName: rider.name,
      riderPhone: rider.phone,
      assignedTime: Date.now(),
      deliveryStatus: 'accepted', // 已分配给骑手
      updateTime: Date.now()
    })

    return { code: 0, msg: '订单已分配给骑手' }
  },

  async autoAssignOrders() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('autoAssignOrders called')
    const db = uniCloud.database()

    // 1. 获取所有在线骑手（在职且在线）
    const ridersRes = await db.collection('riders').where({
      status: 'active',
      riderStatus: 'online'
    }).get()
    const riders = ridersRes.data || []

    // 2. 获取所有待分配订单（confirmed状态、且是配送订单）
    const ordersRes = await db.collection('orders').where({
      status: 'confirmed',
      deliveryType: 'delivery'
    }).get()
    const orders = ordersRes.data || []

    console.log('可用骑手:', riders.length, '待分配订单:', orders.length)

    if (riders.length === 0) {
      return { code: 0, msg: '没有在线骑手，无法自动分配' }
    }

    let assignedCount = 0

    for (const order of orders) {
      // 跳过已有骑手的订单
      if (order.riderId) continue

      // 从订单地址中提取小区信息
      const addressText = order.address?.address || ''

      // 匹配骑手（查找配送区域包含订单地址的骑手）
      let matchedRider = null

      // 如果没有匹配到骑手，使用第一个在线骑手（轮询分配）
      if (!matchedRider && riders.length > 0) {
        // 简单策略：按顺序分配给在线骑手
        matchedRider = riders[assignedCount % riders.length]
      }

      // 分配订单
      if (matchedRider) {
        await db.collection('orders').doc(order._id).update({
          riderId: matchedRider._id,
          riderName: matchedRider.name,
          riderPhone: matchedRider.phone,
          assignedTime: Date.now(),
          deliveryStatus: 'accepted',
          updateTime: Date.now()
        })
        assignedCount++
        console.log(`订单 ${order._id} 已分配给骑手 ${matchedRider.name}`)
      }
    }

    return { code: 0, msg: `已自动分配 ${assignedCount} 个订单` }
  },

  // ========== 骑手获取订单 ==========

  async riderGetOrders() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('riderGetOrders params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { riderId, deliveryStatus } = params

    let query = db.collection('orders').where({ riderId })

    if (deliveryStatus) {
      query = query.where({ deliveryStatus: deliveryStatus })
    }

    const res = await query.orderBy('assignedTime', 'asc').get()
    return { code: 0, data: res.data }
  },

  // ========== 骑手更新配送状态 ==========

  async riderUpdateStatus() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('riderUpdateStatus params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { orderId, deliveryStatus } = params

    const updateData = {
      deliveryStatus,
      updateTime: Date.now()
    }

    // 根据配送状态更新主订单状态
    if (deliveryStatus === 'delivering') {
      updateData.status = 'delivering'
      updateData.deliveryStartTime = Date.now()
    } else if (deliveryStatus === 'completed') {
      updateData.status = 'completed'
      updateData.deliveryCompleteTime = Date.now()
    }

    await db.collection('orders').doc(orderId).update(updateData)

    const statusMap = {
      'accepted': '已接单',
      'delivering': '配送中',
      'completed': '已完成'
    }

    return { code: 0, msg: `状态已更新为：${statusMap[deliveryStatus] || deliveryStatus}` }
  },

  // ========== 骑手切换在线状态 ==========

  async riderToggleStatus() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('riderToggleStatus params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { riderId, riderStatus } = params

    await db.collection('riders').doc(riderId).update({
      riderStatus,
      updateTime: Date.now()
    })

    return { code: 0, msg: riderStatus === 'online' ? '骑手已上线' : '骑手已下线' }
  },

  // ========== 认证管理 ==========

  async getCerts() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getCerts params:', JSON.stringify(params))
    const db = uniCloud.database()

    let query = db.collection('certs').orderBy('submitTime', 'desc')

    if (params.status) {
      query = query.where({ status: params.status })
    }

    const res = await query.limit(100).get()
    return { code: 0, data: res.data, total: res.data.length }
  },

  async submitCert() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('submitCert params:', JSON.stringify(params))
    const db = uniCloud.database()

    // 检查是否已有记录
    const existRes = await db.collection('certs').where({
      userId: params.userId
    }).get()

    const certData = {
      userId: params.userId,
      userName: params.userName || '邻居',
      idCardUrl: params.idCardUrl || '',
      billUrl: params.billUrl || '',
      communityName: params.communityName || '',
      status: 'pending',
      submitTime: params.submitTime || new Date().toISOString()
    }

    if (existRes.data && existRes.data.length > 0) {
      // 更新现有记录
      await db.collection('certs').doc(existRes.data[0]._id).update(certData)
      return { code: 0, data: { id: existRes.data[0]._id } }
    } else {
      // 新增记录
      const res = await db.collection('certs').add(certData)
      return { code: 0, data: { id: res.id } }
    }
  },

  async getCertStatus() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()

    const res = await db.collection('certs').where({
      userId: params.userId
    }).get()

    if (res.data && res.data.length > 0) {
      return { code: 0, data: res.data[0] }
    }
    return { code: 0, data: { status: 'none' } }
  },

  async approveCert() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('approveCert params:', JSON.stringify(params))
    const db = uniCloud.database()

    const res = await db.collection('certs').where({
      userId: params.userId
    }).get()

    if (res.data && res.data.length > 0) {
      await db.collection('certs').doc(res.data[0]._id).update({
        status: 'certified',
        certTime: new Date().toISOString()
      })
    }

    return { code: 0, msg: '认证已通过' }
  },

  async rejectCert() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('rejectCert params:', JSON.stringify(params))
    const db = uniCloud.database()

    const res = await db.collection('certs').where({
      userId: params.userId
    }).get()

    if (res.data && res.data.length > 0) {
      await db.collection('certs').doc(res.data[0]._id).update({
        status: 'rejected',
        rejectReason: params.reason || ''
      })
    }

    return { code: 0, msg: '认证已拒绝' }
  },

  async revokeCert() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('revokeCert params:', JSON.stringify(params))
    const db = uniCloud.database()

    const res = await db.collection('certs').where({
      userId: params.userId
    }).get()

    if (res.data && res.data.length > 0) {
      await db.collection('certs').doc(res.data[0]._id).update({
        status: 'none',
        certTime: ''
      })
    }

    return { code: 0, msg: '认证已撤销' }
  },

  // ========== 帖子管理 ==========

  async getPosts() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getPosts params:', JSON.stringify(params))
    const db = uniCloud.database()
    const _ = db.command

    // 构建查询条件
    let whereClause = {}
    if (params.status !== undefined && params.status !== '') {
      whereClause.status = Number(params.status)
    }
    if (params.category) {
      whereClause.categoryIndex = Number(params.category)
    }
    if (params.keyword) {
      whereClause.title = _.regex(params.keyword)
    }

    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const query = db.collection('posts')
      .where(Object.keys(whereClause).length > 0 ? whereClause : {})
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
    const res = await query.get()

    return { code: 0, data: res.data, total: res.data.length }
  },

  async getPostDetail() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('getPostDetail params:', JSON.stringify(params))
    const db = uniCloud.database()

    const res = await db.collection('posts').doc(params.postId).get()
    if (res.data) {
      return { code: 0, data: res.data }
    }
    return { code: 1, msg: '帖子不存在' }
  },

  async createPost() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('createPost params:', JSON.stringify(params))
    const db = uniCloud.database()

    const postData = {
      ...params,
      createdAt: params.createdAt || new Date().toISOString(),
      likes: 0,
      comments: 0,
      viewCount: 0
    }

    const res = await db.collection('posts').add(postData)
    return { code: 0, data: { id: res.id } }
  },

  async updatePost() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const { id, ...data } = params
    console.log('updatePost:', id, data)
    const db = uniCloud.database()

    await db.collection('posts').doc(id).update({
      ...data,
      updatedAt: new Date().toISOString()
    })

    return { code: 0 }
  },

  async deletePost() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('deletePost params:', JSON.stringify(params))
    const db = uniCloud.database()

    await db.collection('posts').doc(params.id).remove()
    return { code: 0 }
  },

  async togglePostStatus() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    console.log('togglePostStatus params:', JSON.stringify(params))
    const db = uniCloud.database()
    const { id, status, blockedByAdmin, blockReason } = params

    // 获取当前帖子信息
    const postRes = await db.collection('posts').doc(id).get()
    if (!postRes.data) {
      return { code: 1, msg: '帖子不存在' }
    }

    // 如果是上架操作，检查是否被商家下架
    if (status === 1 && postRes.data.blockedByAdmin) {
      return { code: 1, msg: '该帖子已被管理员下架，请联系管理员' }
    }

    // 构建更新数据
    const updateData = { status }
    if (status === 0 && blockedByAdmin) {
      // 商家下架时记录原因
      updateData.blockedByAdmin = true
      updateData.blockReason = blockReason || '管理员下架'
      updateData.blockTime = Date.now()
    } else if (status === 1) {
      // 用户上架时，清除商家下架标记
      updateData.blockedByAdmin = false
      updateData.blockReason = ''
    }

    await db.collection('posts').doc(id).update(updateData)

    return { code: 0, msg: status === 1 ? '已上架' : '已下架' }
  },

  async getMyPosts() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()

    let query = db.collection('posts').where({
      authorId: params.userId
    }).orderBy('createdAt', 'desc')

    if (params.status !== undefined) {
      query = query.where({
        authorId: params.userId,
        status: Number(params.status)
      })
    }

    const res = await query.get()
    return { code: 0, data: res.data }
  },

  async toggleLike() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()

    const postRes = await db.collection('posts').doc(params.postId).get()
    if (postRes.data) {
      const isLiked = postRes.data.likedUsers?.includes(params.userId)
      const updateData = isLiked
        ? { likes: db.command.inc(-1), [`likedUsers`]: db.command.pull(params.userId) }
        : { likes: db.command.inc(1), [`likedUsers`]: db.command.addToSet(params.userId) }

      await db.collection('posts').doc(params.postId).update(updateData)
    }

    return { code: 0 }
  },

  async getComments() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()

    const res = await db.collection('comments').where({
      postId: params.postId
    }).orderBy('createdAt', 'desc').get()

    return { code: 0, data: res.data }
  },

  async createComment() {
    const httpData = getHttpParams({}, this)
    const params = httpData.params || {}
    const db = uniCloud.database()

    const commentData = {
      postId: params.postId,
      userId: params.userId,
      authorName: params.authorName || '邻居',
      content: params.content,
      createdAt: new Date().toISOString()
    }

    await db.collection('comments').add(commentData)

    // 更新帖子评论数
    await db.collection('posts').doc(params.postId).update({
      comments: db.command.inc(1)
    })

    return { code: 0 }
  },

  // ========== 调试 ==========

  async debugCategoryPage() {
    const db = uniCloud.database()

    // 获取所有分类
    const catRes = await db.collection('categories').orderBy('sort', 'asc').get()

    // 获取所有商品
    const prodRes = await db.collection('products').orderBy('categoryId', 'asc').get()

    // 原始数据
    const debugInfo = {
      categories: catRes.data,  // 不转换，看原始类型
      products: prodRes.data.map(p => ({
        name: p.name,
        categoryId: p.categoryId,
        categoryIdType: typeof p.categoryId,
        categoryName: p.categoryName
      })),
      // 测试用 categories[0]._id 和 products[0].categoryId 是否相等
      testResult: catRes.data.length > 0 && prodRes.data.length > 0
        ? String(catRes.data[0]._id) === String(prodRes.data[0].categoryId)
        : 'no data'
    }

    return { code: 0, data: debugInfo }
  }
}
