<template>
<view class="page">
  <!-- 返回按钮 -->
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">订单详情</text>
  </view>

  <!-- 订单状态大字 -->
  <view class="status-header" :style="{background: orderInfo.statusBg}">
    <text class="status-text" :style="{color: orderInfo.statusColor}">{{orderInfo.statusText}}</text>
    <text class="status-hint">{{orderInfo.statusHint}}</text>
  </view>

  <!-- 订单号 -->
  <view class="order-no-bar">
    <text class="label">订单号</text>
    <text class="value">{{orderInfo.orderNo}}</text>
    <view class="copy-btn" @tap="copyOrderNo">
      <text>复制</text>
    </view>
  </view>

  <!-- 4步骤进度条 -->
  <view class="progress-section">
    <view class="progress-bar">
      <view
        v-for="(step, idx) in orderInfo.progress"
        :key="idx"
        class="progress-step"
        :class="{completed: step.completed, active: step.active}"
      >
        <view class="step-dot">
          <text v-if="step.completed">✓</text>
          <text v-else>{{idx + 1}}</text>
        </view>
        <text class="step-label">{{step.label}}</text>
        <text class="step-time" v-if="step.time">{{step.time}}</text>
      </view>
    </view>
  </view>

  <!-- 客户信息 -->
  <view class="card customer-card">
    <view class="card-header">
      <text class="card-title">{{orderInfo.deliveryType === 'self' ? '自提客户信息' : '客户信息'}}</text>
      <view class="delivery-type-badge" :class="orderInfo.deliveryType">
        <text>{{orderInfo.deliveryType === 'delivery' ? '配送单' : '自提单'}}</text>
      </view>
    </view>
    <view class="info-row">
      <text class="info-label">客户姓名</text>
      <text class="info-value">{{orderInfo.customer.name}}</text>
    </view>
    <view class="info-row">
      <text class="info-label">联系电话</text>
      <text class="info-value">{{orderInfo.customer.phone}}</text>
      <text class="call-btn" @tap="callCustomer">拨打电话</text>
    </view>
    <view class="info-row" v-if="orderInfo.deliveryType !== 'self'">
      <text class="info-label">配送地址</text>
      <text class="info-value address">{{orderInfo.customer.address}}</text>
    </view>
    <view class="info-row" v-if="orderInfo.deliveryType === 'self' && orderInfo.customer.address">
      <text class="info-label">备注</text>
      <text class="info-value address">{{orderInfo.customer.address}}</text>
    </view>
    <view class="info-row" v-if="orderInfo.customer.pickupCode">
      <text class="info-label">自提码</text>
      <text class="info-value pickup-code">{{orderInfo.customer.pickupCode}}</text>
    </view>
  </view>

  <!-- 商品清单 -->
  <view class="card goods-card">
    <view class="card-header">
      <text class="card-title">商品清单</text>
      <text class="goods-count">共{{orderInfo.goods.length}}件</text>
    </view>
    <view class="goods-item" v-for="(item, idx) in orderInfo.goods" :key="idx">
      <view class="goods-img">
        <image :src="item.image" mode="aspectFill" v-if="item.image" />
        <text v-else class="img-placeholder">📦</text>
      </view>
      <view class="goods-info">
        <text class="goods-name">{{item.name}}</text>
        <text class="goods-spec" v-if="item.spec">{{item.spec}}</text>
      </view>
      <view class="goods-price">
        <text class="price">¥{{item.price}}</text>
        <text class="qty">x{{item.qty}}</text>
      </view>
    </view>
  </view>

  <!-- 费用明细 -->
  <view class="card fee-card">
    <view class="card-header">
      <text class="card-title">费用明细</text>
    </view>
    <view class="fee-row">
      <text class="fee-label">商品金额</text>
      <text class="fee-value">¥{{orderInfo.fee.goodsAmount}}</text>
    </view>
    <view class="fee-row">
      <text class="fee-label">配送费</text>
      <text class="fee-value">¥{{orderInfo.fee.deliveryFee}}</text>
    </view>
    <view class="fee-row" v-if="orderInfo.fee.discount > 0">
      <text class="fee-label">优惠立减</text>
      <text class="fee-value discount">-¥{{orderInfo.fee.discount}}</text>
    </view>
    <view class="fee-row total">
      <text class="fee-label">实付金额</text>
      <text class="fee-value">¥{{orderInfo.fee.payAmount}}</text>
    </view>
  </view>

  <!-- 订单时间 -->
  <view class="card time-card">
    <view class="time-item">
      <text class="time-label">下单时间</text>
      <text class="time-value">{{orderInfo.times.created}}</text>
    </view>
    <view class="time-item" v-if="orderInfo.times.paid">
      <text class="time-label">付款时间</text>
      <text class="time-value">{{orderInfo.times.paid}}</text>
    </view>
  </view>

  <!-- 底部操作栏 -->
  <view class="bottom-bar">
    <view class="action-btn secondary" @tap="printOrder">
      <text class="btn-icon">🖨</text>
      <text class="btn-text">打印小票</text>
    </view>
    <view class="action-btn primary" v-if="orderInfo.canConfirm" @tap="confirmOrder">
      <text class="btn-text">确认分拣</text>
    </view>
    <view class="action-btn primary" v-else-if="orderInfo.canReadyForPickup" @tap="readyForPickup">
      <text class="btn-text">通知用户自提</text>
    </view>
    <view class="action-btn primary" v-else-if="orderInfo.canCompleteSelf" @tap="merchantCompleteSelf">
      <text class="btn-text">用户已取货</text>
    </view>
    <view class="action-btn primary" v-else-if="orderInfo.canDeliver" @tap="startDeliver">
      <text class="btn-text">开始配送</text>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { getOrderDetail, updateOrderStatus } from '@/utils/api.js'

