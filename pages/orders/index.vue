<template>
  <view class="orders-container">
    <view class="header">
      <text class="header-title">待配送订单</text>
      <text class="order-count" v-if="!loading">{{ orders.length }} 单</text>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="orders.length === 0" class="empty">
      <image class="empty-icon" src="/static/empty.png" mode="aspectFit"></image>
      <text class="empty-text">暂无待配送订单</text>
    </view>

    <view v-else class="order-list">
      <view class="order-card" v-for="order in orders" :key="order._id" @click="showDetail(order)">
        <view class="order-header">
          <text class="order-no">订单号: {{ order.orderNo }}</text>
          <text class="order-status">待取货</text>
        </view>

        <view class="order-info">
          <view class="info-row">
            <text class="info-label">收货人</text>
            <text class="info-value">{{ order.address?.name || '-' }} {{ order.address?.phone }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">地址</text>
            <text class="info-value">{{ order.address?.address || '-' }}{{ order.address?.doorNo || '' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">商品</text>
            <text class="info-value">{{ order.products?.length || 0 }} 件</text>
          </view>
          <view class="info-row">
            <text class="info-label">金额</text>
            <text class="info-value price">¥{{ order.totalAmount }}</text>
          </view>
        </view>

        <view class="order-actions">
          <button class="btn-start" @click.stop="startDelivery(order)">开始配送</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import riderApi from '../../api/rider'

const orders = ref([])
const loading = ref(false)

// 检查登录状态
onShow(() => {
  const riderInfo = uni.getStorageSync('riderInfo')
  if (!riderInfo) {
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  fetchOrders()
})

const fetchOrders = () => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/index' })
    }, 1000)
    return
  }
  loading.value = true

  riderApi.getOrders(info.riderId || info.riderInfo?._id)
    .then(res => {
      orders.value = res.data || []
    })
    .catch(err => {
      console.error('获取订单失败:', err)
    })
    .finally(() => {
      loading.value = false
    })
}

const startDelivery = async (order) => {
  try {
    await uni.showModal({
      title: '确认开始配送',
      content: '确定要开始配送这个订单吗？'
    })

    await riderApi.updateStatus(order._id, 'delivering')
    uni.showToast({ title: '已开始配送', icon: 'success' })
    fetchOrders()
  } catch (e) {
    if (e.errMsg?.includes('cancel')) return
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style scoped>
.orders-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: #4CAF50;
  color: #fff;
  padding: 30rpx 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
}

.order-count {
  font-size: 28rpx;
  opacity: 0.9;
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
}

.order-list {
  padding: 20rpx;
}

.order-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-no {
  font-size: 26rpx;
  color: #666;
}

.order-status {
  font-size: 26rpx;
  color: #4CAF50;
  font-weight: bold;
}

.order-info {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 15rpx;
}

.info-label {
  width: 140rpx;
  font-size: 26rpx;
  color: #999;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.info-value.price {
  color: #ff4d4f;
  font-weight: bold;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-start {
  background: #4CAF50;
  color: #fff;
  font-size: 26rpx;
  padding: 15rpx 40rpx;
  border-radius: 40rpx;
}
</style>