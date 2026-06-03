<template>
  <view class="record-container">
    <view class="header">
      <text class="header-title">配送记录</text>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="records.length === 0" class="empty">
      <text class="empty-text">暂无配送记录</text>
    </view>

    <view v-else class="record-list">
      <view class="record-card" v-for="record in records" :key="record._id">
        <view class="record-header">
          <text class="record-no">{{ record.orderNo }}</text>
          <text class="record-status" :class="getStatusClass(record.status)">
            {{ getStatusText(record.status) }}
          </text>
        </view>

        <view class="record-info">
          <view class="info-row">
            <text class="info-label">收货人</text>
            <text class="info-value">{{ record.address?.name || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">地址</text>
            <text class="info-value">{{ record.address?.address || '-' }}</text>
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
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import riderApi from '../../api/rider'
import { ORDER_STATUS_TEXT, DELIVERY_STATUS_TEXT } from '@/utils/config.js'

const records = ref([])
const loading = ref(false)

onShow(() => {
  fetchRecords()
})

const fetchRecords = () => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) {
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }

  loading.value = true
  riderApi.getRecord(info.riderId || info.riderInfo?._id)
    .then(res => {
      records.value = (res.data || []).filter(item =>
        item.status === 'completed' || item.deliveryStatus === 'completed'
      )
    })
    .catch(err => {
      console.error('获取记录失败:', err)
    })
    .finally(() => {
      loading.value = false
    })
}

const getStatusText = (status) => {
  return ORDER_STATUS_TEXT[status] || DELIVERY_STATUS_TEXT[status] || status
}

const getStatusClass = (status) => {
  return status === 'completed' ? 'status-success' : 'status-pending'
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
  background: #4CAF50;
  color: #fff;
  padding: 30rpx 40rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
}

.loading, .empty {
  display: flex;
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
}

.record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
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

.status-pending {
  color: #E6A23C;
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
</style>