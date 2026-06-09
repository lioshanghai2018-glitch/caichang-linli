<template>
<view class="page">
  <!-- 顶部门店选择区 -->
  <view class="header">
    <view class="shop-selector">
      <text class="shop-name">和业柏华店</text>
      <text class="arrow-down">▼</text>
    </view>
    <view class="notification" @tap="goMessages">
      <text class="bell-icon">🔔</text>
      <view class="badge" v-if="messageCount>0"><text>{{messageCount}}</text></view>
    </view>
  </view>

  <!-- 时间筛选栏 -->
  <view class="time-filter">
    <view class="filter-tabs">
      <view class="filter-tab" :class="{active: timeFilter==='today'}" @tap="onFilterTap('today')">
        <text>今日</text>
      </view>
      <view class="filter-tab" :class="{active: timeFilter==='week'}" @tap="onFilterTap('week')">
        <text>本周</text>
      </view>
      <view class="filter-tab" :class="{active: timeFilter==='month'}" @tap="onFilterTap('month')">
        <text>本月</text>
      </view>
    </view>
    <view class="date-picker">
      <picker mode="date" :value="customDate || todayStr" :end="todayStr" @change="onDateChange">
        <text class="date-text">{{ customDate || todayStr }}</text>
      </picker>
    </view>
  </view>

  <!-- 核心数据4卡片 -->
  <view class="dashboard-grid">
    <view class="dash-row" v-for="(row, ri) in dashboardRows" :key="ri">
      <view class="dash-card" v-for="(item, ci) in row" :key="ci">
        <view class="dash-icon-wrap" :style="{background: item.iconBg}">
          <view class="iconfont dash-icon" :class="item.iconClass"></view>
        </view>
        <view class="dash-content">
          <text class="dash-title">{{item.title}}</text>
          <text class="dash-value">{{item.value}}</text>
          <view class="dash-trend-row">
            <text class="dash-trend" :class="item.trendUp?'up':'down'">{{item.trendUp?'↑':'↓'}} {{item.trend}}</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 订单状态概览 -->
  <view class="card order-status-section">
    <text class="section-title">订单状态概览</text>
    <view class="status-row">
      <view class="status-item" v-for="(item, idx) in orderStatusList" :key="idx" @tap="goOrderByStatus(item.key)">
        <view class="status-wrap">
          <view class="status-circle" :style="{borderColor: item.color}">
            <view class="iconfont status-icon" :class="item.iconClass" :style="{color: item.color}"></view>
          </view>
          <view class="status-badge" v-if="item.count > 0" :style="{background: item.color}">
            <text>{{item.count}}</text>
          </view>
        </view>
        <text class="status-label">{{item.label}}</text>
        <view class="status-line" v-if="idx < orderStatusList.length - 1" :style="{background: idx < 2 ? '#FF6B00' : '#4CAF50'}"></view>
      </view>
    </view>
  </view>

  <!-- 9宫格功能入口 -->
  <view class="card function-grid">
    <view class="func-item" v-for="(item, idx) in functionEntries" :key="idx" @tap="goPage(item.page)">
      <view class="func-icon-wrap">
        <view class="iconfont func-icon" :class="item.iconClass"></view>
        <view class="func-badge" v-if="item.badge"><text>{{item.badge}}</text></view>
      </view>
      <text class="func-name">{{item.name}}</text>
    </view>
  </view>

  <!-- 底部占位 -->
  <view class="bottom-placeholder"></view>

  <merchant-tabbar current="index" />
</view>
</template>

<script>
import merchantTabbar from '@/components/merchant-tabbar/merchant-tabbar.vue'
import { getDashboard } from '@/utils/api.js'