const STATUS_STYLE = {
  pending_payment: { text: '待付款', hint: '请尽快完成支付', color: '#FF6B00', bg: '#FFF3E0' },
  paid: { text: '已付款', hint: '请尽快分拣商品', color: '#FF6B00', bg: '#FFF3E0' },
  pending_sorting: { text: '待分拣', hint: '请尽快分拣商品', color: '#FF6B00', bg: '#FFF3E0' },
  sorting: { text: '待分拣完成', hint: '已分拣打包好，可通知自提或等待骑手取单', color: '#FF6B00', bg: '#FFF3E0' },
  ready_for_pickup: { text: '待自提', hint: '已通知用户，请等待用户到店自提', color: '#FF6B00', bg: '#FFF3E0' },
  delivering: { text: '配送中', hint: '骑手正在配送', color: '#4CAF50', bg: '#E8F5E9' },
  completed: { text: '已完成', hint: '订单已完成', color: '#999999', bg: '#F5F5F5' },
  cancelled: { text: '已取消', hint: '订单已取消', color: '#999999', bg: '#F5F5F5' },
  refunding: { text: '退款中', hint: '退款处理中', color: '#FF6B00', bg: '#FFF3E0' },
  refunded: { text: '已退款', hint: '退款已完成', color: '#999999', bg: '#F5F5F5' },
  // 中文 fallback（用户端历史脏数据，等用户端修好后会统一用英文 enum）
  '待付款': { text: '待付款', hint: '请尽快完成支付', color: '#FF6B00', bg: '#FFF3E0' },
  '已接单': { text: '已接单', hint: '请尽快分拣商品', color: '#FF6B00', bg: '#FFF3E0' },
  '已付款': { text: '已付款', hint: '请尽快分拣商品', color: '#FF6B00', bg: '#FFF3E0' },
  '待自提': { text: '待自提', hint: '已通知用户，请等待用户到店自提', color: '#FF6B00', bg: '#FFF3E0' }
}

