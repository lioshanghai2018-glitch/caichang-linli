<template>
<view class="page">
  <!-- 返回按钮 + 添加 -->
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">骑手管理</text>
    <view class="add-rider-btn" @tap="showAddModal">
      <text class="add-icon">+</text>
      <text>添加骑手</text>
    </view>
  </view>

  <!-- 状态总览4卡片（单行极简） -->
  <view class="status-grid">
    <view class="status-cell" v-for="(item, idx) in statusData" :key="idx" :style="{background: item.bg}">
      <text class="status-label">{{item.shortLabel}}</text>
      <text class="status-value">{{item.num}}</text>
      <text class="status-unit">{{item.unit}}</text>
    </view>
  </view>

  <!-- 骑手列表 -->
  <view class="rider-list">
    <view class="rider-card" v-for="(rider, idx) in riderList" :key="idx">
      <view class="rider-header">
        <view class="rider-avatar">
          <text>{{rider.avatar}}</text>
        </view>
        <view class="rider-info">
          <text class="rider-name">{{rider.name}}</text>
          <text class="rider-phone">{{rider.phone}}</text>
        </view>
        <view class="rider-status" :class="{offline: rider.status !== 'online'}">
          <text>{{rider.statusText}}</text>
        </view>
      </view>
      <view class="rider-stats">
        <view class="stat-item">
          <text class="stat-value">{{rider.todayOrders}}</text>
          <text class="stat-label">今日配送</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{rider.totalOrders}}</text>
          <text class="stat-label">累计配送</text>
        </view>
        <view class="stat-item">
          <text class="stat-value rating">{{rider.rating}}★</text>
          <text class="stat-label">好评率</text>
        </view>
      </view>
      <view class="rider-actions">
        <view class="action-btn" @tap="assignOrder(rider.id)">
          <text>分配订单</text>
        </view>
        <view class="action-btn" @tap="callRider(rider.phone)">
          <text>拨打电话</text>
        </view>
        <view class="action-btn danger" @tap="confirmDelete(rider)">
          <text>删除</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 添加骑手弹窗 -->
  <view class="modal" v-if="showAdd" @tap="showAdd = false">
    <view class="modal-content" @tap.stop>
      <text class="modal-title">添加骑手</text>
      <input class="modal-input" v-model="form.name" placeholder="姓名" />
      <input class="modal-input" v-model="form.phone" placeholder="手机号" type="number" maxlength="11" />
      <input class="modal-input" v-model="form.password" placeholder="登录密码（≥6位）" password />
      <view class="modal-btns">
        <view class="modal-btn cancel" @tap="showAdd = false"><text>取消</text></view>
        <view class="modal-btn confirm" @tap="submitAdd"><text>确定</text></view>
      </view>
    </view>
  </view>

  <!-- 配送数据柱状图 -->
  <view class="card chart-card">
    <text class="card-title">本周配送趋势</text>
    <view class="chart-container">
      <view class="chart-bars">
        <view class="bar-item" v-for="(day, idx) in weekData" :key="idx">
          <view class="bar" :style="{height: day.percent + '%'}"></view>
          <text class="bar-value">{{day.count}}</text>
          <text class="bar-label">{{day.label}}</text>
        </view>
      </view>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { getRiders, getOrders, addRider, deleteRider } from '@/utils/api.js'

// 配送中（骑手已接/已取货/配送中）
const DELIVERING_STATUS = ['delivering', 'picked_up', 'accepted', '配送中']
// 待配送（已付款/分拣中/已接单 等有骑手空缺的状态）
const WAITING_STATUS = ['paid', 'pending_sorting', 'sorting', '已接单', '已付款', '分拣中']
// 已完成
const COMPLETED_STATUS = ['completed', '已完成']

const RIDER_STATUS_TEXT = { online: '在线', idle: '空闲', offline: '离线' }

