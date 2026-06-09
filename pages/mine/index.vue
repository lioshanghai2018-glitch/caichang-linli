<template>
<view class="page">
  <!-- 顶部渐变区域 -->
  <view class="header-section">
    <view class="shop-info">
      <view class="shop-avatar">
        <text class="avatar-icon">🏪</text>
      </view>
      <view class="shop-detail">
        <text class="shop-name">{{shopInfo.name}}</text>
        <text class="shop-status">{{shopInfo.status}}</text>
      </view>
    </view>
    <text class="edit-btn" @tap="editShop">编辑店铺 ›</text>
  </view>

  <!-- 核心数据3栏 -->
  <view class="stats-row">
    <view class="stat-item" v-for="(item, idx) in statsData" :key="idx">
      <text class="stat-value">{{item.value}}</text>
      <text class="stat-label">{{item.label}}</text>
    </view>
  </view>

  <!-- 今日待办 -->
  <view class="card todo-card">
    <view class="card-header">
      <text class="card-title">今日待办</text>
      <text class="more-btn" @tap="goTodoList">更多 ›</text>
    </view>
    <view class="todo-list">
      <view class="todo-item" v-for="(item, idx) in todoList" :key="idx" @tap="goTodo(item.link)">
        <view class="todo-icon" :style="{background: item.iconBg}">
          <text>{{item.icon}}</text>
        </view>
        <view class="todo-info">
          <text class="todo-title">{{item.title}}</text>
          <text class="todo-count" v-if="item.count > 0">{{item.count}}条待处理</text>
        </view>
        <text class="todo-arrow">›</text>
      </view>
    </view>
  </view>

  <!-- 功能菜单 -->
  <view class="card menu-card">
    <view class="menu-section" v-for="(section, si) in menuSections" :key="si">
      <text class="menu-title">{{section.title}}</text>
      <view class="menu-grid">
        <view class="menu-item" v-for="(item, mi) in section.items" :key="mi" @tap="goPage(item.page)">
          <view class="menu-icon-wrap" :style="{background: item.iconBg}">
            <text class="menu-icon">{{item.icon}}</text>
          </view>
          <text class="menu-name">{{item.name}}</text>
          <view class="menu-badge" v-if="item.badge > 0">
            <text>{{item.badge > 99 ? '99+' : item.badge}}</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 版本信息 -->
  <view class="version-info">
    <text class="version-text">大研菜场 商家端 v1.0.0</text>
  </view>

  <view class="bottom-placeholder"></view>

  <merchant-tabbar current="mine" />
</view>
</template>

<script>
import merchantTabbar from '@/components/merchant-tabbar/merchant-tabbar.vue'
import { getDashboard } from '@/utils/api.js'
import { logout as doLogout } from '@/utils/auth.js'