export default {
  components: { merchantTabbar },
  data() {
    return {
      messageCount: 0,
      timeFilter: 'today',
      customDate: '',
      todayStr: new Date().toISOString().slice(0, 10),
      timeRangeLabel: '今日',
      dashboardData: [
        { title: '今日订单', value: '0单', trend: '加载中', trendUp: true, iconClass: 'icon-dingdan', iconBg: '#E8F5E9' },
        { title: '今日销售额', value: '¥0', trend: '加载中', trendUp: true, iconClass: 'icon-xiaoshoue', iconBg: '#E8F5E9' },
        { title: '待处理订单', value: '0单', trend: '需及时处理', trendUp: false, iconClass: 'icon-daichulidingdan', iconBg: '#FFF3E0' },
        { title: '在线商品', value: '0种', trend: '正常销售中', trendUp: true, iconClass: 'icon-shangpin', iconBg: '#E8F5E9' }
      ],
      get dashboardRows() {
        return [this.dashboardData.slice(0, 2), this.dashboardData.slice(2, 4)]
      },
      orderStatusList: [
        { label: '待付款', count: 0, color: '#FF6B00', iconClass: 'icon-daifukuan', key: 'pending_payment' },
        { label: '待分拣', count: 0, color: '#FF6B00', iconClass: 'icon-daifenjian', key: 'pending_sorting' },
        { label: '配送中', count: 0, color: '#4CAF50', iconClass: 'icon-peisong', key: 'delivering' },
        { label: '已完成', count: 0, color: '#999999', iconClass: 'icon-shangpin', key: 'completed' }
      ],
      functionEntries: [
        { name: '订单管理', iconClass: 'icon-dingdan', page: '/pages/order/list' },
        { name: '商品管理', iconClass: 'icon-shangpinguanli', page: '/pages/product/list' },
        { name: '骑手管理', iconClass: 'icon-peisong', page: '/pages/rider/list' },
        { name: '小区管理', iconClass: 'icon-xiaoquguanli', page: '/pages/community/list' },
        { name: '审核中心', iconClass: 'icon-renzheng', page: '/pages/audit/index' },
        { name: '团购特惠', iconClass: 'icon-tuangoutehui', page: '/pages/groupbuy/list' },
        { name: '客服消息', iconClass: 'icon-kefuxiaoxi', page: '/pages/service/list', badge: 0 },
        { name: '数据报表', iconClass: 'icon-shujubaobiao', page: '/pages/report/index' },
        { name: '分类管理', iconClass: 'icon-shangpinguanli', page: '/pages/category/list' }
      ]
    }
  },
  onShow() {
    this.fetchDashboard()
    this.startPolling()
  },
  onHide() {
    this.stopPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  watch: {
    timeFilter() { this.fetchDashboard() },
    customDate() { this.fetchDashboard() }
  },
  methods: {
    async fetchDashboard() {
      try {
        const res = await getDashboard(this.timeFilter, this.customDate)
        const d = res.data || {}
        this.timeRangeLabel = d.timeRange?.label || '今日'
        const orders = d.todayOrders || 0
        const sales = Number(d.totalSales || 0)
        const pending = d.pendingOrders || 0
        const online = d.onlineProducts || 0
        this.dashboardData = [
          { title: `${this.timeRangeLabel}订单`, value: `${orders}单`, trend: orders > 0 ? '营业中' : '暂无', trendUp: orders > 0, iconClass: 'icon-dingdan', iconBg: '#E8F5E9' },
          { title: `${this.timeRangeLabel}销售额`, value: `¥${sales.toFixed(2)}`, trend: sales > 0 ? '持续增长' : '暂无', trendUp: sales > 0, iconClass: 'icon-xiaoshoue', iconBg: '#E8F5E9' },
          { title: '待处理订单', value: `${pending}单`, trend: pending > 0 ? '需及时处理' : '全部已处理', trendUp: false, iconClass: 'icon-daichulidingdan', iconBg: '#FFF3E0' },
          { title: '在线商品', value: `${online}种`, trend: online > 0 ? '正常销售中' : '请上架', trendUp: online > 0, iconClass: 'icon-shangpin', iconBg: '#E8F5E9' }
        ]
        if (d.counts) {
          this.orderStatusList.forEach(item => {
            item.count = d.counts[item.key] || 0
          })
        }
      } catch (e) {
        console.error('fetchDashboard failed:', e)
      }
    },
    onFilterTap(filter) {
      this.timeFilter = filter
      this.customDate = ''
    },
    onDateChange(e) {
      this.customDate = e.detail.value
      this.timeFilter = 'custom'
    },
    goMessages() { uni.navigateTo({ url: '/pages/service/list' }) },
    goOrderByStatus(key) { uni.reLaunch({ url: `/pages/order/list?status=${key}` }) },
    goPage(page) {
      if (!page) return
      const tabPages = ['/pages/order/list', '/pages/product/list']
      if (tabPages.includes(page)) {
        uni.reLaunch({ url: page })
      } else {
        uni.navigateTo({ url: page })
      }
    },
    startPolling() {
      this.stopPolling()
      this._pollTimer = setInterval(() => {
        this.fetchDashboard()
      }, 8000)
    },
    stopPolling() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer)
        this._pollTimer = null
      }
    }
  }
}
</script>