function isToday(ts) {
  if (!ts) return false
  const d = new Date(ts)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

export default {
  data() {
    return {
      statusData: [
        { shortLabel: '在线', label: '在线骑手', num: 0, unit: '人', bg: '#E8F5E9' },
        { shortLabel: '配送中', label: '配送中', num: 0, unit: '单', bg: '#FFF3E0' },
        { shortLabel: '待配', label: '待配送', num: 0, unit: '单', bg: '#E3F2FD' },
        { shortLabel: '完成', label: '今日完成', num: 0, unit: '单', bg: '#F0FFF0' }
      ],
      riderList: [],
      weekData: [],
      loading: true,
      showAdd: false,
      form: { name: '', phone: '', password: '' }
    }
  },
  onShow() {
    this.loadAll()
  },
  methods: {
    async loadAll() {
      this.loading = true
      try {
        const [ridersRes, ordersRes] = await Promise.all([
          getRiders().catch(() => ({ data: [] })),
          getOrders({ page: 1, pageSize: 200 }).catch(() => ({ data: [] }))
        ])
        const riders = Array.isArray(ridersRes.data) ? ridersRes.data : []
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : []

        // 4 卡片统计
        const onlineRiders = riders.filter(r => r.riderStatus === 'online' || r.riderStatus === 'idle').length
        const delivering = orders.filter(o => DELIVERING_STATUS.includes(o.status)).length
        const waiting = orders.filter(o => WAITING_STATUS.includes(o.status) && !o.riderId).length
        const completedToday = orders.filter(o => COMPLETED_STATUS.includes(o.status) && isToday(o.updatedAt || o.createdAt)).length
        this.statusData = [
          { shortLabel: '在线', label: '在线骑手', num: onlineRiders, unit: '人', bg: '#E8F5E9' },
          { shortLabel: '配送中', label: '配送中', num: delivering, unit: '单', bg: '#FFF3E0' },
          { shortLabel: '待配', label: '待配送', num: waiting, unit: '单', bg: '#E3F2FD' },
          { shortLabel: '完成', label: '今日完成', num: completedToday, unit: '单', bg: '#F0FFF0' }
        ]

        // 骑手列表：每个骑手聚合今日/累计配送数
        this.riderList = riders.map(r => {
          const myOrders = orders.filter(o => o.riderId === r._id)
          const today = myOrders.filter(o => isToday(o.updatedAt || o.createdAt)).length
          return {
            id: r._id,
            name: r.name || '骑手',
            phone: r.phone || '',
            avatar: r.avatar || '👨',
            status: r.riderStatus === 'offline' ? 'offline' : 'online',
            statusText: RIDER_STATUS_TEXT[r.riderStatus] || '离线',
            todayOrders: today,
            totalOrders: r.deliveryCount != null ? r.deliveryCount : myOrders.length,
            rating: r.rating != null ? String(r.rating) : '5.0'
          }
        })

        // 简易本周数据：从 orders 聚合最近 7 天 completed
        this.weekData = this.buildWeekData(orders)
      } catch (e) {
        console.error('loadAll failed:', e)
      } finally {
        this.loading = false
      }
    },
    buildWeekData(orders) {
      const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '今天']
      // 0=周一 ... 6=周日；映射到 Date
      const dayOfWeek = new Date().getDay() // 0=Sun..6=Sat
      const todayIdx = (dayOfWeek + 6) % 7 // 转成 0=周一..6=周日
      const counts = [0, 0, 0, 0, 0, 0, 0]
      orders.forEach(o => {
        if (!COMPLETED_STATUS.includes(o.status)) return
        const d = new Date(o.updatedAt || o.createdAt)
        if (isNaN(d.getTime())) return
        const idx = (d.getDay() + 6) % 7
        counts[idx]++
      })
      const max = Math.max(...counts, 1)
      return labels.map((label, i) => ({
        label,
        count: counts[i],
        percent: Math.round((counts[i] / max) * 95) + 5
      })).map((d, i) => i === todayIdx ? { ...d, label: '今天' } : d)
    },
    goBack() {
      uni.navigateBack()
    },
    assignOrder(riderId) {
      uni.showToast({ title: '请选择订单分配', icon: 'none' })
    },
    callRider(phone) {
      if (!phone) return uni.showToast({ title: '骑手未留电话', icon: 'none' })
      uni.makePhoneCall({ phoneNumber: phone })
    },
    showAddModal() {
      this.form = { name: '', phone: '', password: '' }
      this.showAdd = true
    },
    async submitAdd() {
      const { name, phone, password } = this.form
      if (!name || !name.trim()) return uni.showToast({ title: '请输入姓名', icon: 'none' })
      if (!/^1\d{10}$/.test(phone)) return uni.showToast({ title: '手机号格式不对', icon: 'none' })
      if (!password || password.length < 6) return uni.showToast({ title: '密码至少 6 位', icon: 'none' })
      try {
        await addRider({
          name: name.trim(),
          phone,
          password,
          merchantId: uni.getStorageSync('merchant_id') || '',
          riderStatus: 'offline'
        })
        uni.showToast({ title: '已添加', icon: 'success' })
        this.showAdd = false
        this.loadAll()
      } catch (e) {
        uni.showToast({ title: e.msg || '添加失败', icon: 'none' })
      }
    },
    confirmDelete(rider) {
      uni.showModal({
        title: '删除骑手',
        content: `确定删除「${rider.name || '该骑手'}」？此操作不可恢复`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteRider(rider.id)
            uni.showToast({ title: '已删除', icon: 'success' })
            this.loadAll()
          } catch (e) {
            uni.showToast({ title: e.msg || '删除失败', icon: 'none' })
          }
        }
      })
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
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
  text-align: center;
}

