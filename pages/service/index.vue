<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">在线客服</text>
    </view>

    <!-- 聊天区域 -->
    <scroll-view class="chat-scroll" scroll-y="true" :scroll-top="scrollTop">
      <view class="chat-list">
        <view class="chat-item" :class="{ 'from-me': msg.senderType === 'user' }" v-for="(msg, idx) in messages" :key="idx">
          <view class="avatar" v-if="msg.senderType !== 'user'">
            <text class="avatar-text">店</text>
          </view>
          <view class="message-bubble">
            <text class="message-text">{{ msg.content }}</text>
            <text class="message-time">{{ formatTime(msg.createTime) }}</text>
          </view>
        </view>
        <view class="empty-chat" v-if="messages.length === 0">
          <text>暂无消息，开始对话吧~</text>
        </view>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="input-area">
      <input class="input-field" v-model="inputText" placeholder="输入消息..." @confirm="sendMsg" />
      <view class="send-btn" @tap="sendMsg">
        <text class="send-text">发送</text>
      </view>
    </view>
  </view>
</template>

<script>
import { createConversation, getMessages, sendMessage } from '@/utils/order-api'
import { requireLogin, isLoggedIn, getMerchantId, getUserId } from '@/utils/auth.js'

export default {
  data() {
    return {
      userId: '',
      userName: '',
      merchantId: '',
      conversationId: '',
      messages: [],
      inputText: '',
      scrollTop: 9999,
      pollingTimer: null,
      isLogin: false,
      lastTimestamp: 0,
      inited: false
    }
  },
  async onLoad() {
    this.isLogin = isLoggedIn()
    if (!await requireLogin()) return
    const userInfo = uni.getStorageSync('userInfo') || {}
    // 取真 userId：优先从 STORAGE_KEYS.USER_ID 这个 key 读（login 时存的真 _id），
    // 兜底从 userInfo 对象里取
    this.userId = getUserId() || userInfo._id || userInfo.userId || ('guest_' + Date.now())
    this.userName = userInfo.nickname || userInfo.userName || '用户'
    // 自动 bootstrap 商家 ID（与商家端一致，不再硬编码 'default'）
    this.merchantId = await getMerchantId()
    this.initConversation()
  },
  onShow() {
    if (this.inited) {
      this.startPolling()
    }
  },
  onHide() {
    this.stopPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    async initConversation() {
      console.log('开始初始化会话, userId:', this.userId, 'userName:', this.userName, 'merchantId:', this.merchantId)
      try {
        const res = await createConversation({
          merchantId: this.merchantId,
          userId: this.userId,
          userName: this.userName
        })
        console.log('createConversation 返回:', res)
        if (res && res.data) {
          this.conversationId = res.data._id
          console.log('会话ID:', this.conversationId)
          this.inited = true
          this.loadMessages()
          this.startPolling()
        } else {
          console.log('createConversation 返回数据为空')
        }
      } catch (e) {
        console.error('初始化会话失败', e)
      }
    },
    async loadMessages() {
      if (!this.conversationId) return
      try {
        const res = await getMessages({ conversationId: this.conversationId })
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
      if (!this.conversationId) {
        uni.showToast({ title: '会话未初始化', icon: 'none' })
        return
      }

      const content = this.inputText.trim()
      this.inputText = ''

      try {
        await sendMessage({
          conversationId: this.conversationId,
          merchantId: this.merchantId,
          senderId: this.userId,
          senderType: 'user',
          senderName: this.userName,
          content: content
        })
        await this.loadMessages()
      } catch (e) {
        console.error('发送消息失败', e)
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },
    async pollMessages() {
      if (!this.conversationId || !this.lastTimestamp) return
      try {
        const res = await getMessages({
          conversationId: this.conversationId,
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

.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background-color: #E8F5E9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-text { font-size: 32rpx; color: #4F9A42; font-weight: 600; }

.message-bubble { max-width: 70%; background-color: #FFFFFF; border-radius: 16rpx; padding: 20rpx 24rpx; display: flex; flex-direction: column; word-break: break-all; box-sizing: border-box; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.from-me .message-bubble { background-color: #4F9A42; }
.message-text { font-size: 28rpx; color: #333; line-height: 1.6; word-break: break-word; }
.from-me .message-text { color: #FFFFFF; }
.message-time { font-size: 20rpx; color: #999999; margin-top: 8rpx; align-self: flex-end; }
.from-me .message-time { color: rgba(255,255,255,0.7); }

.empty-chat { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }

.input-area { position: fixed; bottom: 0; left: 0; right: 0; background-color: #FFFFFF; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 16rpx; border-top: 1rpx solid #E0E0E0; }
.input-field { flex: 1; height: 80rpx; background-color: #F5F5F5; border-radius: 40rpx; padding: 0 32rpx; font-size: 28rpx; }
.send-btn { width: 140rpx; height: 80rpx; background-color: #4F9A42; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; }
.send-text { font-size: 28rpx; color: #FFF; font-weight: 600; }
</style>