<style>
/* 页面 */
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 0 20rpx 120rpx;
}

/* 顶部 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 4rpx;
}
.shop-selector {
  display: flex;
  align-items: center;
}
.shop-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
}
.arrow-down {
  font-size: 20rpx;
  color: #999999;
  margin-left: 8rpx;
}
.notification {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bell-icon {
  font-size: 36rpx;
}
.badge {
  position: absolute;
  top: -4rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #FF0000;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge text {
  font-size: 20rpx;
  font-weight: 500;
  color: #FFFFFF;
}

/* 时间筛选 */
.time-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.filter-tabs {
  display: flex;
  gap: 24rpx;
}
.filter-tab {
  padding: 8rpx 0;
  position: relative;
}
.filter-tab text {
  font-size: 28rpx;
  color: #666666;
}
.filter-tab.active text {
  font-size: 28rpx;
  font-weight: 600;
  color: #000000;
}
.filter-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: #4CAF50;
  border-radius: 2rpx;
}
.date-picker {
  display: flex;
  align-items: center;
}
.date-text {
  font-size: 26rpx;
  color: #666666;
}

/* 核心数据4卡片 */
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.dash-row {
  display: flex;
  gap: 16rpx;
}
.dash-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.dash-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dash-icon {
  font-size: 64rpx;
  color: #528A59;
  line-height: 1;
}
.dash-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.dash-title {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 4rpx;
}
.dash-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #000000;
  margin-bottom: 4rpx;
}
.dash-trend-row {
  display: flex;
}
.dash-trend {
  font-size: 22rpx;
  color: #4CAF50;
}
.dash-trend.down {
  color: #FF6B00;
}

/* 通用卡片 */
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 20rpx;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.view-all {
  font-size: 26rpx;
  color: #4CAF50;
}

/* 订单状态概览 */
.status-row {
  display: flex;
  align-items: flex-start;
  padding: 16rpx 0;
}
.status-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.status-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 16rpx;
}
.status-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 4rpx solid;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}
.status-icon {
  font-size: 64rpx;
  line-height: 1;
}
.status-badge {
  position: absolute;
  top: -6rpx;
  right: -16rpx;
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  z-index: 3;
}
.status-badge text {
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 500;
  line-height: 1;
}
.status-label {
  font-size: 24rpx;
  color: #666666;
}
.status-line {
  position: absolute;
  top: 40rpx;
  left: calc(50% + 40rpx);
  right: calc(-50% + 40rpx);
  height: 4rpx;
  z-index: 1;
}

/* 9宫格功能入口 */
.function-grid {
  display: flex;
  flex-wrap: wrap;
}
.func-item {
  width: 33.33%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
}
.func-icon-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #F0FFF0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.func-icon {
  font-size: 64rpx;
  color: #528A59;
  line-height: 1;
}
.func-badge {
  position: absolute;
  top: -4rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #FF0000;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.func-badge text {
  font-size: 20rpx;
  color: #FFFFFF;
}
.func-name {
  font-size: 24rpx;
  color: #333333;
}

/* 底部占位（tabBar高度） */
.bottom-placeholder {
  height: 120rpx;
}
</style>