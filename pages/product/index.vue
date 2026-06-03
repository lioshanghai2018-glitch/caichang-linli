<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">商品详情</text>
    </view>

    <!-- 商品图片 -->
    <view class="product-image-wrap">
      <image class="product-image" :src="product.image" mode="aspectFill" />
    </view>

    <!-- 商品信息 -->
    <view class="product-info-card">
      <view class="price-row">
        <text class="current-price">¥{{ product.currentPrice }}</text>
        <text class="original-price">{{ product.originalPrice }}</text>
      </view>
      <text class="product-name">{{ product.name }}</text>
      <text class="product-desc">{{ product.desc }}</text>
      <view class="service-tag">
        <text>{{ product.service }}</text>
      </view>
      <view class="stock-hint">
        <text class="stock-dot"></text>
        <text class="stock-text">库存充足</text>
      </view>
    </view>

    <!-- 商品描述 -->
    <view class="detail-card">
      <text class="card-title">商品详情</text>
      <text class="detail-text">{{ product.detail || '源头直采，新鲜到家。精选优质商品，品质保证。' }}</text>
    </view>

    <!-- 底部购买栏 -->
    <view class="bottom-bar">
      <view class="left-icons">
        <view class="icon-btn" @tap="addToFavorite">
          <view class="iconfont" :class="isFavorite ? 'icon-shoucang1' : 'icon-shoucang'"></view>
          <text class="icon-label">收藏</text>
        </view>
      </view>
      <view class="action-btns">
        <view class="add-cart-btn" @tap="addToCart">
          <text>加入购物车</text>
        </view>
        <view class="buy-btn" @tap="buyNow">
          <text>立即购买</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getProductById } from '@/utils/product.js'
import { addToCart, getCartItems } from '@/utils/cart.js'

export default {
  data() {
    return {
      productId: '',
      product: {
        name: '',
        desc: '',
        spec: '',
        image: '',
        originalPrice: '',
        currentPrice: '',
        service: '',
        stock: 100
      },
      isFavorite: false
    }
  },
  onLoad(options) {
    if (options.id) {
      this.productId = options.id
      this.loadProduct()
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    loadProduct() {
      const allProducts = getCartItems()
      const found = allProducts.find(p => p.id == this.productId)
      if (found) {
        this.product = { ...found }
      } else {
        const mockProducts = [
          { id: '1', name: '有机西红柿', desc: '自然成熟·酸甜可口', spec: '约500g/份', image: '/static/images/有机西红柿.png', originalPrice: '¥12.80', currentPrice: '¥8.80', service: '当日下单·次日自提', stock: 100 },
          { id: '2', name: '新鲜鸡蛋', desc: '农家散养·营养健康', spec: '10枚/盒', image: '/static/images/新鲜鸡蛋.png', originalPrice: '¥15.00', currentPrice: '¥9.90', service: '当日下单·次日自提', stock: 50 },
          { id: '3', name: '有机青菜', desc: '新鲜直采·产地直发', spec: '约300g/份', image: '/static/images/有机青菜.png', originalPrice: '¥6.00', currentPrice: '¥3.80', service: '当日下单·次日自提', stock: 200 },
          { id: '4', name: '胡萝卜', desc: '新鲜胡萝卜', spec: '约400g/份', image: '/static/images/胡萝卜.png', originalPrice: '¥5.00', currentPrice: '¥2.90', service: '当日下单·次日自提', stock: 150 }
        ]
        const defaultProduct = mockProducts.find(p => p.id == this.productId) || mockProducts[0]
        this.product = { ...defaultProduct }
      }
    },
    addToFavorite() {
      this.isFavorite = !this.isFavorite
      uni.showToast({ title: this.isFavorite ? '已收藏' : '取消收藏', icon: 'none' })
    },
    addToCart() {
      addToCart({
        id: this.product.id || Date.now().toString(),
        name: this.product.name,
        spec: this.product.spec || this.product.desc,
        image: this.product.image,
        currentPrice: this.product.currentPrice,
        originalPrice: this.product.originalPrice,
        quantity: 1,
        selected: true
      })
      uni.showToast({ title: '已加入购物车', icon: 'success' })
    },
    buyNow() {
      addToCart({
        id: this.product.id || Date.now().toString(),
        name: this.product.name,
        spec: this.product.spec || this.product.desc,
        image: this.product.image,
        currentPrice: this.product.currentPrice,
        originalPrice: this.product.originalPrice,
        quantity: 1,
        selected: true
      })
      uni.navigateTo({ url: '/pages/cart/index' })
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

.product-image-wrap {
  margin-top: 88rpx;
  width: 100%;
  height: 600rpx;
  background-color: #FFFFFF;
}

.product-image {
  width: 100%;
  height: 100%;
}

.product-info-card {
  background-color: #FFFFFF;
  margin: 16rpx 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.price-row {
  display: flex;
  align-items: baseline;
}

.current-price {
  font-size: 48rpx;
  font-weight: 700;
  color: #FF3333;
}

.original-price {
  font-size: 26rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 16rpx;
}

.product-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-top: 16rpx;
  display: block;
}

.product-desc {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
  display: block;
}

.service-tag {
  display: inline-flex;
  background-color: #E8F5E9;
  border-radius: 4rpx;
  padding: 4rpx 12rpx;
  margin-top: 12rpx;
}

.service-tag text {
  font-size: 22rpx;
  color: #4F9A42;
}

.stock-hint {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}
.stock-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #4F9A42;
  margin-right: 8rpx;
}
.stock-text {
  font-size: 22rpx;
  color: #4F9A42;
}

.detail-card {
  background-color: #FFFFFF;
  margin: 16rpx 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.detail-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}

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
  padding: 0 24rpx;
  z-index: 100;
}

.left-icons {
  display: flex;
  align-items: center;
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 32rpx;
}

.icon-btn .iconfont {
  font-size: 40rpx;
  color: #666;
}

.icon-label {
  font-size: 18rpx;
  color: #666;
  margin-top: 4rpx;
}

.action-btns {
  display: flex;
  margin-left: auto;
}

.add-cart-btn {
  background-color: #FFFFFF;
  border: 2rpx solid #4F9A42;
  color: #4F9A42;
  font-size: 28rpx;
  font-weight: 600;
  padding: 16rpx 32rpx;
  border-radius: 40rpx;
}

.buy-btn {
  background-color: #4F9A42;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 600;
  padding: 16rpx 32rpx;
  border-radius: 40rpx;
  margin-left: 16rpx;
}
</style>