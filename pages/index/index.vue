<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-title">数据看板</text>
    </view>

    <!-- 统计卡片 - 2x2布局 -->
    <view class="stats-container">
      <view class="stats-row">
        <view class="stat-card" @tap="goOrders('pending')">
          <view class="stat-value" style="color: #FF6B6B;">{{ stats.pendingOrders }}</view>
          <view class="stat-label">待处理订单</view>
        </view>
        <view class="stat-card" @tap="goOrders('all')">
          <view class="stat-value" style="color: #4F9A42;">{{ stats.todayOrders }}</view>
          <view class="stat-label">今日订单</view>
        </view>
      </view>
      <view class="stats-row">
        <view class="stat-card">
          <view class="stat-value" style="color: #FFB84D;">¥{{ stats.todaySales }}</view>
          <view class="stat-label">今日销售额</view>
        </view>
        <view class="stat-card" @tap="goProducts">
          <view class="stat-value" style="color: #4A90D9;">{{ stats.productCount }}</view>
          <view class="stat-label">商品数</view>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-actions">
      <view class="section-title">快捷操作</view>
      <view class="action-grid">
        <view class="action-item" @tap="goOrders()">
          <view class="action-icon" style="background: #E8F5E9;">
            <text class="iconfont icon-dingdan" style="color: #4F9A42;"></text>
          </view>
          <text class="action-text">订单管理</text>
        </view>
        <view class="action-item" @tap="goProducts()">
          <view class="action-icon" style="background: #FFF3E0;">
            <text class="iconfont icon-fenlei" style="color: #FF9800;"></text>
          </view>
          <text class="action-text">商品管理</text>
        </view>
        <view class="action-item" @tap="goRiders()">
          <view class="action-icon" style="background: #E3F2FD;">
            <text class="iconfont icon-peisong" style="color: #2196F3;"></text>
          </view>
          <text class="action-text">骑手管理</text>
        </view>
        <view class="action-item" @tap="goCommunities()">
          <view class="action-icon" style="background: #FCE4EC;">
            <text class="iconfont icon-dingwei" style="color: #E91E63;"></text>
          </view>
          <text class="action-text">小区管理</text>
        </view>
        <view class="action-item" @tap="goCerts()">
          <view class="action-icon" style="background: #F3E5F5;">
            <text class="iconfont icon-kefuzhongxin" style="color: #9C27B0;"></text>
          </view>
          <text class="action-text">认证审核</text>
        </view>
        <view class="action-item" @tap="goFlashSale()">
          <view class="action-icon" style="background: #FFF8E1;">
            <text class="iconfont icon-youhuiquan" style="color: #FFC107;"></text>
          </view>
          <text class="action-text">特惠活动</text>
        </view>
      </view>
    </view>

    <!-- 最新订单 -->
    <view class="recent-orders">
      <view class="section-header">
        <text class="section-title">最新订单</text>
        <text class="more-btn" @tap="goOrders()">查看全部 ›</text>
      </view>
      <view class="order-list">
        <view class="order-item" v-for="order in recentOrders" :key="order._id || order.id" @tap="showOrderDetail(order)">
          <view class="order-header">
            <text class="order-id">订单号: {{ order.orderNo || order.id }}</text>
            <text class="order-status" :class="getStatusClass(order)">{{ getStatusText(order) }}</text>
          </view>
          <view class="order-info">
            <text>{{ order.items?.length || 0 }}件商品</text>
            <text class="order-price">¥{{ order.totalAmount || order.total || 0 }}</text>
          </view>
          <view class="order-time">{{ formatTime(order.createdAt) }}</view>
        </view>
        <view class="empty-hint" v-if="recentOrders.length === 0 && !loading">
          <text>暂无订单</text>
        </view>
      </view>
    </view>

    <view class="loading-tip" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
import { getOrders, getProducts } from '@/api'

