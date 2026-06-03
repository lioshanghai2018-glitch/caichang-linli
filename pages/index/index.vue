<template>
  <view class="container">
    <!-- IP形象区域 -->
    <view class="ip-section">
      <image class="ip-image" src="/static/images/萝卜仔.webp" mode="aspectFill"></image>
    </view>

    <!-- 卡片1：问候 + 买菜邻里 -->
    <view class="card">
      <view class="greeting-section" @tap="goMine">
        <view class="greeting-header">
          <text class="greeting-text">{{greeting}}</text>
          <view class="vip-tag">
            <text>{{vipLevel}}</text>
          </view>
        </view>
        <view class="quick-actions">
          <view class="action-card" :data-index="0" @tap.stop="goCategory">
            <view class="iconfont icon-maicai action-icon"></view>
            <text class="action-title">{{quickActions[0].title}}</text>
            <text class="action-subtitle">{{quickActions[0].subtitle}}</text>
          </view>
          <view class="action-card" :data-index="1" @tap.stop="goNeighbor">
            <view class="iconfont icon-linlishequ action-icon"></view>
            <text class="action-title">{{quickActions[1].title}}</text>
            <text class="action-subtitle">{{quickActions[1].subtitle}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 卡片2：限时特惠 -->
    <view class="card" v-if="flashSaleProducts.length > 0">
      <view class="flash-sale-section">
        <view class="section-header">
          <text class="section-title">限时特惠</text>
          <view class="countdown-box">
            <text class="countdown-text">距结束 {{countdown}}</text>
          </view>
          <text class="view-more" @tap="onViewMore">查看更多</text>
        </view>
        <scroll-view class="product-scroll" scroll-x="true">
          <view class="product-list">
            <view class="product-card" v-for="item in flashSaleProducts" :key="item.id">
              <image class="product-image" :src="item.image" mode="aspectFill"></image>
              <view class="product-info">
                <text class="product-name">{{item.name}}</text>
                <text class="product-weight">{{item.weight}}</text>
                <view class="price-row">
                  <text class="original-price">{{item.originalPrice}}</text>
                  <text class="current-price">{{item.currentPrice}}</text>
                  <view class="quantity-inline">
                    <view class="btn-minus" v-if="item.quantity > 0" @tap.stop="decreaseFromFlash(item)">
                      <view class="minus-icon"></view>
                    </view>
                    <text class="quantity-num" v-if="item.quantity > 0">{{item.quantity}}</text>
                    <view class="btn-plus" @tap.stop="addToCart(item)">
                      <view class="add-icon"></view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 卡片3：新鲜好菜 -->
    <view class="card card-no-padding">
      <view class="group-section">
        <swiper class="group-swiper" circular="true" @change="onSwiperChange">
          <swiper-item>
            <image class="group-image" src="/static/images/shucailan.webp" mode="aspectFill"></image>
          </swiper-item>
          <swiper-item>
            <image class="group-image" src="/static/images/shucailan.webp" mode="aspectFill"></image>
          </swiper-item>
        </swiper>
        <view class="swiper-indicators">
          <view class="indicator" :class="{ active: currentSwiper === 0 }"></view>
          <view class="indicator" :class="{ active: currentSwiper === 1 }"></view>
        </view>
      </view>
    </view>

    <!-- 品牌Logo区域 -->
    <view class="brand-section">
      <image class="brand-logo" src="/static/images/logo.png" mode="aspectFit"></image>
    </view>

    <!-- 底部结算栏 -->
    <view class="checkout-bar" v-if="selectedCount > 0">
      <view class="checkout-left" @tap="goCart">
        <view class="checkout-cart-wrap">
          <image class="checkout-cart-icon" src="/static/images/gouwuche.png" mode="aspectFit"></image>
          <view class="checkout-cart-badge">
            <text>{{selectedCount}}</text>
          </view>
        </view>
        <view class="checkout-info">
          <text class="checkout-count">已选{{selectedCount}}件商品</text>
          <text class="checkout-total">合计：<text class="checkout-price">¥{{selectedTotal}}</text></text>
        </view>
      </view>
      <view class="checkout-btn" @tap="goCheckout">
        <text>去结算</text>
      </view>
    </view>

    <custom-tabbar :current="0" />
  </view>
</template>

<script>
  export default {
    data() {
      return {
        countdown: '02:59:59',
        countdownBackground: '#F5F5F5',
        countdownColor: '#333333',

        brandName: '大研菜场',
        brandSubtitle: '新鲜·安心 每一天',
        brandDesc: '源头直采·新鲜到家',
        buttonText: '立即选购',

        greeting: 'Hi,亲爱的邻居',
        vipLevel: 'V1',

        quickActions: [
          {
            icon: '/static/images/icon_vegetable.png',
            title: '买菜',
            subtitle: '提前下单 送菜上门'
          },
          {
            icon: '/static/images/icon_neighbor.png',
            title: '邻里',
            subtitle: '免费发布 邻里互助'
          }
        ],

        flashSaleLoading: false,
        flashSaleProducts: [],
        flashSaleEndTime: null,
        selectedCount: 0,
        selectedTotal: '0.00',

        groupTitle: '新鲜好菜 团购更优惠',
        groupSubtitle: '当日下单·次日自提',
        currentSwiper: 0
      }
    },

    onLoad() {
      this.startCountdown();
      this.loadFlashSaleProducts();
    },

    onShow() {
      this.syncAllCart();
    },

    onUnload() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }
    },

    methods: {
      async loadFlashSaleProducts() {
        this.flashSaleLoading = true;
        try {
          // 获取特惠活动信息
          const saleRes = await uni.request({
            url: 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/getFlashSale',
            method: 'POST',
            data: { method: 'getFlashSale', params: {} }
          });

          // getFlashSale 返回的是数组（按 startTime desc），筛选当前进行中的活动
          if (saleRes.data?.code === 0 && saleRes.data.data) {
            const saleList = Array.isArray(saleRes.data.data) ? saleRes.data.data : [saleRes.data.data];
            const now = Date.now();
            // 优先选进行中的（status=true && startTime<=now<endTime），否则取第一个未结束的
            const activeSale = saleList.find(s => s.status === true && s.startTime <= now && s.endTime > now)
              || saleList.find(s => s.status === true && s.endTime > now)
              || null;

            if (activeSale) {
              this.flashSaleEndTime = activeSale.endTime;
              this.startCountdown();

              // 获取特惠商品列表（按 flashSaleId 过滤）
              const productRes = await uni.request({
                url: 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/getFlashSaleProducts',
                method: 'POST',
                data: { method: 'getFlashSaleProducts', params: { flashSaleId: activeSale._id } }
              });

              if (productRes.data?.code === 0) {
                this.flashSaleProducts = productRes.data.data.map(item => ({
                  id: item._id,
                  name: item.name,
                  image: item.image || '/static/images/placeholder.png',
                  weight: item.specs?.[0]?.name || '',
                  originalPrice: '¥' + item.originalPrice,
                  currentPrice: '¥' + item.flashPrice,
                  quantity: 0
                }));
              }
              this.flashSaleLoading = false;
              return;
            }
          }
          // 没有进行中的特惠活动
          this.flashSaleProducts = [];
          this.flashSaleEndTime = null;
          if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
          }
          this.countdown = '00:00:00';
        } catch (e) {
          console.error('加载限时特惠商品失败:', e);
        } finally {
          this.flashSaleLoading = false;
        }
      },

      startCountdown() {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
        }
        this.countdownTimer = setInterval(() => {
          const now = Date.now();
          const remaining = this.flashSaleEndTime - now;
          if (remaining <= 0) {
            this.countdown = '00:00:00';
            this.loadFlashSaleProducts(); // 刷新商品列表
            return;
          }
          const totalSeconds = Math.floor(remaining / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          this.countdown = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
      },

      onSwiperChange(e) {
        this.currentSwiper = e.detail.current;
      },

      addToCart(item) {
        item.quantity++;
        this.saveFlashSaleToCart();
      },

      decreaseFromFlash(product) {
        if (product.quantity > 0) {
          product.quantity--;
          this.saveFlashSaleToCart();
        }
      },

      saveFlashSaleToCart() {
        // 从本地存储读取现有购物车
        const cartItems = uni.getStorageSync("cartItems") ? JSON.parse(uni.getStorageSync("cartItems")) : [];
        // 更新限时特惠商品
        this.flashSaleProducts.forEach(p => {
          if (p.quantity > 0) {
            const existIndex = cartItems.findIndex(c => c.name === p.name);
            if (existIndex >= 0) {
              cartItems[existIndex].quantity = p.quantity;
            } else {
              cartItems.push({
                name: p.name,
                spec: p.weight,
                image: p.image,
                currentPrice: p.currentPrice,
                originalPrice: p.originalPrice,
                quantity: p.quantity,
                selected: true
              });
            }
          } else {
            // 数量为0，从购物车移除
            const existIndex = cartItems.findIndex(c => c.name === p.name);
            if (existIndex >= 0) {
              cartItems.splice(existIndex, 1);
            }
          }
        });
        uni.setStorageSync("cartItems", JSON.stringify(cartItems));
        this.updateSelectedTotal();
      },

      updateSelectedTotal() {
        const cartItems = uni.getStorageSync("cartItems") ? JSON.parse(uni.getStorageSync("cartItems")) : [];
        let count = 0;
        let total = 0;
        cartItems.forEach(item => {
          if (item.selected !== false) {
            count += item.quantity || 0;
            total += (item.quantity || 0) * parseFloat(item.currentPrice.replace('¥', '') || 0);
          }
        });
        this.selectedCount = count;
        this.selectedTotal = total.toFixed(2);
      },

      syncAllCart() {
        const cartItems = uni.getStorageSync("cartItems") ? JSON.parse(uni.getStorageSync("cartItems")) : [];
        this.flashSaleProducts.forEach(p => {
          const cartItem = cartItems.find(c => c.name === p.name);
          p.quantity = cartItem ? (cartItem.quantity || 0) : 0;
        });
        this.updateSelectedTotal();
      },

      onShopNow() {
        uni.navigateTo({ url: '/pages/category/index' })
      },

      onViewMore() {
        uni.navigateTo({ url: '/pages/category/index' })
      },

      goMine() {
        uni.switchTab({ url: '/pages/mine/index' })
      },

      goCategory() {
        uni.switchTab({ url: '/pages/category/index' })
      },

      goNeighbor() {
        uni.navigateTo({ url: '/pages/neighbor/index' })
      },

      goCart() {
        uni.navigateTo({ url: '/pages/cart/index' })
      },

      goCheckout() {
        uni.navigateTo({ url: '/pages/cart/index' })
      }
    }
  }
