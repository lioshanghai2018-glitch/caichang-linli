<template>
  <view class="container">
    <!-- IP形象区域 -->
    <view class="ip-section">
      <image class="ip-image" src="/static/images/萝卜仔.png" mode="aspectFill"></image>
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
    <view class="card">
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
                  <view class="add-button" :data-id="item.id" @tap="addToCart">
                    <view class="add-icon"></view>
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
            <image class="group-image" src="/static/images/shucailan.png" mode="aspectFill"></image>
          </swiper-item>
          <swiper-item>
            <image class="group-image" src="/static/images/shucailan.png" mode="aspectFill"></image>
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

        flashSaleProducts: [
          {
            id: 1,
            name: '有机西红柿',
            weight: '500g/份',
            originalPrice: '¥12.8',
            currentPrice: '¥8.8',
            image: '/static/images/有机西红柿.png'
          },
          {
            id: 2,
            name: '新鲜鸡蛋',
            weight: '10枚/盒',
            originalPrice: '¥15.0',
            currentPrice: '¥9.9',
            image: '/static/images/新鲜鸡蛋.png'
          },
          {
            id: 3,
            name: '有机青菜',
            weight: '300g/份',
            originalPrice: '¥6.0',
            currentPrice: '¥3.8',
            image: '/static/images/有机青菜.png'
          },
          {
            id: 4,
            name: '胡萝卜',
            weight: '400g/份',
            originalPrice: '¥5.0',
            currentPrice: '¥2.9',
            image: '/static/images/胡萝卜.png'
          }
        ],

        groupTitle: '新鲜好菜 团购更优惠',
        groupSubtitle: '当日下单·次日自提',
        currentSwiper: 0
      }
    },

    onLoad() {
      this.startCountdown();
    },

    onUnload() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }
    },

    methods: {
      startCountdown() {
        let totalSeconds = 2 * 3600 + 59 * 60 + 59;

        this.countdownTimer = setInterval(() => {
          if (totalSeconds > 0) {
            totalSeconds--;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const countdownText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            this.countdown = countdownText;
          } else {
            totalSeconds = 2 * 3600 + 59 * 60 + 59;
          }
        }, 1000);
      },

      onSwiperChange(e) {
        this.currentSwiper = e.detail.current;
      },

      addToCart(e) {
        const productId = e.currentTarget.dataset.id;
        console.log('添加商品到购物车:', productId);
      },

      onShopNow() {
        console.log('立即选购');
      },

      onViewMore() {
        console.log('查看更多');
      },

      goMine() {
        uni.switchTab({ url: '/pages/mine/index' })
      },

      goCategory() {
        uni.switchTab({ url: '/pages/category/index' })
      },

      goNeighbor() {
        uni.navigateTo({ url: '/pages/neighbor/index' })
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

.add-button {
  width: 44rpx;
  height: 44rpx;
  background-color: #4F9A42;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  flex-shrink: 0;
}

.add-icon {
  width: 20rpx;
  height: 4rpx;
  background-color: #FFFFFF;
  border-radius: 2rpx;
  position: relative;
}
.add-icon::after {
  content: '';
  position: absolute;
  width: 4rpx;
  height: 20rpx;
  background-color: #FFFFFF;
  border-radius: 2rpx;
  top: -8rpx;
  left: 8rpx;
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
</style>