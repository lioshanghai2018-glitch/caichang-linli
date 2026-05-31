<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-title">客服消息</text>
    </view>

    <!-- 会话列表 -->
    <scroll-view class="conv-list" scroll-y="true">
      <view class="conv-card" v-for="conv in conversations" :key="conv._id" @tap="openChat(conv)">
        <view class="conv-avatar">
          <text class="avatar-text">{{ getAvatarText(conv.userName) }}</text>
        </view>
        <view class="conv-content">
          <view class="conv-header">
            <text class="conv-name">{{ conv.userName }}</text>
            <text class="conv-time">{{ formatTime(conv.lastMessageTime) }}</text>
          </view>
          <view class="conv-footer">
            <text class="conv-last-msg">{{ conv.lastMessage || '暂无消息' }}</text>
            <view class="unread-badge" v-if="conv.unreadMerchant > 0">
              <text class="badge-text">{{ conv.unreadMerchant > 99 ? '99+' : conv.unreadMerchant }}</text>
            </view>
          </view>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="empty-hint" v-if="conversations.length === 0 && !loading">
        <text>暂无消息</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getConversations } from '@/api'

export default {
  data() {
    return {
      conversations: [],
      loading: false,
      pollingTimer: null
    }
  },
  onLoad() {
    this.loadConversations()
  },
  onShow() {
    this.startPolling()
  },
  onHide() {
    this.stopPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    async loadConversations() {
      this.loading = true
      try {
        const res = await getConversations({})
        this.conversations = res.data || []
      } catch (e) {
        console.error('加载会话列表失败', e)
      }
      this.loading = false
    },
    openChat(conv) {
      uni.navigateTo({
        url: `/pages/chat/conversation?convId=${conv._id}&userName=${encodeURIComponent(conv.userName)}`
      })
    },
    getAvatarText(name) {
      return name ? name.charAt(0).toUpperCase() : '用'
    },
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
      if (date.getDate() === now.getDate()) {
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
      }
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    },
    startPolling() {
      this.pollingTimer = setInterval(() => {
        this.loadConversations()
      }, 5000)
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    }
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #F5F1EB; }
.nav-bar { display: flex; align-items: center; justify-content: center; height: 88rpx; background-color: #FFFFFF; position: fixed; top: 0; left: 0; right: 0; z-index: 100; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.nav-title { font-size: 34rpx; font-weight: 600; color: #333; }

.conv-list { height: calc(100vh - 88rpx); padding: 108rpx 24rpx 24rpx 24rpx; box-sizing: border-box; }
.conv-card { display: flex; align-items: center; padding: 28rpx 24rpx; background-color: #FFFFFF; border-radius: 16rpx; margin-bottom: 16rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.conv-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; background-color: #E8F5E9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-text { font-size: 36rpx; color: #4F9A42; font-weight: 600; }
.conv-content { flex: 1; margin-left: 24rpx; }
.conv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.conv-name { font-size: 30rpx; color: #333; font-weight: 600; }
.conv-time { font-size: 22rpx; color: #999; }
.conv-footer { display: flex; justify-content: space-between; align-items: center; }
.conv-last-msg { font-size: 26rpx; color: #999; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.unread-badge { min-width: 36rpx; height: 36rpx; border-radius: 18rpx; background-color: #FF3333; display: flex; align-items: center; justify-content: center; margin-left: 16rpx; }
.badge-text { font-size: 22rpx; color: #FFFFFF; padding: 0 8rpx; font-weight: 600; }
.arrow { font-size: 36rpx; color: #CCCCCC; font-weight: 300; }
.empty-hint { text-align: center; padding: 120rpx 0; color: #999; font-size: 28rpx; }
</style>