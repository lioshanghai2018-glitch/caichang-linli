<template>
  <view class="orders-container">
    <view class="header">
      <text class="header-title">配送中</text>
      <view class="header-right">
        <text class="order-count" v-if="!loading">{{ orders.length }} 单</text>
        <text class="refresh-btn" @click="fetchOrders">刷新</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="orders.length === 0" class="empty">
      <text class="empty-text">暂无配送中订单</text>
    </view>

    <view v-else class="order-list">
      <view class="order-card" v-for="order in orders" :key="order._id">
        <view class="order-header">
          <text class="order-no">{{ order.orderNo || order._id?.slice(-8).toUpperCase() }}</text>
          <text class="order-status">配送中</text>
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
          <button class="btn-complete" @click.stop="confirmDeliver(order)">确认送达</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import riderApi from '../../api/rider'

const orders = ref([])
const loading = ref(false)
let timer = null

onShow(() => {
  const riderInfo = uni.getStorageSync('riderInfo')
  if (!riderInfo) {
    uni.switchTab({ url: '/pages/login/index' })
    return
  }
  fetchOrders()
  // 5s 轮询拉配送进度
  timer = setInterval(fetchOrders, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const fetchOrders = () => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) return
  loading.value = true
  riderApi.getDeliveringOrders(info.riderId || info.riderInfo?._id)
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

const confirmDeliver = async (order) => {
  try {
    await uni.showModal({
      title: '确认送达',
      content: '确定已将货物送达给客户？'
    })
    await riderApi.updateStatus(order._id, 'completed')
    uni.showToast({ title: '配送完成', icon: 'success' })
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
  background: #FF9800;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.order-count {
  font-size: 28rpx;
  opacity: 0.9;
}

.refresh-btn {
  font-size: 26rpx;
  color: #fff;
  background: rgba(255,255,255,0.2);
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
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
  color: #FF9800;
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

.btn-complete {
  background: #4CAF50;
  color: #fff;
  font-size: 26rpx;
  padding: 15rpx 40rpx;
  border-radius: 40rpx;
}
</style>