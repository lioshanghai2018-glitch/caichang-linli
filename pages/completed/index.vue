<template>
  <view class="record-container">
    <view class="header">
      <text class="header-title">已完成</text>
      <view class="header-right">
        <text class="order-count" v-if="!loading">{{ records.length }} 单</text>
        <text class="refresh-btn" @click="fetchRecords">刷新</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="records.length === 0" class="empty">
      <text class="empty-text">暂无已完成订单</text>
    </view>

    <view v-else class="record-list">
      <view class="record-card" v-for="record in records" :key="record._id">
        <view class="record-header">
          <text class="record-no">{{ record.orderNo || record._id?.slice(-8).toUpperCase() }}</text>
          <text class="record-status status-success">已完成</text>
        </view>

        <view class="record-info">
          <view class="info-row">
            <text class="info-label">收货人</text>
            <text class="info-value">{{ record.address?.name || '-' }} {{ record.address?.phone }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">地址</text>
            <text class="info-value">{{ record.address?.address || '-' }}{{ record.address?.doorNo || '' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">商品</text>
            <text class="info-value">{{ record.products?.length || 0 }} 件</text>
          </view>
          <view class="info-row">
            <text class="info-label">金额</text>
            <text class="info-value price">¥{{ record.totalAmount }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">完成时间</text>
            <text class="info-value">{{ formatTime(record.completedAt || record.deliveryCompleteTime || record.updatedAt) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import riderApi from '../../api/rider'

const records = ref([])
const loading = ref(false)
let timer = null

onShow(() => {
  const riderInfo = uni.getStorageSync('riderInfo')
  if (!riderInfo) {
    uni.switchTab({ url: '/pages/login/index' })
    return
  }
  fetchRecords()
  // 5s 轮询
  timer = setInterval(fetchRecords, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const fetchRecords = () => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) return
  loading.value = true
  riderApi.getCompletedOrders(info.riderId || info.riderInfo?._id)
    .then(res => {
      records.value = res.data || []
    })
    .catch(err => {
      console.error('获取记录失败:', err)
    })
    .finally(() => {
      loading.value = false
    })
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.record-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: #999;
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

.record-list {
  padding: 20rpx;
}

.record-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.record-no {
  font-size: 26rpx;
  color: #666;
}

.record-status {
  font-size: 26rpx;
  font-weight: bold;
}

.status-success {
  color: #4CAF50;
}

.record-info .info-row {
  display: flex;
  margin-bottom: 12rpx;
}

.info-label {
  width: 140rpx;
  font-size: 24rpx;
  color: #999;
}

.info-value {
  flex: 1;
  font-size: 24rpx;
  color: #333;
}

.info-value.price {
  color: #ff4d4f;
  font-weight: bold;
}
</style>