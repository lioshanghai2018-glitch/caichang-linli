<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">设置</text>
    </view>

    <!-- 设置列表 -->
    <view class="card">
      <view class="option-item" @tap="goAbout">
        <view class="option-left">
          <view class="iconfont icon-guanyuwomen"></view>
          <text class="option-text">关于我们</text>
        </view>
        <view class="icon-arrow"></view>
      </view>
      <view class="divider"></view>
      <view class="option-item" @tap="clearCache">
        <view class="option-left">
          <view class="iconfont icon-qingchuhuancun"></view>
          <text class="option-text">清除缓存</text>
        </view>
        <text class="option-value">{{ cacheSize }}</text>
      </view>
      <view class="divider"></view>
      <view class="option-item">
        <view class="option-left">
          <view class="iconfont icon-banbenshuaxin"></view>
          <text class="option-text">版本信息</text>
        </view>
        <text class="option-value">v1.0.0</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @tap="logout">
      <text>退出登录</text>
    </view>
  </view>
</template>

<script>
import { logout as doLogout } from '@/utils/auth.js'

export default {
  data() {
    return {
      cacheSize: '0 KB'
    }
  },
  onShow() {
    this.calculateCache()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goAbout() {
      uni.showModal({
        title: '关于我们',
        content: '大研菜场 v1.0.0\n源头直采·新鲜到家\n\n为社区居民提供新鲜、便捷的生鲜购物服务。',
        showCancel: false
      })
    },
    clearCache() {
      uni.showModal({
        title: '提示',
        content: '确定清除缓存？',
        success: (res) => {
          if (res.confirm) {
            uni.showToast({ title: '缓存已清除', icon: 'success' })
            this.cacheSize = '0 KB'
          }
        }
      })
    },
    calculateCache() {
      try {
        const keys = ['cartItems', 'user_addresses']
        let total = 0
        keys.forEach(key => {
          const data = uni.getStorageSync(key)
          if (data) total += data.length
        })
        if (total < 1024) {
          this.cacheSize = total + ' B'
        } else {
          this.cacheSize = (total / 1024).toFixed(1) + ' KB'
        }
      } catch (e) {
        this.cacheSize = '未知'
      }
    },
    logout() {
      uni.showModal({
        title: '提示',
        content: '确定退出登录？',
        success: (res) => {
          if (res.confirm) {
            doLogout()
            uni.showToast({ title: '退出成功', icon: 'success' })
            setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 600)
          }
        }
      })
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #F5F1EB;
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

.card {
  background-color: #FFFFFF;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 0 24rpx;
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100rpx;
}

.option-left {
  display: flex;
  align-items: center;
}

.option-left .iconfont {
  font-size: 40rpx;
  color: #4F9A42;
  margin-right: 16rpx;
}

.option-text {
  font-size: 28rpx;
  color: #333;
}

.option-value {
  font-size: 26rpx;
  color: #999;
}

.divider {
  height: 1rpx;
  background-color: #F0F0F0;
}

.icon-arrow {
  width: 16rpx;
  height: 16rpx;
  border-right: 3rpx solid #999;
  border-bottom: 3rpx solid #999;
  transform: rotate(-45deg);
}

.logout-btn {
  margin: 40rpx 20rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn text {
  font-size: 30rpx;
  color: #FF3333;
}
</style>