export default {
  data() {
    return {
      stats: {
        pendingOrders: 0,
        todayOrders: 0,
        todaySales: 0,
        productCount: 0
      },
      recentOrders: [],
      loading: false
    }
  },
  onLoad() {
    this.loadData()
  },
  onShow() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        // 加载订单
        const ordersRes = await getOrders({})
        const orders = ordersRes.data || []

        // 今日开始时间
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        // 计算统计
        const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart)
        const pendingOrders = orders.filter(o => ['pending', '待支付', 'accepted'].includes(o.status) || ['pending', '待支付', 'accepted'].includes(o.deliveryStatus))

        this.stats.todayOrders = todayOrders.length
        this.stats.todaySales = todayOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0).toFixed(2)
        this.stats.pendingOrders = pendingOrders.length

        // 最新5条订单
        this.recentOrders = orders.slice(0, 5)
      } catch (e) {
        console.error('加载数据失败', e)
      }

      try {
        // 加载商品数
        const productsRes = await getProducts({})
        this.stats.productCount = productsRes.data?.length || 0
      } catch (e) {
        console.error('加载商品失败', e)
      }

      this.loading = false
    },
    goOrders(filter) {
      uni.switchTab({ url: '/pages/orders/index' })
    },
    goProducts() {
      uni.switchTab({ url: '/pages/products/index' })
    },
    goRiders() {
      uni.navigateTo({ url: '/pages/riders/index' })
    },
    goCommunities() {
      uni.navigateTo({ url: '/pages/communities/index' })
    },
    goCerts() {
      uni.switchTab({ url: '/pages/certs/index' })
    },
    goFlashSale() {
      uni.navigateTo({ url: '/pages/flash-sale/index' })
    },
    showOrderDetail(order) {
      // 暂不实现
    },
    getStatusClass(order) {
      const status = order.deliveryStatus || order.status
      if (['pending', '待支付'].includes(status)) return 'status-pending'
      if (['accepted', '已接单'].includes(status)) return 'status-accepted'
      if (['delivering', '配送中'].includes(status)) return 'status-delivering'
      if (['completed', '已完成'].includes(status)) return 'status-completed'
      if (['cancelled', '已取消'].includes(status)) return 'status-cancelled'
      if (['refunded', '已退款'].includes(status)) return 'status-refunded'
      return ''
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
    formatTime(isoString) {
      if (!isoString) return ''
      const date = new Date(isoString)
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #F5F1EB;
  padding-bottom: 20rpx;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background-color: #FFFFFF;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

/* 统计卡片 - 左右两列布局 */
.stats-container {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.stats-row {
  display: flex;
  gap: 20rpx;
}
.stat-card {
  flex: 1;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.stat-value {
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 26rpx;
  color: #999;
  margin-top: 12rpx;
}

/* 快捷操作 */
.quick-actions {
  padding: 0 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.more-btn {
  font-size: 26rpx;
  color: #4F9A42;
}
.action-grid {
  display: flex;
  flex-wrap: wrap;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.action-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}
.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
}
.action-icon .iconfont {
  font-size: 40rpx;
}
.action-text {
  font-size: 24rpx;
  color: #333;
}

/* 最新订单 */
.recent-orders {
  padding: 20rpx;
  margin-top: 20rpx;
}
.order-list {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}
.order-item {
  padding: 24rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.order-item:last-child {
  border-bottom: none;
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.order-id {
  font-size: 26rpx;
  color: #333;
}
.order-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.status-pending { background: #FFF3E0; color: #FF9800; }
.status-accepted { background: #E3F2FD; color: #2196F3; }
.status-delivering { background: #E8F5E9; color: #4F9A42; }
.status-completed { background: #F5F5F5; color: #999; }
.status-cancelled { background: #FFEBEE; color: #F44336; }
.status-refunded { background: #FFF8E1; color: #FFB300; }

.order-info {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #666;
}
.order-price {
  font-weight: 600;
  color: #FF3333;
}
.order-time {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
.empty-hint {
  padding: 60rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.loading-tip {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 24rpx;
}
</style>