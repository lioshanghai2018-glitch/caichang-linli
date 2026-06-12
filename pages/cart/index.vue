<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">购物车</text>
      <text class="edit-btn" @tap="toggleEdit">{{ isEdit ? '完成' : '编辑' }}</text>
    </view>

    <!-- 购物车列表 -->
    <view class="cart-list" v-if="cartItems.length > 0">
      <view class="cart-item" v-for="(item, index) in cartItems" :key="index">
        <!-- 选择框 -->
        <view class="check-wrap" @tap="toggleSelect(index)">
          <view class="check-circle" :class="{ checked: item.selected }">
            <text v-if="item.selected" class="check-icon">✓</text>
          </view>
        </view>
        <!-- 商品图片 -->
        <image class="item-img" :src="item.image" mode="aspectFill" />
        <!-- 商品信息 -->
        <view class="item-info">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-spec">{{ item.spec }}</text>
          <view class="item-bottom">
            <text class="item-price">{{ item.currentPrice }}</text>
            <!-- 数量控制 -->
            <view class="quantity-control">
              <view class="qty-btn minus" @tap="decrease(index)" v-if="item.quantity > 0">
                <text class="qty-minus">-</text>
              </view>
              <text class="qty-num" v-if="item.quantity > 0">{{ item.quantity }}</text>
              <view class="qty-btn plus" @tap="increase(index)">
                <text class="qty-plus">+</text>
              </view>
            </view>
          </view>
        </view>
        <!-- 删除按钮 -->
        <view class="delete-btn" @tap="removeItem(index)" v-if="isEdit">
          <text>删除</text>
        </view>
      </view>
    </view>

    <!-- 空购物车 -->
    <view class="empty-state" v-else>
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车是空的</text>
      <text class="empty-sub">快去挑选心仪的商品吧</text>
      <view class="go-shop-btn" @tap="goCategory">
        <text>去选购</text>
      </view>
    </view>

    <!-- 底部结算栏 -->
    <view class="bottom-bar" v-if="cartItems.length > 0">
      <view class="bottom-left">
        <view class="check-wrap" @tap="toggleSelectAll">
          <view class="check-circle" :class="{ checked: isAllSelected }">
            <text v-if="isAllSelected" class="check-icon">✓</text>
          </view>
        </view>
        <text class="select-all-text">全选</text>
        <view class="total-info">
          <text class="total-label">合计：</text>
          <text class="total-price">¥{{ totalPrice }}</text>
        </view>
      </view>
      <view class="checkout-btn" @tap="goCheckout">
        <text>去结算</text>
      </view>
    </view>
  </view>
</template>

<script>
import { requireLogin, isLoggedIn, getUserId } from '@/utils/auth.js'
import { getLocalCart, setLocalCart, removeFromCart as cartRemove, clearCart as cartClear, updateCartItemQuantity, calcCartSummary, initCart } from '@/utils/cart.js'

