<template>
  <view class="page">
    <!-- 用户信息 -->
    <view class="user-info-section">
      <view class="avatar">
        <text class="iconfont icon-wode" style="font-size: 64rpx; color: #FFF;"></text>
      </view>
      <text class="user-name">商家用户</text>
    </view>

    <!-- 功能列表 -->
    <view class="menu-section">
      <view class="menu-item" @tap="goPage('/pages/riders/index')">
        <view class="menu-left">
          <view class="menu-icon" style="background: #E3F2FD;">
            <text class="iconfont icon-peisong" style="color: #2196F3;"></text>
          </view>
          <text class="menu-text">骑手管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goPage('/pages/communities/index')">
        <view class="menu-left">
          <view class="menu-icon" style="background: #FCE4EC;">
            <text class="iconfont icon-dingwei" style="color: #E91E63;"></text>
          </view>
          <text class="menu-text">小区管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goPage('/pages/categories/index')">
        <view class="menu-left">
          <view class="menu-icon" style="background: #FFF3E0;">
            <text class="iconfont icon-fenlei" style="color: #FF9800;"></text>
          </view>
          <text class="menu-text">分类管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goPage('/pages/flash-sale/index')">
        <view class="menu-left">
          <view class="menu-icon" style="background: #FFF8E1;">
            <text class="iconfont icon-youhuiquan" style="color: #FFC107;"></text>
          </view>
          <text class="menu-text">特惠活动</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goPage('/pages/posts/index')">
        <view class="menu-left">
          <view class="menu-icon" style="background: #E8F5E9;">
            <text class="iconfont icon-linlishequ" style="color: #4F9A42;"></text>
          </view>
          <text class="menu-text">帖子管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 其他功能 -->
    <view class="menu-section">
      <view class="menu-item">
        <view class="menu-left">
          <view class="menu-icon" style="background: #E0E0E0;">
            <text class="iconfont icon-shezhi" style="color: #757575;"></text>
          </view>
          <text class="menu-text">设置</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="version">
      <text>V1.0.0</text>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goPage(url) {
      uni.navigateTo({ url })
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #F5F1EB;
  padding-bottom: 150rpx;
}
.user-info-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  background-color: #4F9A42;
  margin-bottom: 24rpx;
}
.avatar {
  width: 140rpx;
  height: 140rpx;
  background-color: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  border: 4rpx solid rgba(255,255,255,0.4);
}
.user-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.menu-section {
  background-color: #FFFFFF;
  margin: 0 24rpx 24rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid #F5F5F5;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-left {
  display: flex;
  align-items: center;
}
.menu-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}
.menu-icon .iconfont {
  font-size: 36rpx;
}
.menu-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.menu-arrow {
  font-size: 36rpx;
  color: #CCCCCC;
  font-weight: 300;
}
.version {
  text-align: center;
  padding: 60rpx 0;
}
.version text {
  font-size: 24rpx;
  color: #999;
}
</style>