<template>
  <view class="mine-container">
    <!-- 头部信息 -->
    <view class="header">
      <view class="avatar-section">
        <view class="avatar">骑</view>
        <view class="user-info">
          <text class="user-name">{{ riderInfo?.name || '骑手' }}</text>
          <text class="user-phone">{{ riderInfo?.phone || '' }}</text>
        </view>
      </view>
    </view>

    <!-- 在线状态 -->
    <view class="card">
      <view class="card-row">
        <view class="card-left">
          <text class="card-icon">📱</text>
          <text class="card-title">在线状态</text>
        </view>
        <switch :checked="isOnline" @change="toggleOnline" color="#4CAF50" />
      </view>
      <view class="status-desc">
        <text :class="isOnline ? 'status-online' : 'status-offline'">
          {{ isOnline ? '● 在线 - 可接单' : '● 离线 - 暂停接单' }}
        </text>
      </view>
    </view>

    <!-- 今日统计 -->
    <view class="card">
      <text class="card-header">今日统计</text>
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-num">{{ todayStats.pending }}</text>
          <text class="stat-label">待取货</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ todayStats.delivering }}</text>
          <text class="stat-label">配送中</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ todayStats.completed }}</text>
          <text class="stat-label">已完成</text>
        </view>
      </view>
    </view>

    <!-- 操作菜单 -->
    <view class="card">
      <view class="menu-item" @click="showChangePassword">
        <text class="menu-icon">🔑</text>
        <text class="menu-title">修改密码</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @click="logout">
      <text>退出登录</text>
    </view>

    <!-- 修改密码弹窗 -->
    <view class="modal" v-if="showPasswordModal" @click="showPasswordModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">修改密码</text>
        <input class="modal-input" type="password" v-model="oldPassword" placeholder="请输入原密码" />
        <input class="modal-input" type="password" v-model="newPassword" placeholder="请输入新密码" />
        <input class="modal-input" type="password" v-model="confirmPassword" placeholder="请确认新密码" />
        <view class="modal-btns">
          <button class="modal-btn cancel" @click="showPasswordModal = false">取消</button>
          <button class="modal-btn confirm" @click="confirmChangePassword">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import riderApi from '../../api/rider'
import { logout as doLogout } from '../../utils/auth.js'

const riderInfo = ref(null)
const isOnline = ref(false)
const showPasswordModal = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const todayStats = ref({ pending: 0, delivering: 0, completed: 0 })

onShow(() => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  riderInfo.value = info
  isOnline.value = info.riderStatus === 'online'
  loadTodayStats()
})

const loadTodayStats = () => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) return

  // 统计今日订单（简化版，实际可调用云函数）
  riderApi.getOrders(info.riderId || info.riderInfo?._id).then(res => {
    todayStats.value.pending = res.data?.length || 0
  })

  riderApi.getDeliveringOrders(info.riderId || info.riderInfo?._id).then(res => {
    todayStats.value.delivering = res.data?.length || 0
  })

  riderApi.getCompletedOrders(info.riderId || info.riderInfo?._id).then(res => {
    todayStats.value.completed = res.data?.length || 0
  })
}

const toggleOnline = async (e) => {
  const info = uni.getStorageSync('riderInfo')
  if (!info) return

  const newStatus = e.detail.value ? 'online' : 'offline'
  try {
    await riderApi.toggleStatus(info.riderId || info.riderInfo?._id, newStatus)
    isOnline.value = e.detail.value
    // 更新本地存储
    info.riderStatus = newStatus
    uni.setStorageSync('riderInfo', info)
    uni.showToast({
      title: e.detail.value ? '已上线' : '已离线',
      icon: 'success'
    })
  } catch (err) {
    uni.showToast({ title: '切换失败', icon: 'none' })
  }
}

const showChangePassword = () => {
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showPasswordModal.value = true
}

const confirmChangePassword = async () => {
  if (!oldPassword.value) {
    uni.showToast({ title: '请输入原密码', icon: 'none' })
    return
  }
  if (!newPassword.value) {
    uni.showToast({ title: '请输入新密码', icon: 'none' })
    return
  }
  if (newPassword.value.length < 6) {
    uni.showToast({ title: '新密码至少6位', icon: 'none' })
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  const info = uni.getStorageSync('riderInfo')
  try {
    await riderApi.changePassword(info.riderId || info.riderInfo?._id, oldPassword.value, newPassword.value)
    uni.showToast({ title: '密码修改成功', icon: 'success' })
    showPasswordModal.value = false
  } catch (err) {
    uni.showToast({ title: err.msg || '修改失败', icon: 'none' })
  }
}

const logout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        const info = uni.getStorageSync('riderInfo')
        if (info) {
          await riderApi.toggleStatus(info.riderId || info.riderInfo?._id, 'offline')
        }
      } catch (e) {}
      doLogout()
      uni.showToast({ title: '已退出', icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/login/index' })
      }, 600)
    }
  })
}
</script>

<style scoped>
.mine-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  padding: 60rpx 40rpx 80rpx;
}

.avatar-section {
  display: flex;
  align-items: center;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  background: #fff;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #4CAF50;
  font-weight: bold;
  margin-right: 30rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 36rpx;
  color: #fff;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.user-phone {
  font-size: 26rpx;
  color: rgba(255,255,255,0.8);
}

.card {
  background: #fff;
  border-radius: 16rpx;
  margin: 20rpx;
  padding: 30rpx;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-left {
  display: flex;
  align-items: center;
}

.card-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.card-title {
  font-size: 30rpx;
  color: #333;
}

.status-desc {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.status-online {
  color: #4CAF50;
  font-size: 26rpx;
}

.status-offline {
  color: #999;
  font-size: 26rpx;
}

.card-header {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 20rpx;
  display: block;
}

.stats-row {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 40rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.menu-title {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 32rpx;
  color: #ccc;
}

.logout-btn {
  margin: 40rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
  color: #ff4d4f;
  font-size: 30rpx;
}

/* 修改密码弹窗 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  width: 600rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  display: block;
  margin-bottom: 30rpx;
}

.modal-input {
  height: 80rpx;
  border: 2rpx solid #ddd;
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
  background: #f5f5f5;
  color: #666;
}

.modal-btn.confirm {
  background: #4CAF50;
  color: #fff;
}
</style>