// 购物车云端同步工具
import { STORAGE_KEYS, API_BASE } from './config.js'
import { isLoggedIn, getUserId } from './auth.js'

/**
 * 获取本地购物车
 */
export function getLocalCart() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEYS.CART)
    return Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : [])
  } catch (e) {
    return []
  }
}

/**
 * 保存本地购物车
 */
export function setLocalCart(cart) {
  uni.setStorageSync(STORAGE_KEYS.CART, cart)
}

/**
 * 云端同步：上传本地购物车到云端（覆盖）
 */
async function uploadCart(cart) {
  if (!isLoggedIn()) return
  try {
    await uni.request({
      url: API_BASE + '/syncCart',
      method: 'POST',
      header: { 'Authorization': `Bearer ${uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''}` },
      data: { method: 'syncCart', params: { userId: getUserId(), items: cart } }
    })
  } catch (e) {
    console.warn('[cart] 同步失败:', e)
  }
}

/**
 * 云端拉取购物车
 */
async function downloadCart() {
  if (!isLoggedIn()) return []
  try {
    const res = await uni.request({
      url: API_BASE + '/getCart',
      method: 'POST',
      header: { 'Authorization': `Bearer ${uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''}` },
      data: { method: 'getCart', params: { userId: getUserId() } }
    })
    if (res.data && res.data.code === 0) {
      return res.data.data.items || []
    }
  } catch (e) {
    console.warn('[cart] 拉取失败:', e)
  }
  return []
}

/**
 * 合并购物车：本地+云端，相同商品取数量较大者
 */
function mergeCarts(local, cloud) {
  const map = new Map()
  // 先放云端数据
  cloud.forEach(item => {
    map.set(item.id, { ...item })
  })
  // 合并本地数据
  local.forEach(item => {
    const existing = map.get(item.id)
    if (existing) {
      existing.quantity = Math.max(existing.quantity, item.quantity)
    } else {
      map.set(item.id, { ...item })
    }
  })
  return Array.from(map.values())
}

/**
 * 初始化购物车：登录后调用，合并本地+云端
 */
export async function initCart() {
  const local = getLocalCart()
  if (isLoggedIn()) {
    const cloud = await downloadCart()
    if (cloud.length > 0) {
      const merged = mergeCarts(local, cloud)
      setLocalCart(merged)
      await uploadCart(merged)
    } else if (local.length > 0) {
      // 云端为空，本地上传
      await uploadCart(local)
    }
  }
  return getLocalCart()
}

/**
 * 添加商品到购物车
 */
export async function addToCart(item) {
  const cart = getLocalCart()
  const exist = cart.find(c => c.id === item.id)
  if (exist) {
    exist.quantity++
  } else {
    cart.push({ id: item.id, quantity: 1, product: item.product || item })
  }
  setLocalCart(cart)
  if (isLoggedIn()) uploadCart(cart)
  return cart
}

/**
 * 减少购物车商品
 */
export async function decreaseFromCart(itemId) {
  const cart = getLocalCart()
  const exist = cart.find(c => c.id === itemId)
  if (exist) {
    exist.quantity--
    if (exist.quantity <= 0) {
      const idx = cart.findIndex(c => c.id === itemId)
      cart.splice(idx, 1)
    }
  }
  setLocalCart(cart)
  if (isLoggedIn()) uploadCart(cart)
  return cart
}

/**
 * 更新购物车商品数量
 */
export async function updateCartItemQuantity(itemId, quantity) {
  const cart = getLocalCart()
  const exist = cart.find(c => c.id === itemId)
  if (exist) {
    exist.quantity = quantity
    if (quantity <= 0) {
      const idx = cart.findIndex(c => c.id === itemId)
      cart.splice(idx, 1)
    }
  }
  setLocalCart(cart)
  if (isLoggedIn()) uploadCart(cart)
  return cart
}

/**
 * 删除购物车商品
 */
export async function removeFromCart(itemId) {
  const cart = getLocalCart().filter(c => c.id !== itemId)
  setLocalCart(cart)
  if (isLoggedIn()) uploadCart(cart)
  return cart
}

/**
 * 清空购物车
 */
export async function clearCart() {
  setLocalCart([])
  if (isLoggedIn()) {
    try {
      await uni.request({
        url: API_BASE + '/clearCart',
        method: 'POST',
        header: { 'Authorization': `Bearer ${uni.getStorageSync(STORAGE_KEYS.TOKEN) || ''}` },
        data: { method: 'clearCart', params: { userId: getUserId() } }
      })
    } catch (e) {
      console.warn('[cart] 清空云端失败:', e)
    }
  }
}

/**
 * 计算购物车汇总
 */
export function calcCartSummary(cart) {
  const count = cart.reduce((sum, c) => sum + c.quantity, 0)
  const total = cart.reduce((sum, c) => {
    const price = (c.product && c.product.price) || 0
    return sum + price * c.quantity
  }, 0)
  return { count, total: total.toFixed(2) }
}
