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
      <view class="record-card" v-for="record in records" :key="record._id" @click="toggleExpand(record)">
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
            <text class="info-value">{{ totalQtyOf(record) }} 件
              <text class="expand-arrow">{{ expandedId === record._id ? '▾' : '▸' }}</text>
            </text>
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

        <view v-if="expandedId === record._id" class="expand-panel" @tap.stop>
          <view class="expand-title">商品清单({{ totalQtyOf(record) }} 件)</view>
          <view class="expand-item" v-for="(it, i) in (record.items || record.products || [])" :key="i">
            <image class="expand-thumb" :src="it.image" mode="aspectFill" />
            <view class="expand-info">
              <text class="expand-name">{{ it.name }}</text>
              <text class="expand-spec" v-if="it.spec">{{ it.spec }}</text>
            </view>
            <text class="expand-qty">x{{ it.qty }}</text>
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

const records = ref([])
const loading = ref(false)
// 骑手端展开态:单选互斥(同 ID 再点收起),同用户端 order.expanded 语义
const expandedId = ref(null)

const totalQtyOf = (record) => {
  const list = (record && (record.items || record.products)) || []
  return list.reduce((s, it) => s + (Number(it && it.qty) || 0), 0)
}

const toggleExpand = (record) => {
  expandedId.value = expandedId.value === record._id ? null : record._id
}

onShow(() => {
  const riderInfo = uni.getStorageSync('riderInfo')
  if (!riderInfo) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  fetchRecords()
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

/* 商品件数 + 展开交互 */
.expand-arrow {
  font-size: 24rpx;
  color: #999;
  margin-left: 8rpx;
}
.expand-panel {
  background: #FAFAFA;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-top: 12rpx;
}
.expand-title {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 12rpx;
}
.expand-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}
.expand-item:last-child { border-bottom: none; }
.expand-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  margin-right: 12rpx;
  background: #EEE;
  flex-shrink: 0;
}
.expand-info { flex: 1; min-width: 0; }
.expand-name {
  font-size: 24rpx;
  color: #333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.expand-spec {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}
.expand-qty {
  font-size: 24rpx;
  color: #FF6B00;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 12rpx;
}
</style>