export default {
  data() {
    return {
      isEdit: false,
      cartItems: []
    }
  },
  computed: {
    isAllSelected() {
      return this.cartItems.length > 0 && this.cartItems.every(item => item.selected)
    },
    totalPrice() {
      let total = 0
      this.cartItems.forEach(item => {
        if (item.selected) {
          total += item.quantity * parseFloat(item.currentPrice.replace('¥', ''))
        }
      })
      return total.toFixed(2)
    },
    selectedCount() {
      return this.cartItems.filter(item => item.selected).reduce((sum, item) => sum + item.quantity, 0)
    }
  },
  onLoad() {
    this.loadCart()
  },
  onShow() {
    this.loadCart()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    toggleEdit() {
      this.isEdit = !this.isEdit
    },
    loadCart() {
      const cart = getLocalCart()
      this.cartItems = cart.map(c => {
        const p = c.product || {}
        return {
          id: c.id,
          name: p.name || "",
          image: p.image || p.coverImage || "",
          spec: (p.specs && p.specs[0] && p.specs[0].name) || "",
          currentPrice: (p.price ? ("\u00A5" + p.price) : (p.flashPrice ? ("\u00A5" + p.flashPrice) : "\u00A50")),
          quantity: c.quantity,
          selected: true
        }
      })
    },
    saveCart() {
      const items = this.cartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        product: {
          name: item.name,
          image: item.image,
          price: parseFloat((item.currentPrice || "").replace(/[^0-9.]/g, "")) || 0
        }
      }))
      setLocalCart(items)
    },
    toggleSelect(index) {
      // 切换：undefined/null/false → true, true → false
      const current = this.cartItems[index].selected
      this.cartItems[index].selected = (current === true) ? false : true
      this.saveCart()
    },
    toggleSelectAll() {
      const allSelected = this.isAllSelected
      this.cartItems.forEach(item => {
        item.selected = !allSelected
      })
      this.saveCart()
    },
    increase(index) {
      const MAX = 99
      if (this.cartItems[index].quantity >= MAX) {
        uni.showToast({ title: '已达单次购买上限', icon: 'none' })
        return
      }
      this.cartItems[index].quantity++
      this.saveCart()
    },
    decrease(index) {
      if (this.cartItems[index].quantity > 0) {
        this.cartItems[index].quantity--
        if (this.cartItems[index].quantity === 0) {
          this.cartItems[index].selected = false
        }
        this.saveCart()
      }
    },
    removeItem(index) {
      uni.showModal({
        title: '提示',
        content: '确定删除该商品？',
        success: (res) => {
          if (res.confirm) {
            this.cartItems.splice(index, 1)
            this.saveCart()
          }
        }
      })
    },
    goCategory() {
      uni.switchTab({ url: '/pages/category/index' })
    },
    async goCheckout() {
      if (!await requireLogin()) return
      if (this.selectedCount === 0) {
        uni.showToast({ title: '请选择商品', icon: 'none' })
        return
      }
      // 保存选中商品到结算页（兼容 selected 为 undefined 的情况）
      const selectedItems = this.cartItems.filter(item => item.selected !== false)
      if (selectedItems.length === 0) {
        uni.showToast({ title: '请选择商品', icon: 'none' })
        return
      }
      uni.setStorageSync('checkoutItems', JSON.stringify(selectedItems))
      uni.navigateTo({ url: '/pages/checkout/index' })
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #F5F1EB;
  padding-bottom: 120rpx;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  background-color: #FFFFFF;
  padding: 0 24rpx;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  font-size: 44rpx;
  color: #333;
  font-weight: 300;
}

.nav-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.edit-btn {
  font-size: 28rpx;
  color: #4F9A42;
}

/* 购物车列表 */
.cart-list {
  padding: 20rpx;
  margin-top: 88rpx;
}

.cart-item {
  display: flex;
  align-items: flex-start;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  position: relative;
}

.check-wrap {
  padding-top: 40rpx;
  margin-right: 16rpx;
}

.check-circle {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #CCCCCC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-circle.checked {
  background-color: #4F9A42;
  border-color: #4F9A42;
}

.check-icon {
  font-size: 24rpx;
  color: #FFFFFF;
}

.item-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background-color: #F5F5F5;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.item-spec {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
}

.item-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #FF3333;
}

.quantity-control {
  display: flex;
  align-items: center;
}

.qty-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn.minus {
  border: 2rpx solid #E0E0E0;
  background-color: #FFFFFF;
}

.qty-btn.plus {
  background-color: #4F9A42;
}

.qty-minus {
  font-size: 32rpx;
  color: #666;
  font-weight: 300;
}

.qty-plus {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 300;
}

.qty-num {
  font-size: 28rpx;
  color: #333;
  min-width: 48rpx;
  text-align: center;
}

.delete-btn {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
}

.delete-btn text {
  font-size: 24rpx;
  color: #FF3333;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.empty-sub {
  font-size: 26rpx;
  color: #999;
  margin-top: 12rpx;
  margin-bottom: 48rpx;
}

.go-shop-btn {
  background-color: #4F9A42;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 600;
  padding: 24rpx 64rpx;
  border-radius: 40rpx;
}

/* 底部结算栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: #FFFFFF;
  border-top: 1rpx solid #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  z-index: 100;
}

.bottom-left {
  display: flex;
  align-items: center;
}

.select-all-text {
  font-size: 26rpx;
  color: #333;
  margin-left: 12rpx;
}

.total-info {
  margin-left: 32rpx;
  display: flex;
  align-items: baseline;
}

.total-label {
  font-size: 26rpx;
  color: #333;
}

.total-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #FF3333;
}

.checkout-btn {
  background-color: #4F9A42;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  padding: 24rpx 48rpx;
  border-radius: 40rpx;
}
</style>