</script>

<style>
/* 全局样式 */
.container {
  padding: 0 24rpx 12rpx;
  background-color: #F5F1EB;
  min-height: 0;
}

/* 卡片通用样式 */
.card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  margin-top: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.card-no-padding {
  padding: 0;
  overflow: hidden;
}

/* 顶部品牌区 */
.brand-section {
  height: 208rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
}

.brand-info {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #2D5A27;
  line-height: 44rpx;
}

.brand-subtitle {
  font-size: 56rpx;
  font-weight: 700;
  color: #000000;
  margin-top: 8rpx;
}

.brand-desc {
  font-size: 24rpx;
  color: #666666;
  margin-top: 8rpx;
}

.shop-button {
  width: 240rpx;
  height: 64rpx;
  background-color: #2D5A27;
  color: #FFFFFF;
  font-size: 28rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  margin-top: 16rpx;
}

/* IP形象区域 */
.ip-section {
  height: 450rpx;
  margin: 0 -24rpx;
}

.ip-image {
  width: 100%;
  height: 450rpx;
}

.ip-placeholder text {
  color: #999999;
  font-size: 28rpx;
}

/* 问候模块 */
.greeting-section {
  cursor: pointer;
}

.greeting-header {
  display: flex;
  align-items: center;
}

.greeting-text {
  font-size: 32rpx;
  font-weight: 400;
  color: #333333;
}

