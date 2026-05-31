<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">{{ userName }}</text>
    </view>

    <!-- 聊天区域 -->
    <scroll-view class="chat-scroll" scroll-y="true" :scroll-top="scrollTop">
      <view class="chat-list">
        <view class="chat-item" :class="{ 'from-me': msg.senderType === 'merchant' }" v-for="(msg, idx) in messages" :key="idx">
          <view class="avatar" v-if="msg.senderType === 'user'">
            <text class="avatar-text">{{ getAvatarText(userName) }}</text>
          </view>
          <view class="message-bubble">
            <text class="message-text">{{ msg.content }}</text>
            <text class="message-time">{{ formatTime(msg.createTime) }}</text>
          </view>
        </view>
        <view class="empty-chat" v-if="messages.length === 0">
          <text>暂无消息</text>
        </view>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="input-area">
      <input class="input-field" v-model="inputText" placeholder="输入回复..." @confirm="sendMsg" />
      <view class="send-btn" @tap="sendMsg">
        <text class="send-text">发送</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getMessages, sendMessage, markAsRead } from '@/api'

export default {
  data() {
    return {
      convId: '',
      userName: '用户',
      messages: [],
      inputText: '',
      scrollTop: 9999,
      pollingTimer: null,
      lastTimestamp: 0
    }
  },
  onLoad(options) {
    this.convId = options.convId || ''
    this.userName = decodeURIComponent(options.userName || '用户')
    if (this.convId) {
      this.loadMessages()
      this.markAsRead()
    }
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
    async loadMessages() {
      if (!this.convId) return
      try {
        const res = await getMessages({ conversationId: this.convId })
        this.messages = res.data || []
        if (this.messages.length > 0) {
          this.lastTimestamp = this.messages[this.messages.length - 1].createTime
          this.scrollToBottom()
        }
      } catch (e) {
        console.error('加载消息失败', e)
      }
    },
    async sendMsg() {
      if (!this.inputText.trim()) return
      if (!this.convId) {
        uni.showToast({ title: '会话未初始化', icon: 'none' })
        return
      }

      const content = this.inputText.trim()
      this.inputText = ''

      try {
        await sendMessage({
          conversationId: this.convId,
          senderId: 'merchant',
          senderType: 'merchant',
          senderName: '商家',
          content: content
        })
        await this.loadMessages()
      } catch (e) {
        console.error('发送消息失败', e)
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },
    async pollMessages() {
      if (!this.convId || !this.lastTimestamp) return
      try {
        const res = await getMessages({
          conversationId: this.convId,
          lastTimestamp: this.lastTimestamp
        })
        if (res.data && res.data.length > 0) {
          this.messages = [...this.messages, ...res.data]
          this.lastTimestamp = this.messages[this.messages.length - 1].createTime
          this.scrollToBottom()
        }
      } catch (e) {
        // 忽略轮询错误
      }
    },
    async markAsRead() {
      try {
        await markAsRead({ conversationId: this.convId, userType: 'merchant' })
      } catch (e) {
        // 忽略错误
      }
    },
    startPolling() {
      this.pollingTimer = setInterval(() => {
        this.pollMessages()
      }, 3000)
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = 9999
      })
    },
    getAvatarText(name) {
      return name ? name.charAt(0).toUpperCase() : '用'
    },
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    },
    goBack() { uni.navigateBack() }
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #FFFFFF; display: flex; flex-direction: column; }
.nav-bar { display: flex; align-items: center; height: 88rpx; background-color: #FFFFFF; padding: 0 24rpx; position: fixed; top: 0; left: 0; right: 0; z-index: 100; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.back-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 44rpx; color: #333; font-weight: 300; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #333; text-align: center; }

.chat-scroll { flex: 1; padding: 108rpx 24rpx 120rpx 24rpx; box-sizing: border-box; width: 100%; background-color: #F5F1EB; }
.chat-list { display: flex; flex-direction: column; gap: 32rpx; padding: 24rpx 0; }
.chat-item { display: flex; align-items: flex-end; gap: 16rpx; width: 100%; box-sizing: border-box; }
.chat-item.from-me { justify-content: flex-end; }

.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background-color: #4F9A42; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-text { font-size: 32rpx; color: #FFF; font-weight: 600; }

.message-bubble { max-width: 70%; background-color: #FFFFFF; border-radius: 20rpx; padding: 20rpx 24rpx; display: flex; flex-direction: column; word-break: break-all; box-sizing: border-box; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.from-me .message-bubble { background-color: #2D5A27; }
.message-text { font-size: 28rpx; color: #333; line-height: 1.6; word-break: break-word; }
.from-me .message-text { color: #FFFFFF; }
.message-time { font-size: 22rpx; color: #999999; margin-top: 8rpx; align-self: flex-end; }
.from-me .message-time { color: rgba(255,255,255,0.6); }

.empty-chat { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }

.input-area { position: fixed; bottom: 0; left: 0; right: 0; background-color: #FFFFFF; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; border-top: 1rpx solid #E8E8E8; }
.input-field { flex: 1; height: 80rpx; background-color: #F5F1EB; border-radius: 40rpx; padding: 0 32rpx; font-size: 28rpx; border: none; }
.send-btn { width: 140rpx; height: 80rpx; background-color: #4F9A42; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 4rpx 12rpx rgba(79,154,66,0.3); }
.send-text { font-size: 28rpx; color: #FFF; font-weight: 600; }
</style>