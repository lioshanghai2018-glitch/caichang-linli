<template>
  <view class="orders-container">
    <view class="header">
      <text class="header-title">待取货</text>
      <view class="header-right">
        <text class="order-count" v-if="!loading">{{ orders.length }} 单</text>
        <text class="refresh-btn" @click="fetchOrders">刷新</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="orders.length === 0" class="empty">
      <text class="empty-text">暂无待取货订单</text>
    </view>

    <view v-else class="order-list">
      <view class="order-card" v-for="order in orders" :key="order._id" @click="toggleExpand(order)">
        <view class="order-header">
          <text class="order-no">{{ order.orderNo || order._id?.slice(-8).toUpperCase() }}</text>
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
            <text class="info-value">{{ totalQtyOf(order) }} 件
              <text class="expand-arrow">{{ expandedId === order._id ? '▾' : '▸' }}</text>
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">金额</text>
            <text class="info-value price">¥{{ order.totalAmount }}</text>
          </view>
        </view>

        <view v-if="expandedId === order._id" class="expand-panel" @tap.stop>
          <view class="expand-title">商品清单({{ totalQtyOf(order) }} 件)</view>
          <view class="expand-item" v-for="(it, i) in (order.items || order.products || [])" :key="i">
            <image class="expand-thumb" :src="it.image" mode="aspectFill" />
            <view class="expand-info">
              <text class="expand-name">{{ it.name }}</text>
              <text class="expand-spec" v-if="it.spec">{{ it.spec }}</text>
            </view>
            <text class="expand-qty">x{{ it.qty }}</text>
          </view>
        </view>

        <view class="order-actions">
          <button class="btn-pickup" @click.stop="confirmPickup(order)">开始配送</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import riderApi from '../../api/rider'

const orders = ref([])
const prevOrderCount = ref(0)
let refreshTimer = null

const loading = ref(false)
// 骑手端展开态:单选互斥(同 ID 再点收起),同用户端 order.expanded 语义
const expandedId = ref(null)

const totalQtyOf = (order) => {
  const list = (order && (order.items || order.products)) || []
  return list.reduce((s, it) => s + (Number(it && it.qty) || 0), 0)
}

const toggleExpand = (order) => {
  expandedId.value = expandedId.value === order._id ? null : order._id
}

onShow(() => {
  const riderInfo = uni.getStorageSync('riderInfo')
  if (!riderInfo) {
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  fetchOrders()
  if (!refreshTimer) {
    refreshTimer = setInterval(() => {
      fetchOrders()
    }, 300000)
  }
})

const fetchOrders = async () => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) return
  console.log('[rider/pending] riderInfo:', info)
  // merchantId/phone 都在嵌套的 info.riderInfo 里（云对象登录返回结构）
  let merchantId = info.merchantId || info.riderInfo?.merchantId
  const phone = info.phone || info.riderInfo?.phone
  console.log('[rider/pending] merchantId =', merchantId, 'phone =', phone)
  // 没有就尝试反推
  if (!merchantId && phone) {
    console.log('[rider/pending] merchantId 缺失，调用 fixRiderMerchantId 自动补...', phone)
    try {
      const fixRes = await riderApi.fixRiderMerchantId(phone)
      console.log('[rider/pending] fixRiderMerchantId response:', fixRes)
      if (fixRes && fixRes.data) {
        merchantId = fixRes.data.merchantId
        if (merchantId) {
          // 同时写回两处，保持结构一致
          info.merchantId = merchantId
          info.riderInfo = info.riderInfo || {}
          info.riderInfo.merchantId = merchantId
          uni.setStorageSync('riderInfo', info)
          uni.showToast({ title: fixRes.data.fixed ? '账号已自动关联商家' : '账号已就绪', icon: 'success' })
        }
      }
    } catch (e) {
      console.error('[rider/pending] fixRiderMerchantId failed:', e)
    }
  }
  if (!merchantId) {
    uni.showToast({ title: '账号未关联商家，请联系商家在骑手管理里添加', icon: 'none', duration: 4000 })
    return
  }
  loading.value = true
  // 抢单池：商家已确认分拣的订单，按 merchantId 隔离
  riderApi.getAvailableOrders(merchantId)
    .then(res => {
      console.log('[rider/pending] getAvailableOrders response:', res)
      orders.value = res.data || []
      if (orders.value.length > prevOrderCount.value && prevOrderCount.value > 0) {
        playNewOrderSound()
      }
      prevOrderCount.value = orders.value.length
    })
    .catch(err => {
      console.error('[rider/pending] 获取订单失败:', err)
      uni.showToast({ title: err?.msg || '加载失败', icon: 'none', duration: 3000 })
    })
    .finally(() => {
      loading.value = false
    })
}

const showDetail = (order) => {
  uni.navigateTo({
    url: `/pages/orders/index?orderId=${order._id}&orderNo=${order.orderNo || ''}`
  })
}

const confirmPickup = async (order) => {
  try {
    const modalRes = await uni.showModal({
      title: '开始配送',
      content: '确定要开始为这笔订单配送？'
    })
    if (!modalRes.confirm) return
    const info = uni.getStorageSync('riderInfo')
    if (!info) return
    // 抢单：把订单分配给自己，订单进入配送中
    await riderApi.claimOrder(order._id, info.riderId || info.riderInfo?._id)
    uni.showToast({ title: '已开始配送', icon: 'success' })
    fetchOrders()
  } catch (e) {
    if (e.errMsg?.includes('cancel')) return
    uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
  }
}

const playNewOrderSound = () => {
  try { uni.vibrateLong() } catch(e) {}
  try {
    const audio = uni.createInnerAudioContext()
    audio.src = '/static/notify.wav'
    audio.onCanplay = () => { audio.play() }
    audio.onError = () => { audio.destroy() }
  } catch(e) {}
}


onHide(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

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

.btn-pickup {
  background: #4CAF50;
  color: #fff;
  font-size: 26rpx;
  padding: 15rpx 40rpx;
  border-radius: 40rpx;
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
  margin-bottom: 20rpx;
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
  font-size: 26rpx;
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
  font-size: 26rpx;
  color: #FF6B00;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 12rpx;
}
</style>