.vip-tag {
  background-color: #4F9A42;
  color: #FFFFFF;
  font-size: 18rpx;
  font-weight: 600;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
}

.quick-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
}

.action-card {
  width: 300rpx;
  height: 180rpx;
  background-color: transparent;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 95rpx;
  color: #4F9A42;
}

.action-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333333;
  margin-top: 16rpx;
}

.action-subtitle {
  font-size: 20rpx;
  font-weight: 400;
  color: #999999;
  margin-top: 8rpx;
}

/* 限时特惠模块 */
.flash-sale-section {
}

.section-header {
  display: flex;
  align-items: center;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #2D5A27;
}

.countdown-box {
  background-color: #F5F5F5;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
}

.countdown-text {
  font-size: 22rpx;
  font-weight: 400;
  color: #FF3333;
}

.view-more {
  font-size: 22rpx;
  font-weight: 400;
  color: #999999;
  margin-left: auto;
}

.product-scroll {
  margin-top: 24rpx;
  white-space: nowrap;
}

.product-list {
  display: flex;
}

.product-card {
  width: 220rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
  overflow: hidden;
}

.product-image {
  width: 220rpx;
  height: 220rpx;
  border-radius: 16rpx;
  background-color: #f5f5f5;
}

.product-info {
  white-space: normal;
  overflow: hidden;
}