const STEPS_DELIVERY = [
  { key: 'pending_payment', label: '待付款' },
  { key: 'pending_sorting', label: '待分拣' },
  { key: 'delivering', label: '配送中' },
  { key: 'completed', label: '已完成' }
]

// 自提单 5 步：待付款 → 待分拣 → 分拣中 → 待自提 → 已完成
const STEPS_SELF = [
  { key: 'pending_payment', label: '待付款' },
  { key: 'pending_sorting', label: '待分拣' },
  { key: 'sorting', label: '分拣中' },
  { key: 'ready_for_pickup', label: '待自提' },
  { key: 'completed', label: '已完成' }
]

// 配送单 status → 进度条亮到第几步（0..3）
const STEP_IDX_DELIVERY = {
  pending_payment: 0,
  paid: 1,
  pending_sorting: 1,
  sorting: 1,
  delivering: 2,
  completed: 3,
  cancelled: 3,
  refunding: 1,
  refunded: 3,
  // 中文 fallback
  '待付款': 0,
  '已接单': 1,
  '已付款': 1,
  '待分拣': 1,
  '分拣中': 1,
  '配送中': 2,
  '已完成': 3,
  '已取消': 3,
  '已退款': 3
}

// 自提单 status → 进度条亮到第几步（0..4）
const STEP_IDX_SELF = {
  pending_payment: 0,
  paid: 1,
  pending_sorting: 1,
  sorting: 2,
  ready_for_pickup: 3,
  completed: 4,
  cancelled: 4,
  refunding: 1,
  refunded: 4,
  // 中文 fallback
  '待付款': 0,
  '已接单': 1,
  '已付款': 1,
  '待分拣': 1,
  '分拣中': 2,
  '待自提': 3,
  '已完成': 4,
  '已取消': 4,
  '已退款': 4
}

