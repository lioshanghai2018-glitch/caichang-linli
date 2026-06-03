<template>
<view class="page">
  <!-- 返回按钮 -->
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">客服消息</text>
  </view>

  <!-- 标签栏 -->
  <view class="tab-bar">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{active: currentTab === tab.key}"
      @tap="switchTab(tab.key)"
    >
      <text class="tab-text">{{tab.label}}</text>
      <view class="tab-badge" v-if="tab.count > 0">
        <text>{{tab.count > 99 ? '99+' : tab.count}}</text>
      </view>
    </view>
  </view>

  <!-- 消息列表 -->
  <scroll-view class="message-list" scroll-y>
    <view class="message-card" v-for="(msg, idx) in messageList" :key="idx" @tap="goChat(msg.id)">
      <view class="message-header">
        <view class="user-avatar">
          <text>{{msg.avatar}}</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{msg.userName}}</text>
          <text class="user-order">订单号：{{msg.orderNo}}</text>
        </view>
        <view class="msg-time">
          <text>{{msg.time}}</text>
          <view class="unread-dot" v-if="msg.unread > 0"></view>
        </view>
      </view>
      <view class="message-content">
        <text class="content-text">{{msg.lastMessage}}</text>
      </view>
      <view class="message-footer">
        <view class="quick-reply" v-for="(reply, ri) in msg.quickReplies" :key="ri" @tap.stop="sendQuickReply(msg.id, reply)">
          <text>{{reply}}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="messageList.length === 0">
      <text class="empty-icon">💬</text>
      <text class="empty-text">暂无消息</text>
    </view>
  </scroll-view>

  <!-- 底部统计 -->
  <view class="bottom-stats">
    <view class="stat-item">
      <text class="stat-value">{{stats.pending}}</text>
      <text class="stat-label">待回复</text>
    </view>
    <view class="stat-item">
      <text class="stat-value">{{stats.today}}</text>
      <text class="stat-label">今日消息</text>
    </view>
    <view class="stat-item">
      <text class="stat-value">{{stats.resolved}}</text>
      <text class="stat-label">已解决</text>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
export default {
  data() {
    return {
      currentTab: 'pending',
      tabs: [
        { key: 'pending', label: '待回复', count: 3 },
        { key: 'all', label: '全部', count: 0 },
        { key: 'resolved', label: '已解决', count: 12 }
      ],
      messageList: [
        {
          id: '1',
          userName: '张先生',
          avatar: '👤',
          orderNo: '20240520120001',
          lastMessage: '请问我的订单什么时候能送到？',
          time: '10分钟前',
          unread: 2,
          quickReplies: ['预计30分钟内送达', '请稍等，正在配送中', '已安排骑手配送']
        },
        {
          id: '2',
          userName: '李女士',
          avatar: '👤',
          orderNo: '20240520115932',
          lastMessage: '商品有损坏，可以退换吗？',
          time: '30分钟前',
          unread: 1,
          quickReplies: ['可以退换，稍后联系您', '请问损坏情况如何？', '请拍照发给我看看']
        },
        {
          id: '3',
          userName: '王先生',
          avatar: '👤',
          orderNo: '20240520104518',
          lastMessage: '感谢配送，辛苦了！',
          time: '1小时前',
          unread: 0,
          quickReplies: ['不客气，欢迎下次光临', '祝您用餐愉快', '谢谢您的支持']
        }
      ],
      stats: {
        pending: 3,
        today: 28,
        resolved: 12
      }
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    switchTab(key) {
      this.currentTab = key
    },
    goChat(msgId) {
      uni.navigateTo({ url: `/pages/service/chat?id=${msgId}` })
    },
    sendQuickReply(msgId, reply) {
      uni.showToast({ title: '已发送：' + reply, icon: 'none' })
    }
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 0 20rpx 180rpx;
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
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 20rpx;
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
  position: relative;
}
.tab-text {
  font-size: 28rpx;
  color: #666666;
}
.tab-item.active .tab-text {
  color: #4CAF50;
  font-weight: 600;
}
.tab-badge {
  min-width: 36rpx;
  height: 36rpx;
  background: #FF6B00;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
}
.tab-badge text {
  font-size: 22rpx;
  color: #FFFFFF;
}
.tab-item.active::after {
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

/* 消息列表 */
.message-list {
  height: calc(100vh - 300rpx);
}
.message-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.user-avatar {
  width: 80rpx;
  height: 80rpx;
  background: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}
.user-avatar text {
  font-size: 40rpx;
}
.user-info {
  flex: 1;
}
.user-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
  display: block;
  margin-bottom: 4rpx;
}
.user-order {
  font-size: 24rpx;
  color: #999999;
}
.msg-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.msg-time text {
  font-size: 24rpx;
  color: #999999;
}
.unread-dot {
  width: 16rpx;
  height: 16rpx;
  background: #FF0000;
  border-radius: 50%;
  margin-top: 8rpx;
}
.message-content {
  padding: 16rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.content-text {
  font-size: 28rpx;
  color: #333333;
}
.message-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.quick-reply {
  padding: 8rpx 20rpx;
  background: #E8F5E9;
  border-radius: 20rpx;
}
.quick-reply text {
  font-size: 24rpx;
  color: #4CAF50;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 底部统计 */
.bottom-stats {
  position: fixed;
  bottom: 120rpx;
  left: 20rpx;
  right: 20rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #4CAF50;
  margin-bottom: 4rpx;
}
.stat-label {
  font-size: 24rpx;
  color: #999999;
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>