<template>
<view class="page">
  <!-- 返回按钮 -->
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">{{chatInfo.userName}}</text>
    <text class="order-link" @tap="goOrder">订单详情 ›</text>
  </view>

  <!-- 消息列表 -->
  <scroll-view class="message-list" scroll-y :scroll-top="scrollTop" @scroll="onScroll">
    <view class="message-wrapper" v-for="(msg, idx) in messages" :key="idx" :class="msg.role">
      <view class="message-avatar">
        <text>{{msg.role === 'user' ? '👤' : '🏪'}}</text>
      </view>
      <view class="message-bubble">
        <text class="message-text">{{msg.content}}</text>
        <text class="message-time">{{msg.time}}</text>
      </view>
    </view>

    <!-- 快捷回复模板 -->
    <view class="quick-templates" v-if="quickReplies.length > 0">
      <view class="template-item" v-for="(tpl, ti) in quickReplies" :key="ti" @tap="sendQuickReply(tpl)">
        <text>{{tpl}}</text>
      </view>
    </view>
  </scroll-view>

  <!-- 底部输入框 -->
  <view class="input-bar">
    <input class="input-field" placeholder="输入消息..." v-model="inputText" @confirm="sendMessage" />
    <view class="send-btn" @tap="sendMessage">
      <text>发送</text>
    </view>
  </view>
</view>
</template>

<script>
export default {
  data() {
    return {
      chatId: '',
      chatInfo: {
        userName: '张先生',
        orderNo: '20240520120001'
      },
      inputText: '',
      scrollTop: 0,
      quickReplies: [
        '预计30分钟内送达',
        '请稍等，正在处理中',
        '已安排骑手配送',
        '祝您用餐愉快'
      ],
      messages: [
        {
          role: 'user',
          content: '请问我的订单什么时候能送到？',
          time: '10:30'
        },
        {
          role: 'merchant',
          content: '您好，您的订单正在分拣中，预计30分钟内送达。',
          time: '10:32'
        },
        {
          role: 'user',
          content: '好的，谢谢！',
          time: '10:33'
        }
      ]
    }
  },
  onLoad(options) {
    if (options.id) {
      this.chatId = options.id
      this.loadChat()
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goOrder() {
      uni.navigateTo({ url: `/pages/order/detail?id=${this.chatInfo.orderNo}` })
    },
    onScroll(e) {
      // 滚动时隐藏快捷回复
    },
    loadChat() {
      // 模拟加载聊天记录
    },
    sendMessage() {
      if (!this.inputText.trim()) return

      this.messages.push({
        role: 'merchant',
        content: this.inputText,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      })

      this.inputText = ''
      this.scrollTop = this.scrollTop + 100
    },
    sendQuickReply(text) {
      this.inputText = text
      this.sendMessage()
    }
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 返回栏 */
.back-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  background: #FFFFFF;
  padding: 0 20rpx;
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
.order-link {
  font-size: 26rpx;
  color: #4CAF50;
}

/* 消息列表 */
.message-list {
  flex: 1;
  padding: 24rpx 20rpx;
}
.message-wrapper {
  display: flex;
  margin-bottom: 24rpx;
  align-items: flex-start;
}
.message-wrapper.user {
  flex-direction: row;
}
.message-wrapper.merchant {
  flex-direction: row-reverse;
}
.message-avatar {
  width: 64rpx;
  height: 64rpx;
  background: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.message-avatar text {
  font-size: 32rpx;
}
.message-bubble {
  max-width: 70%;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  margin: 0 16rpx;
}
.message-wrapper.user .message-bubble {
  background: #FFFFFF;
}
.message-wrapper.merchant .message-bubble {
  background: #4CAF50;
}
.message-text {
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-all;
}
.message-wrapper.user .message-text {
  color: #333333;
}
.message-wrapper.merchant .message-text {
  color: #FFFFFF;
}
.message-time {
  font-size: 20rpx;
  margin-top: 8rpx;
  display: block;
}
.message-wrapper.user .message-time {
  color: #999999;
}
.message-wrapper.merchant .message-time {
  color: rgba(255,255,255,0.7);
  text-align: right;
}

/* 快捷回复模板 */
.quick-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 20rpx 0;
  border-top: 1rpx solid #F5F5F5;
}
.template-item {
  padding: 12rpx 24rpx;
  background: #E8F5E9;
  border-radius: 24rpx;
}
.template-item text {
  font-size: 24rpx;
  color: #4CAF50;
}

/* 底部输入框 */
.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E8E8;
}
.input-field {
  flex: 1;
  height: 72rpx;
  background: #F5F5F5;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}
.input-field::placeholder {
  color: #999999;
}
.send-btn {
  margin-left: 16rpx;
  padding: 16rpx 32rpx;
  background: #4CAF50;
  border-radius: 36rpx;
}
.send-btn text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}
</style>