function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function fmtTimeShort(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default {
  data() {
    return {
      orderInfo: {
        orderNo: '',
        deliveryType: 'delivery',
        statusText: '',
        statusColor: '#999',
        statusBg: '#F5F5F5',
        statusHint: '',
        progress: STEPS_DELIVERY.map(s => ({ label: s.label, time: '', completed: false, active: false })),
        customer: { name: '', phone: '', address: '', pickupCode: '' },
        goods: [],
        fee: { goodsAmount: '0.00', deliveryFee: '0.00', discount: '0.00', payAmount: '0.00' },
        times: { created: '', paid: '' },
        canConfirm: false,
        canDeliver: false,
        canReadyForPickup: false,
        canCompleteSelf: false
      },
      loading: true,
      orderId: ''
    }
  },
  onLoad(options) {
    this.orderId = options.id || ''
    if (this.orderId) this.loadDetail()
  },
  methods: {
    async loadDetail() {
      this.loading = true
      try {
        const res = await getOrderDetail(this.orderId)
        const o = res.data
        if (!o) {
          uni.showToast({ title: '订单不存在', icon: 'none' })
          return
        }
        const style = STATUS_STYLE[o.status] || { text: o.status || '待处理', hint: '', color: '#999', bg: '#F5F5F5' }
        const deliveryType = o.deliveryType || 'self'
        const isSelf = deliveryType === 'self'
        const STEPS = isSelf ? STEPS_SELF : STEPS_DELIVERY
        const STEP_IDX = isSelf ? STEP_IDX_SELF : STEP_IDX_DELIVERY
        const stepIdx = (STEP_IDX[o.status] != null) ? STEP_IDX[o.status] : 0
        const items = o.items || []
        const goods = items.map(it => ({
          name: it.name || it.productName || '',
          spec: it.spec || '',
          price: Number(it.price || 0).toFixed(2),
          qty: it.qty || it.quantity || 1,
          image: it.image || it.coverImage || ''
        }))
        const total = Number(o.totalAmount != null ? o.totalAmount : (o.payAmount != null ? o.payAmount : 0))
        const deliveryFee = Number(o.deliveryFee != null ? String(o.deliveryFee).replace('¥','') : 0)
        const discount = Number(o.coupon != null ? String(o.coupon).replace('¥','').replace('-','') : 0)
        this.orderInfo = {
          orderNo: o.orderNo,
          deliveryType,
          statusText: style.text,
          statusColor: style.color,
          statusBg: style.bg,
          statusHint: style.hint,
          progress: STEPS.map((s, i) => ({
            label: s.label,
            time: i === 0 ? fmtTimeShort(o.createdAt) : (i === 1 ? fmtTimeShort(o.paidAt || o.paidTime) : ''),
            completed: i <= stepIdx,
            active: i === stepIdx
          })),
          customer: {
            name: o.address?.name || '',
            phone: o.address?.phone || '',
            address: [o.address?.address, o.address?.doorNo].filter(Boolean).join(' '),
            pickupCode: o.pickupCode || ''
          },
          goods,
          fee: {
            goodsAmount: total.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            discount: discount.toFixed(2),
            payAmount: (total + deliveryFee - discount).toFixed(2)
          },
          times: {
            created: fmtTime(o.createdAt),
            paid: o.paidAt ? fmtTime(o.paidAt) : ''
          },
          canConfirm: ['paid', 'pending_sorting', '已接单', '已付款'].includes(o.status),
          canDeliver: !isSelf && o.status === 'sorting',
          canReadyForPickup: isSelf && o.status === 'sorting',
          canCompleteSelf: isSelf && o.status === 'ready_for_pickup'
        }
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goBack() {
      uni.navigateBack()
    },
    copyOrderNo() {
      uni.setClipboardData({
        data: this.orderInfo.orderNo,
        success: () => uni.showToast({ title: '已复制', icon: 'success' })
      })
    },
    callCustomer() {
      if (!this.orderInfo.customer.phone) return
      uni.makePhoneCall({ phoneNumber: this.orderInfo.customer.phone })
    },
    printOrder() {
      uni.showToast({ title: '正在打印...', icon: 'loading' })
    },
    async confirmOrder() {
      try {
        // 商家分拣完毕，订单进入 sorting（待配送/待通知自提）状态
        await updateOrderStatus(this.orderInfo.orderNo, 'sorting')
        uni.showToast({ title: '已确认分拣', icon: 'success' })
        this.loadDetail()
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      }
    },
    async readyForPickup() {
      try {
        // 自提单：分拣完毕通知用户来取
        await updateOrderStatus(this.orderInfo.orderNo, 'ready_for_pickup')
        uni.showToast({ title: '已通知用户自提', icon: 'success' })
        this.loadDetail()
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      }
    },
    async merchantCompleteSelf() {
      try {
        // 自提单：商家侧确认用户已取货
        await updateOrderStatus(this.orderInfo.orderNo, 'completed')
        uni.showToast({ title: '已完成自提', icon: 'success' })
        this.loadDetail()
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      }
    },
    async startDeliver() {
      // 配送单：当前是 sorting 状态，等待骑手抢单；按钮仅展示用，不主动改 status
      uni.showToast({ title: '等待骑手接单配送', icon: 'none' })
    },
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 0 20rpx 180rpx;
}

/* 返回栏 */
.back-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
}
.back-arrow {
  font-size: 48rpx;
  color: #000000;
  font-weight: 300;
  padding: 0 8rpx;
}
.page-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
}

/* 状态头部 */
.status-header {
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  margin-bottom: 16rpx;
}
.status-text {
  font-size: 36rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 8rpx;
}
.status-hint {
  font-size: 26rpx;
  color: #666666;
}

/* 订单号栏 */
.order-no-bar {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.order-no-bar .label {
  font-size: 26rpx;
  color: #999999;
  margin-right: 16rpx;
}
.order-no-bar .value {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}
.copy-btn {
  padding: 8rpx 20rpx;
  border: 1rpx solid #E8E8E8;
  border-radius: 8rpx;
}
.copy-btn text {
  font-size: 24rpx;
  color: #666666;
}

/* 进度条 */
.progress-section {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.progress-bar {
  display: flex;
  justify-content: space-between;
  position: relative;
}
.progress-bar::before {
  content: '';
  position: absolute;
  top: 24rpx;
  left: 40rpx;
  right: 40rpx;
  height: 4rpx;
  background: #E8E8E8;
}
.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}
.step-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.step-dot text {
  font-size: 24rpx;
  color: #999999;
}
.progress-step.completed .step-dot {
  background: #4CAF50;
}
.progress-step.completed .step-dot text {
  color: #FFFFFF;
}
.progress-step.active .step-dot {
  background: #4CAF50;
  border: 4rpx solid #E8F5E9;
}
.progress-step.active .step-dot text {
  color: #FFFFFF;
}
.step-label {
  font-size: 24rpx;
  color: #666666;
}
.progress-step.active .step-label {
  color: #4CAF50;
  font-weight: 600;
}
.step-time {
  font-size: 20rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 通用卡片 */
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
}
.delivery-type-badge {
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}
.delivery-type-badge text {
  font-size: 24rpx;
  font-weight: 500;
}
.delivery-type-badge.delivery {
  background: #E3F2FD;
}
.delivery-type-badge.delivery text {
  color: #1976D2;
}
.delivery-type-badge.self {
  background: #FFF3E0;
}
.delivery-type-badge.self text {
  color: #FF6B00;
}

/* 客户信息 */
.info-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  font-size: 26rpx;
  color: #999999;
  width: 140rpx;
}
.info-value {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}
.info-value.address {
  line-height: 1.5;
}
.call-btn {
  padding: 8rpx 20rpx;
  background: #4CAF50;
  border-radius: 8rpx;
}
.call-btn text {
  font-size: 24rpx;
  color: #FFFFFF;
}
.pickup-code {
  font-size: 36rpx;
  font-weight: 700;
  color: #FF6B00;
  letter-spacing: 8rpx;
}

/* 商品清单 */
.goods-count {
  font-size: 24rpx;
  color: #999999;
}
.goods-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}
.goods-item:last-child {
  border-bottom: none;
}
.goods-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}
.goods-img image {
  width: 100%;
  height: 100%;
}
.img-placeholder {
  font-size: 48rpx;
}
.goods-info {
  flex: 1;
}
.goods-name {
  font-size: 28rpx;
  color: #333333;
  display: block;
  margin-bottom: 4rpx;
}
.goods-spec {
  font-size: 24rpx;
  color: #999999;
}
.goods-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.goods-price .price {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}
.goods-price .qty {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}

/* 费用明细 */
.fee-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}
.fee-label {
  font-size: 28rpx;
  color: #666666;
}
.fee-value {
  font-size: 28rpx;
  color: #333333;
}
.fee-value.discount {
  color: #4CAF50;
}
.fee-row.total {
  border-top: 1rpx solid #F5F5F5;
  margin-top: 12rpx;
  padding-top: 20rpx;
}
.fee-row.total .fee-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
}
.fee-row.total .fee-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #FF6B00;
}

/* 订单时间 */
.time-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}
.time-label {
  font-size: 26rpx;
  color: #999999;
}
.time-value {
  font-size: 26rpx;
  color: #333333;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 32rpx;
  border-radius: 40rpx;
  min-width: 160rpx;
}
.action-btn.secondary {
  background: #F5F5F5;
}
.action-btn.secondary .btn-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}
.action-btn.primary {
  background: #4CAF50;
}
.action-btn .btn-text {
  font-size: 28rpx;
  font-weight: 500;
}
.action-btn.secondary .btn-text {
  color: #666666;
}
.action-btn.primary .btn-text {
  color: #FFFFFF;
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>