export default {
  components: { merchantTabbar },
  data() {
    return {
      shopInfo: {
        name: '我的店铺',
        status: '加载中…'
      },
      statsData: [
        { label: '今日订单', value: '0单' },
        { label: '今日销售额', value: '¥0' },
        { label: '待处理', value: '0单' }
      ],
      todoList: [
        { title: '待分拣订单', count: 0, icon: '📦', iconBg: '#FFF3E0', link: '/pages/order/list?status=pending_sorting' },
        { title: '待回复消息', count: 0, icon: '💬', iconBg: '#E8F5E9', link: '/pages/service/list' },
        { title: '待审核认证', count: 0, icon: '🛡', iconBg: '#E3F2FD', link: '/pages/audit/index' }
      ],
      menuSections: [
        {
          title: '运营',
          items: [
            { name: '订单管理', icon: '📋', iconBg: '#E8F5E9', page: '/pages/order/list' },
            { name: '商品管理', icon: '🥬', iconBg: '#E8F5E9', page: '/pages/product/list' },
            { name: '骑手管理', icon: '🏍', iconBg: '#E8F5E9', page: '/pages/rider/list' },
            { name: '小区管理', icon: '🏘', iconBg: '#E8F5E9', page: '/pages/community/list' }
          ]
        },
        {
          title: '营销',
          items: [
            { name: '团购特惠', icon: '🎁', iconBg: '#FFF3E0', page: '/pages/groupbuy/list' },
            { name: '数据报表', icon: '📊', iconBg: '#E8F5E9', page: '/pages/report/index' }
          ]
        },
        {
          title: '客服',
          items: [
            { name: '客服消息', icon: '💬', iconBg: '#E3F2FD', page: '/pages/service/list', badge: 0 },
            { name: '审核中心', icon: '🛡', iconBg: '#E8F5E9', page: '/pages/audit/index' }
          ]
        },
        {
          title: '设置',
          items: [
            { name: '店铺设置', icon: '⚙️', iconBg: '#F5F5F5', page: '' },
            { name: '账号设置', icon: '👤', iconBg: '#F5F5F5', page: '' },
            { name: '退出登录', icon: '🚪', iconBg: '#FFEBEE', page: 'logout' }
          ]
        }
      ]
    }
  },
  onShow() {
    this.fetchStats()
    this.startPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    startPolling() {
      this.stopPolling()
      this._pollTimer = setInterval(() => this.fetchStats(), 10000)
    },
    stopPolling() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer)
        this._pollTimer = null
      }
    },
    async fetchStats() {
      try {
        const res = await getDashboard('today')
        const d = res.data || {}
        this.statsData = [
          { label: '今日订单', value: `${d.todayOrders || 0}单` },
          { label: '今日销售额', value: `¥${d.todaySales != null ? Number(d.todaySales).toFixed(0) : 0}` },
          { label: '待处理', value: `${d.pendingOrders || 0}单` }
        ]
        this.todoList[0].count = d.pendingOrders || 0
        this.shopInfo.status = d.todayOrders > 0 ? '营业中' : '暂无订单'
      } catch (e) {}
    },
    editShop() {
      uni.showToast({ title: '编辑店铺', icon: 'none' })
    },
    goTodoList() {
      uni.reLaunch({ url: '/pages/order/list' })
    },
    goTodo(link) {
      if (!link) return
      uni.navigateTo({ url: link })
    },
    goPage(page) {
      if (page === 'logout') {
        uni.showModal({
          title: '确认退出',
          content: '确定要退出登录吗？',
          success: (res) => {
            if (res.confirm) {
              doLogout()
              uni.showToast({ title: '已退出登录', icon: 'success' })
              setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 600)
            }
          }
        })
        return
      }
      if (!page) return
      uni.navigateTo({ url: page })
    }
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 0 20rpx 120rpx;
}

/* 顶部渐变区域 */
.header-section {
  background: linear-gradient(135deg, #4CAF50 0%, #2D5A27 100%);
  border-radius: 0 0 32rpx 32rpx;
  padding: 32rpx 24rpx 48rpx;
  margin-bottom: -24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.shop-info {
  display: flex;
  align-items: center;
}
.shop-avatar {
  width: 100rpx;
  height: 100rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}
.avatar-icon {
  font-size: 50rpx;
}
.shop-detail {
  display: flex;
  flex-direction: column;
}
.shop-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 8rpx;
}
.shop-status {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
}
.edit-btn {
  font-size: 26rpx;
  color: rgba(255,255,255,0.9);
}

/* 核心数据3栏 */
.stats-row {
  display: flex;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 32rpx 0;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1rpx solid #F5F5F5;
}
.stat-item:last-child {
  border-right: none;
}
.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #4CAF50;
  margin-bottom: 8rpx;
}
.stat-label {
  font-size: 24rpx;
  color: #999999;
}

/* 通用卡片 */
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
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
.more-btn {
  font-size: 26rpx;
  color: #999999;
}

/* 今日待办 */
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.todo-item {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
}
.todo-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}
.todo-icon text {
  font-size: 32rpx;
}
.todo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.todo-title {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}
.todo-count {
  font-size: 24rpx;
  color: #FF6B00;
  margin-top: 4rpx;
}
.todo-arrow {
  font-size: 32rpx;
  color: #CCCCCC;
}

/* 功能菜单 */
.menu-section {
  margin-bottom: 24rpx;
}
.menu-section:last-child {
  margin-bottom: 0;
}
.menu-title {
  font-size: 26rpx;
  color: #999999;
  margin-bottom: 16rpx;
  display: block;
}
.menu-grid {
  display: flex;
  flex-wrap: wrap;
}
.menu-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
  position: relative;
}
.menu-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.menu-icon {
  font-size: 40rpx;
}
.menu-name {
  font-size: 24rpx;
  color: #333333;
}
.menu-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #FF0000;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-badge text {
  font-size: 20rpx;
  color: #FFFFFF;
}

/* 版本信息 */
.version-info {
  text-align: center;
  padding: 32rpx 0;
}
.version-text {
  font-size: 24rpx;
  color: #CCCCCC;
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>