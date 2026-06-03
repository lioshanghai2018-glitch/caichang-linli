// 购物车工具函数
const CART_KEY = 'cartItems'
const MAX_QTY_PER_ITEM = 99  // 单商品最大数量

export function getCartItems() {
  try {
    const data = uni.getStorageSync(CART_KEY)
    return data ? JSON.parse(data) : []
  } catch (e) {
    return []
  }
}

export function saveCartItems(items) {
  uni.setStorageSync(CART_KEY, JSON.stringify(items))
}

export function addToCart(product) {
  const cart = getCartItems()
  const existingIndex = cart.findIndex(item => item.id === product.id)
  const addQty = product.quantity || 1
  if (existingIndex > -1) {
    const newQty = Math.min(cart[existingIndex].quantity + addQty, MAX_QTY_PER_ITEM)
    cart[existingIndex].quantity = newQty
  } else {
    cart.push({ ...product, quantity: Math.min(addQty, MAX_QTY_PER_ITEM) })
  }
  saveCartItems(cart)
  return cart
}

export function updateCartItem(id, quantity) {
  const cart = getCartItems()
  const index = cart.findIndex(item => item.id === id)
  if (index > -1) {
    if (quantity <= 0) {
      cart.splice(index, 1)
    } else {
      cart[index].quantity = Math.min(quantity, MAX_QTY_PER_ITEM)
    }
  }
  saveCartItems(cart)
  return cart
}

export function getMaxQty() {
  return MAX_QTY_PER_ITEM
}

export function removeFromCart(id) {
  const cart = getCartItems().filter(item => item.id !== id)
  saveCartItems(cart)
  return cart
}

export function clearCart() {
  uni.removeStorageSync(CART_KEY)
}