/* 状态总览4卡片（单行极简） */
.status-grid {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.status-cell {
  flex: 1;
  border-radius: 16rpx;
  padding: 20rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.status-cell .status-label {
  font-size: 22rpx;
  color: #666666;
  margin-bottom: 8rpx;
}
.status-cell .status-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #000000;
  line-height: 1.1;
}
.status-cell .status-unit {
  font-size: 20rpx;
  color: #999999;
  margin-top: 2rpx;
}

/* 骑手列表 */
.rider-list {
  margin-bottom: 24rpx;
}
.rider-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.rider-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.rider-avatar {
  width: 80rpx;
  height: 80rpx;
  background: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}
.rider-avatar text {
  font-size: 40rpx;
}
.rider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.rider-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 4rpx;
}
.rider-phone {
  font-size: 24rpx;
  color: #999999;
}
.rider-status {
  padding: 8rpx 20rpx;
  background: #E8F5E9;
  border-radius: 20rpx;
}
.rider-status.offline {
  background: #F5F5F5;
}
.rider-status text {
  font-size: 24rpx;
  color: #4CAF50;
}
.rider-status.offline text {
  color: #999999;
}
.rider-stats {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 0;
  border-top: 1rpx solid #F5F5F5;
  border-bottom: 1rpx solid #F5F5F5;
  margin-bottom: 16rpx;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #000000;
  margin-bottom: 4rpx;
}
.stat-value.rating {
  color: #FF6B00;
}
.stat-label {
  font-size: 24rpx;
  color: #999999;
}
.rider-actions {
  display: flex;
  gap: 16rpx;
}
.action-btn {
  flex: 1;
  padding: 16rpx 0;
  background: #F5F5F5;
  border-radius: 12rpx;
  text-align: center;
}
.action-btn text {
  font-size: 26rpx;
  color: #666666;
}
.action-btn.danger {
  background: #FFF1F0;
}
.action-btn.danger text {
  color: #FF4D4F;
}

/* 顶部添加按钮 */
.add-rider-btn {
  display: flex;
  align-items: center;
  background: #4CAF50;
  color: #FFFFFF;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
}
.add-rider-btn .add-icon {
  font-size: 32rpx;
  font-weight: 600;
  margin-right: 6rpx;
  line-height: 1;
}
.add-rider-btn text {
  font-size: 24rpx;
  color: #FFFFFF;
}

/* 弹窗 */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-content {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 40rpx;
  width: 600rpx;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  display: block;
  margin-bottom: 30rpx;
  color: #333333;
}
.modal-input {
  height: 80rpx;
  border: 2rpx solid #EEEEEE;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}
.modal-btns {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}
.modal-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 40rpx;
  font-size: 28rpx;
}
.modal-btn.cancel {
  background: #F5F5F5;
  color: #666666;
}
.modal-btn.confirm {
  background: #4CAF50;
  color: #FFFFFF;
}
.modal-btn text {
  font-size: 28rpx;
}

/* 通用卡片 */
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 20rpx;
  display: block;
}

/* 柱状图 */
.chart-container {
  height: 240rpx;
}
.chart-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 200rpx;
  padding-top: 40rpx;
}
.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.bar {
  width: 40rpx;
  background: linear-gradient(180deg, #4CAF50 0%, #81C784 100%);
  border-radius: 8rpx 8rpx 0 0;
  min-height: 20rpx;
}
.bar-value {
  font-size: 20rpx;
  color: #333333;
  margin: 8rpx 0;
}
.bar-label {
  font-size: 22rpx;
  color: #999999;
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>