.product-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333333;
  margin-top: 12rpx;
  display: block;
  white-space: normal;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
}

.product-weight {
  font-size: 20rpx;
  font-weight: 400;
  color: #666666;
  margin-top: 4rpx;
  display: block;
  white-space: normal;
}

.price-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.original-price {
  font-size: 22rpx;
  font-weight: 400;
  color: #999999;
  text-decoration: line-through;
}

.current-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #FF3333;
  margin-left: 16rpx;
}

.quantity-inline {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.btn-minus,
.btn-plus {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-minus {
  border: 2rpx solid #E0E0E0;
  border-radius: 50%;
  background-color: #FFFFFF;
}

.btn-plus {
  background-color: #4F9A42;
  border-radius: 8rpx;
}

.minus-icon {
  width: 18rpx;
  height: 3rpx;
  background-color: #999999;
  border-radius: 2rpx;
}

.add-icon {
  width: 18rpx;
  height: 3rpx;
  background-color: #FFFFFF;
  border-radius: 2rpx;
  position: relative;
}
.add-icon::after {
  content: '';
  position: absolute;
  width: 3rpx;
  height: 18rpx;
  background-color: #FFFFFF;
  border-radius: 2rpx;
  top: -7rpx;
  left: 7rpx;
}

.quantity-num {
  font-size: 26rpx;
  color: #333333;
  min-width: 40rpx;
  text-align: center;
}

/* 团购模块 */
.group-section {
  position: relative;
}

.group-header {
  display: flex;
  flex-direction: column;
}

.group-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #000000;
}

.group-subtitle {
  font-size: 24rpx;
  color: #666666;
  margin-top: 8rpx;
}

.group-swiper {
  width: 100%;
  height: 380rpx;
  margin-top: 0;
  overflow: hidden;
  font-size: 0;
  line-height: 0;
}

swiper-item {
  height: 100%;
  line-height: 0;
  font-size: 0;
  display: block;
  box-sizing: border-box;
}

.group-image {
  width: 100%;
  height: 100%;
  display: block;
}

.swiper-indicators {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 8rpx 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.1));
}

.indicator {
  width: 12rpx;
  height: 12rpx;
  background-color: #CCCCCC;
  border-radius: 50%;
  margin: 0 8rpx;
}

.indicator.active {
  background-color: #2D5A27;
}

/* 品牌Logo区域 */
.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 12rpx;
}

.brand-logo {
  width: 96rpx;
  height: 96rpx;
}

/* 底部结算栏 */
.checkout-bar {
  position: fixed;
  bottom: 100rpx;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.checkout-left {
  display: flex;
  align-items: center;
}

.checkout-cart-wrap {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.checkout-cart-icon {
  width: 75rpx;
  height: 75rpx;
}

.checkout-cart-badge {
  position: absolute;
  top: -4rpx;
  right: -8rpx;
  min-width: 28rpx;
  height: 28rpx;
  background-color: #FF3333;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
}

.checkout-cart-badge text {
  color: #FFFFFF;
  font-size: 18rpx;
}

.checkout-info {
  display: flex;
  flex-direction: column;
}

.checkout-count {
  font-size: 22rpx;
  color: #999999;
}

.checkout-total {
  font-size: 22rpx;
  color: #333333;
  margin-top: 4rpx;
}

.checkout-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #4CAF50;
}

.checkout-btn {
  background-color: #4f9a42;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 600;
  padding: 16rpx 48rpx;
  border-radius: 40rpx;
}
</style>