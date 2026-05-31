<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack" v-if="showDetail">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">{{ showDetail ? '订单详情' : '订单管理' }}</text>
      <view class="right-btn" v-if="!showDetail" @tap="refresh">
        <text>刷新</text>
      </view>
    </view>

    <!-- 订单列表 -->
    <view class="order-list" v-if="!showDetail">
      <view class="filter-tabs">
        <view class="filter-item" :class="{ active: currentFilter === 'all' }" @tap="switchFilter('all')">
          <text>全部</text>
        </view>
        <view class="filter-item" :class="{ active: currentFilter === 'pending' }" @tap="switchFilter('pending')">
          <text>待支付</text>
        </view>
        <view class="filter-item" :class="{ active: currentFilter === 'accepted' }" @tap="switchFilter('accepted')">
          <text>已接单</text>
        </view>
        <view class="filter-item" :class="{ active: currentFilter === 'delivering' }" @tap="switchFilter('delivering')">
          <text>配送中</text>
        </view>
        <view class="filter-item" :class="{ active: currentFilter === 'completed' }" @tap="switchFilter('completed')">
          <text>已完成</text>
        </view>
      </view>

      <scroll-view class="scroll-list" scroll-y="true" @scrolltolower="loadMore">
        <view class="order-card" v-for="order in filteredOrders" :key="order._id || order.id" @tap="toggleDetail(order)">
          <!-- 卡片头部 -->
          <view class="card-header">
            <view class="header-left">
              <text class="order-id">#{{ getShortId(order) }}</text>
              <view class="order-status" :class="getStatusClass(order)">
                <text>{{ getStatusText(order) }}</text>
              </view>
            </view>
            <text class="expand-arrow">{{ order.expanded ? '∧' : '∨' }}</text>
          </view>

          <!-- 商品列表 -->
          <view class="product-row" v-for="(item, idx) in getOrderProducts(order)" :key="idx">
            <view class="product-info">
              <text class="product-name">{{ item.name || item.productName }}</text>
              <text class="product-qty">x{{ item.qty || item.quantity || item.count || 1 }}</text>
            </view>
            <text class="product-price">¥{{ item.price }}</text>
          </view>

          <!-- 底部总价 + 时间 -->
          <view class="card-footer">
            <text class="order-time">{{ formatTime(order.createdAt || order.createTime || order.orderTime) }}</text>
            <text class="total-text">实付 <text class="total-price">¥{{ order.totalAmount || order.total || 0 }}</text></text>
          </view>

          <!-- 展开详情 -->
          <view class="order-expand" v-if="order.expanded">
            <view class="divider"></view>
            <view class="expand-info">
              <view class="info-row" v-if="order.deliveryTime">
                <text class="info-label">预计送达</text>
                <text class="info-value">{{ order.deliveryTime }}</text>
              </view>
              <view class="info-row" v-if="order.payMethod">
                <text class="info-label">支付方式</text>
                <text class="info-value">{{ order.payMethod }}</text>
              </view>
              <view class="info-row" v-if="order.deliveryFee">
                <text class="info-label">配送费</text>
                <text class="info-value">{{ order.deliveryFee }}</text>
              </view>
              <view class="info-row" v-if="order.coupon && order.coupon !== '¥0'">
                <text class="info-label">优惠券</text>
                <text class="info-value coupon">{{ order.coupon }}</text>
              </view>
              <view class="info-row">
                <text class="info-label">订单号</text>
                <text class="info-value">{{ order.orderNo || order.id }}</text>
              </view>
              <view class="info-row">
                <text class="info-label">下单时间</text>
                <text class="info-value time">{{ formatTime(order.createdAt || order.createTime || order.orderTime) }}</text>
              </view>
              <view class="info-row" v-if="order.address">
                <text class="info-label">收货地址</text>
                <text class="info-value address">{{ order.address.phone }} {{ order.address.detail || order.address.address }}</text>
              </view>
              <view class="info-row" v-if="order.remark">
                <text class="info-label">备注</text>
                <text class="info-value">{{ order.remark }}</text>
              </view>
            </view>
            <view class="card-footer">
              <text class="total-text">实付 <text class="total-price">¥{{ order.totalAmount || order.total || 0 }}</text></text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="card-actions" v-if="showActions(order)">
            <view class="action-btn danger" @tap.stop="cancelOrder(order)" v-if="canCancel(order)">
              <text>取消订单</text>
            </view>
            <view class="action-btn primary" @tap.stop="acceptOrder(order)" v-if="canAccept(order)">
              <text>接单</text>
            </view>
            <view class="action-btn" @tap.stop="assignRider(order)" v-if="canAssignRider(order)">
              <text>分配骑手</text>
            </view>
          </view>
        </view>

        <view class="empty-hint" v-if="filteredOrders.length === 0 && !loading">
          <text>暂无订单</text>
        </view>

        <view class="load-more" v-if="hasMore">
          <text>加载更多...</text>
        </view>
      </scroll-view>
    </view>

    <!-- 订单详情 -->
    <view class="order-detail" v-if="showDetail">
      <scroll-view class="detail-scroll" scroll-y="true">
        <!-- 基本信息 -->
        <view class="detail-section">
          <view class="section-title">订单信息</view>
          <view class="info-row">
            <text class="info-label">订单号</text>
            <text class="info-value">{{ currentOrder.orderNo || currentOrder.id }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">订单状态</text>
            <text class="info-value status-text" :class="getStatusClass(currentOrder)">{{ getStatusText(currentOrder) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">下单时间</text>
            <text class="info-value">{{ formatTime(currentOrder.createdAt) }}</text>
          </view>
        </view>

        <!-- 商品信息 -->
        <view class="detail-section">
          <view class="section-title">商品信息</view>
          <view class="product-list">
            <view class="product-item" v-for="(item, idx) in getOrderProducts(currentOrder)" :key="idx">
              <text class="product-name">{{ item.name || item.productName }}</text>
              <view class="product-right">
                <text class="product-qty">x{{ item.qty || item.quantity || item.count || 1 }}</text>
                <text class="product-price">¥{{ item.price }}</text>
              </view>
            </view>
          </view>
          <view class="total-row">
            <text>合计</text>
            <text class="total-price">¥{{ currentOrder.totalAmount || currentOrder.total || 0 }}</text>
          </view>
        </view>

        <!-- 收货信息 -->
        <view class="detail-section" v-if="currentOrder.address">
          <view class="section-title">收货信息</view>
          <view class="info-row">
            <text class="info-label">收货人</text>
            <text class="info-value">{{ currentOrder.address.name || currentOrder.address.userName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ currentOrder.address.phone || currentOrder.address.userPhone }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">收货地址</text>
            <text class="info-value">{{ currentOrder.address.detail || currentOrder.address.address }}</text>
          </view>
        </view>

        <!-- 骑手信息 -->
        <view class="detail-section" v-if="currentOrder.riderName">
          <view class="section-title">骑手信息</view>
          <view class="info-row">
            <text class="info-label">骑手姓名</text>
            <text class="info-value">{{ currentOrder.riderName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">骑手电话</text>
            <text class="info-value" @tap="callRider(currentOrder.riderPhone)">{{ currentOrder.riderPhone }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 底部操作 -->
      <view class="detail-actions" v-if="showActions(currentOrder)">
        <view class="action-btn primary" @tap="acceptOrder(currentOrder)" v-if="canAccept(currentOrder)">
          <text>接单</text>
        </view>
        <view class="action-btn danger" @tap="cancelOrder(currentOrder)" v-if="canCancel(currentOrder)">
          <text>取消订单</text>
        </view>
        <view class="action-btn" @tap="assignRider(currentOrder)" v-if="canAssignRider(currentOrder)">
          <text>分配骑手</text>
        </view>
        <view class="action-btn" @tap="processRefund(currentOrder)" v-if="currentOrder.refundStatus === '申请中'">
          <text>处理退款</text>
        </view>
      </view>
    </view>

    <!-- 骑手选择弹窗 -->
    <view class="modal-mask" v-if="showRiderModal" @tap="showRiderModal = false">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text>选择骑手</text>
          <text class="close-btn" @tap="showRiderModal = false">×</text>
        </view>
        <scroll-view class="rider-list" scroll-y="true">
          <view class="rider-item" v-for="rider in riders" :key="rider._id || rider.id" @tap="selectRider(rider)">
            <text class="rider-name">{{ rider.name }}</text>
            <text class="rider-phone">{{ rider.phone }}</text>
          </view>
          <view class="empty-hint" v-if="riders.length === 0">
            <text>暂无可用骑手</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { getOrders, updateOrderStatus, getRiders, assignOrder } from '@/api'

export default {
  data() {
    return {
      orders: [],
      filteredOrders: [],
      currentFilter: 'all',
      loading: false,
      hasMore: false,
      page: 1,
      pageSize: 20,

      showDetail: false,
      currentOrder: {},

      riders: [],
      showRiderModal: false
    }
  },
  onLoad() {
    this.loadOrders()
    this.loadRiders()
  },
  methods: {
    goBack() {
      if (this.showDetail) {
        this.showDetail = false
      } else {
        uni.navigateBack()
      }
    },
    refresh() {
      this.loadOrders()
    },
    async loadOrders() {
      if (this.loading) return
      this.loading = true

      try {
        const res = await getOrders({})
        this.orders = res.data || []
        this.applyFilter()
      } catch (e) {
        console.error('加载订单失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }

      this.loading = false
    },
    loadRiders() {
      getRiders().then(res => {
        this.riders = res.data || []
      }).catch(e => {
        console.error('加载骑手失败', e)
      })
    },
    switchFilter(filter) {
      this.currentFilter = filter
      this.applyFilter()
    },
    applyFilter() {
      if (this.currentFilter === 'all') {
        this.filteredOrders = this.orders
      } else {
        this.filteredOrders = this.orders.filter(o => {
          const status = o.deliveryStatus || o.status
          const statusMap = {
            'pending': 'pending',
            '待支付': 'pending',
            'accepted': 'accepted',
            '已接单': 'accepted',
            'delivering': 'delivering',
            '配送中': 'delivering',
            'completed': 'completed',
            '已完成': 'completed',
            'cancelled': 'completed',
            '已取消': 'completed'
          }
          return statusMap[status] === this.currentFilter
        })
      }
    },
    loadMore() {
      // 暂时用分页数据
    },
    toggleDetail(order) {
      order.expanded = !order.expanded
    },
    showOrderDetail(order) {
      this.currentOrder = order
      this.showDetail = true
    },
    showActions(order) {
      const status = order.deliveryStatus || order.status
      return ['pending', '待支付', 'accepted', '已接单', 'delivering', '配送中'].includes(status)
    },
    canAccept(order) {
      const status = order.deliveryStatus || order.status
      return ['pending', '待支付'].includes(status)
    },
    canCancel(order) {
      const status = order.deliveryStatus || order.status
      return ['pending', '待支付'].includes(status)
    },
    canAssignRider(order) {
      const status = order.deliveryStatus || order.status
      return ['accepted', '已接单'].includes(status)
    },
    getStatusClass(order) {
      const status = order.deliveryStatus || order.status
      if (['pending', '待支付'].includes(status)) return 'ongoing'
      if (['accepted', '已接单', 'delivering', '配送中'].includes(status)) return 'ongoing'
      if (['completed', '已完成'].includes(status)) return 'done'
      if (['cancelled', '已取消', 'refunded', '已退款'].includes(status)) return 'cancelled'
      return 'ongoing'
    },
    getStatusText(order) {
      const status = order.deliveryStatus || order.status
      const statusMap = {
        'pending': '待支付',
        '待支付': '待支付',
        'accepted': '已接单',
        '已接单': '已接单',
        'delivering': '配送中',
        '配送中': '配送中',
        'completed': '已完成',
        '已完成': '已完成',
        'cancelled': '已取消',
        '已取消': '已取消',
        'refunded': '已退款',
        '已退款': '已退款'
      }
      return statusMap[status] || status
    },
    getShortId(order) {
      const id = order.orderNo || order.id || ''
      return id.slice(-5)
    },
    getOrderProducts(order) {
      return order.products || order.items || []
    },
    getOrderDetail(order) {
      if (!order.items || order.items.length === 0) return ''
      // 获取商品详情，第一行商品名称 + 数量
      const first = order.items[0]
      const name = first.name || first.productName || '商品'
      const qty = first.quantity || first.count || 1
      if (order.items.length === 1) {
        return `${name} x${qty}`
      }
      return `${name} x${qty} 等${order.items.length}件`
    },
    formatTime(isoString) {
      if (!isoString) return ''
      const date = new Date(isoString)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },

    async acceptOrder(order) {
      const id = order._id || order.id
      try {
        await updateOrderStatus(id, 'accepted')
        order.deliveryStatus = 'accepted'
        uni.showToast({ title: '已接单', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    async cancelOrder(order) {
      uni.showModal({
        title: '确认取消',
        content: '确定要取消该订单吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await updateOrderStatus(order._id || order.id, 'cancelled')
              order.deliveryStatus = 'cancelled'
              uni.showToast({ title: '已取消', icon: 'success' })
              this.showDetail = false
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    assignRider(order) {
      this.currentOrder = order
      this.showRiderModal = true
    },
    async selectRider(rider) {
      const orderId = this.currentOrder._id || this.currentOrder.id
      try {
        await assignOrder(orderId, rider._id || rider.id)
        this.currentOrder.riderName = rider.name
        this.currentOrder.riderPhone = rider.phone
        this.showRiderModal = false
        uni.showToast({ title: '已分配骑手', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '分配失败', icon: 'none' })
      }
    },
    callRider(phone) {
      if (phone) {
        uni.makePhoneCall({ phoneNumber: phone })
      }
    },
    processRefund(order) {
      uni.showModal({
        title: '处理退款',
        content: `订单金额: ¥${order.totalAmount || order.total || 0}`,
        editable: true,
        placeholderText: '请输入退款金额',
        success: async (res) => {
          if (res.confirm) {
            // 处理退款逻辑
            uni.showToast({ title: '退款处理中', icon: 'success' })
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
.right-btn {
  padding: 8rpx 16rpx;
}
.right-btn text {
  font-size: 28rpx;
  color: #4F9A42;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  background-color: #FFFFFF;
  padding: 16rpx 0;
  position: fixed;
  top: 88rpx;
  left: 0;
  right: 0;
  z-index: 99;
}
.filter-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  position: relative;
}
.filter-item text {
  font-size: 28rpx;
  color: #666;
}
.filter-item.active text {
  color: #4F9A42;
  font-weight: 600;
}
.filter-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #4F9A42;
  border-radius: 2rpx;
}

/* 订单卡片 */
.order-card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  box-sizing: border-box;
  overflow: hidden;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left {
  display: flex;
  align-items: center;
}
.order-id {
  font-size: 32rpx;
  font-weight: 700;
  color: #333333;
}
.order-status {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  margin-left: 16rpx;
}
.order-status.ongoing {
  background-color: #4F9A42;
}
.order-status.ongoing text {
  font-size: 24rpx;
  font-weight: 600;
  color: #FFFFFF;
}
.order-status.done {
  background-color: #E8F5E9;
}
.order-status.done text {
  font-size: 24rpx;
  font-weight: 600;
  color: #4F9A42;
}
.order-status.cancelled {
  background-color: #F5F5F5;
}
.order-status.cancelled text {
  font-size: 24rpx;
  font-weight: 600;
  color: #999;
}
.expand-arrow {
  font-size: 28rpx;
  color: #999;
}

/* 商品行 */
.product-row {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
}
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.product-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333333;
}
.product-qty {
  font-size: 20rpx;
  color: #666666;
  margin-top: 4rpx;
}
.product-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #4F9A42;
  margin-left: 16rpx;
}

/* 展开详情 */
.order-expand {
  margin-top: 16rpx;
}
.divider {
  height: 1rpx;
  background-color: #E0E0E0;
  margin: 16rpx 0;
}
.expand-info {
  padding: 4rpx 0;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}
.info-label {
  font-size: 28rpx;
  color: #666666;
  flex-shrink: 0;
}
.info-value {
  font-size: 28rpx;
  color: #333333;
  text-align: right;
  margin-left: 24rpx;
}
.info-value.address {
  max-width: 360rpx;
  text-align: right;
  word-break: break-all;
}
.info-value.coupon {
  color: #FF3333;
}
.info-value.time {
  color: #999999;
}

/* 底部总价 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.order-time {
  font-size: 22rpx;
  color: #999999;
}
.total-text {
  font-size: 28rpx;
  color: #333333;
}
.total-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #4F9A42;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F0F0F0;
}
.action-btn {
  padding: 12rpx 32rpx;
  border-radius: 34rpx;
  background-color: #F5F5F5;
}
.action-btn text {
  font-size: 26rpx;
  font-weight: 500;
  color: #666;
}
.action-btn.primary {
  background-color: #4F9A42;
}
.action-btn.primary text {
  color: #FFFFFF;
}
.action-btn.danger {
  background-color: #FFFFFF;
  border: 2rpx solid #FF5252;
}
.action-btn.danger text {
  color: #FF5252;
}

/* 订单详情 */
.detail-scroll {
  height: calc(100vh - 88rpx - 120rpx);
  padding-top: 108rpx;
}
.detail-section {
  background-color: #FFFFFF;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}
.detail-section .info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}
.detail-section .info-row:last-child {
  border-bottom: none;
}
.detail-section .info-label {
  font-size: 26rpx;
  color: #999;
}
.detail-section .info-value {
  font-size: 26rpx;
  color: #333;
}
.status-text {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.product-list {
  border-top: 1rpx solid #F0F0F0;
  padding-top: 16rpx;
}
.product-list .product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}
.total-row {
  display: flex;
  justify-content: space-between;
  padding-top: 16rpx;
  margin-top: 16rpx;
  border-top: 1rpx solid #F0F0F0;
  font-size: 28rpx;
  color: #333;
}

/* 底部操作栏 */
.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding: 20rpx;
  background-color: #FFFFFF;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}

/* 骑手选择弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.modal-content {
  width: 100%;
  background-color: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 60vh;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.modal-header text:first-child {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.close-btn {
  font-size: 48rpx;
  color: #999;
}
.rider-list {
  height: 400rpx;
  padding: 20rpx;
}
.rider-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.rider-name {
  font-size: 28rpx;
  color: #333;
}
.rider-phone {
  font-size: 26rpx;
  color: #999;
}

.empty-hint {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
.load-more {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
  font-size: 24rpx;
}
</style>