<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">选择收货地址</text>
    </view>

    <!-- 地址列表 -->
    <view class="address-list" v-if="addressList.length > 0">
      <view
        class="address-card"
        :class="{ selected: selectedId === item.id }"
        v-for="item in addressList"
        :key="item.id"
        @tap="selectAddress(item)"
      >
        <view class="address-main">
          <view class="address-top">
            <text class="contact-name">{{item.name}}</text>
            <text class="contact-phone">{{item.phone}}</text>
            <view class="default-tag" v-if="item.isDefault">
              <text>默认</text>
            </view>
          </view>
          <view class="address-detail">
            <text class="address-text">{{item.address}}{{item.doorNo}}</text>
          </view>
        </view>
        <view class="arrow">›</view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <text class="empty-text">暂无收货地址</text>
      <text class="empty-sub">点击下方按钮新增地址</text>
    </view>

    <!-- 底部新增按钮 -->
    <view class="bottom-bar">
      <view class="add-btn" @tap="goAddAddress">
        <text class="add-btn-text">+ 新增地址</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getAddressList } from '@/utils/address.js'

export default {
  data() {
    return {
      selectedId: '',
      addressList: []
    }
  },
  onLoad() {
    this.loadAddresses()
  },
  onShow() {
    this.loadAddresses()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    loadAddresses() {
      this.addressList = getAddressList()
      // 找出当前选中的
      const defaultAddr = this.addressList.find(a => a.isDefault)
      if (defaultAddr) {
        this.selectedId = defaultAddr.id
      }
    },
    selectAddress(item) {
      // 保存选中地址到全局数据，供结算页使用
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      if (prevPage && prevPage.route === 'pages/checkout/index') {
        prevPage.$vm.selectedAddress = item
        prevPage.$vm.$forceUpdate()
      }
      uni.navigateBack()
    },
    goAddAddress() {
      uni.navigateTo({ url: '/pages/address/edit' })
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #F5F1EB;
  padding-bottom: 140rpx;
}

.nav-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  background-color: #FFFFFF;
  padding: 0 24rpx;
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
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
  margin-right: 56rpx;
}

.address-list {
  padding: 20rpx;
}

.address-card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}

.address-card.selected {
  border: 2rpx solid #4F9A42;
}

.address-main {
  flex: 1;
}

.address-top {
  display: flex;
  align-items: center;
}

.contact-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.contact-phone {
  font-size: 28rpx;
  color: #666;
  margin-left: 20rpx;
}

.default-tag {
  background-color: #4F9A42;
  border-radius: 4rpx;
  padding: 2rpx 8rpx;
  margin-left: 12rpx;
}

.default-tag text {
  font-size: 20rpx;
  color: #FFF;
}

.address-detail {
  margin-top: 8rpx;
}

.address-text {
  font-size: 26rpx;
  color: #666;
}

.arrow {
  font-size: 36rpx;
  color: #CCC;
  margin-left: 16rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
}

.empty-sub {
  font-size: 24rpx;
  color: #CCC;
  margin-top: 12rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  background-color: #FFFFFF;
  border-top: 1rpx solid #E8E8E8;
}

.add-btn {
  background-color: #4F9A42;
  border-radius: 40rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>