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
	<scroll-view class="message-list" scroll-y @scrolltolower="onReachBottom">
		<view class="message-card" v-for="(msg, idx) in messageList" :key="msg._id || idx" @tap="goChat(msg)">
			<view class="message-header">
				<view class="user-avatar">
					<text>{{ msg.avatar || '👤' }}</text>
				</view>
				<view class="user-info">
					<text class="user-name">{{ msg.userName || '用户' }}</text>
					<text class="user-order" v-if="msg.orderNo">订单号：{{ msg.orderNo }}</text>
				</view>
				<view class="msg-time">
					<text>{{ formatTime(msg.lastMessageAt) }}</text>
					<view class="unread-dot" v-if="(msg.unreadMerchant || msg.unreadCount || 0) > 0">
						<text>{{ (msg.unreadMerchant || msg.unreadCount) > 99 ? '99+' : (msg.unreadMerchant || msg.unreadCount) }}</text>
					</view>
				</view>
			</view>
			<view class="message-content">
				<text class="content-text" v-if="msg.lastMessage">{{ msg.lastMessage }}</text>
				<text class="content-text placeholder" v-else>暂无消息</text>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-if="messageList.length === 0 && !loading">
			<text class="empty-icon">💬</text>
			<text class="empty-text">暂无消息</text>
		</view>
		<view class="loading-state" v-if="loading && messageList.length === 0">
			<text class="loading-text">加载中…</text>
		</view>
	</scroll-view>

	<!-- 底部统计 -->
	<view class="bottom-stats">
		<view class="stat-item">
			<text class="stat-value">{{ stats.pending }}</text>
			<text class="stat-label">待回复</text>
		</view>
		<view class="stat-item">
			<text class="stat-value">{{ stats.today }}</text>
			<text class="stat-label">今日消息</text>
		</view>
		<view class="stat-item">
			<text class="stat-value">{{ stats.resolved }}</text>
			<text class="stat-label">已解决</text>
		</view>
	</view>

	<view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { getConversations, getMessages } from '@/utils/api.js'

export default {
	data() {
		return {
			currentTab: 'pending',
			tabs: [
				{ key: 'pending', label: '待回复', count: 0 },
				{ key: 'all', label: '全部', count: 0 },
				{ key: 'resolved', label: '已解决', count: 0 }
			],
			allConversations: [],
			messageList: [],
			stats: { pending: 0, today: 0, resolved: 0 },
			loading: false,
			pollingTimer: null
		}
	},
	onShow() {
		this.fetchList()
		this.startPolling()
	},
	onHide() {
		this.stopPolling()
	},
	onUnload() {
		this.stopPolling()
	},
	onPullDownRefresh() {
		this.fetchList().finally(() => uni.stopPullDownRefresh())
	},
	methods: {
		async fetchList() {
			this.loading = true
			try {
				// 不传 merchantId：单商家场景下要看到所有客户的会话
				// （兜底老 'default' merchantId 的会话和当前真 ID 的会话都看得到）
				const res = await getConversations({})
				const list = Array.isArray(res.data) ? res.data : []
				this.allConversations = list.map(c => ({ ...c, avatar: '👤' }))
				this.applyTab()
				this.calcStats()
			} catch (e) {
				console.error('获取会话列表失败', e)
				uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		applyTab() {
			let filtered = []
			if (this.currentTab === 'pending') {
				filtered = this.allConversations.filter(c => (c.unreadMerchant || c.unreadCount || 0) > 0 && c.status !== 'resolved')
			} else if (this.currentTab === 'resolved') {
				filtered = this.allConversations.filter(c => c.status === 'resolved')
			} else {
				filtered = this.allConversations.slice()
			}
			this.messageList = filtered
		},
		calcStats() {
			const isToday = (ts) => {
				if (!ts) return false
				const d = new Date(ts)
				const now = new Date()
				return d.toDateString() === now.toDateString()
			}
			this.stats.pending = this.allConversations.filter(c => (c.unreadMerchant || c.unreadCount || 0) > 0 && c.status !== 'resolved').length
			this.stats.resolved = this.allConversations.filter(c => c.status === 'resolved').length
			// 今日消息：老数据用 lastMessageTime，新数据用 lastMessageAt
			this.stats.today = this.allConversations.filter(c => isToday(c.lastMessageTime || c.lastMessageAt)).length
			// tab 角标
			this.tabs[0].count = this.stats.pending
			this.tabs[1].count = this.allConversations.length
			this.tabs[2].count = this.stats.resolved
		},
		switchTab(key) {
			this.currentTab = key
			this.applyTab()
		},
		goChat(msg) {
			uni.navigateTo({ url: `/pages/service/chat?conversationId=${msg._id}&userName=${encodeURIComponent(msg.userName || '用户')}` })
		},
		formatTime(ts) {
			if (!ts) return ''
			const d = new Date(ts)
			if (isNaN(d.getTime())) return ''
			const now = new Date()
			const diff = (now - d) / 1000
			if (diff < 60) return '刚刚'
			if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
			if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
			if (diff < 604800) return `${Math.floor(diff / 86400)}天前`
			return `${d.getMonth() + 1}/${d.getDate()}`
		},
		startPolling() {
			this.stopPolling()
			this.pollingTimer = setInterval(() => this.fetchList(), 10000)
		},
		stopPolling() {
			if (this.pollingTimer) {
				clearInterval(this.pollingTimer)
				this.pollingTimer = null
			}
		},
		onReachBottom() {
			// 当前数据量不大，无需分页；预留
		}
	}
}
</script>

<style>
.page {
	background-color: #F5F1EB;
	min-height: 100vh;
	padding: 0 20rpx 280rpx;
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
	padding: 0 8rpx;
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
	height: calc(100vh - 380rpx);
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
	min-width: 0;
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
	min-width: 32rpx;
	height: 32rpx;
	background: #FF0000;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 8rpx;
	padding: 0 8rpx;
}
.unread-dot text {
	font-size: 22rpx;
	color: #FFFFFF;
}
.message-content {
	padding: 16rpx;
	background: #FAFAFA;
	border-radius: 12rpx;
}
.content-text {
	font-size: 28rpx;
	color: #333333;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.content-text.placeholder {
	color: #BBBBBB;
	font-style: italic;
}

/* 空/加载状态 */
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
.loading-state {
	text-align: center;
	padding: 60rpx 0;
}
.loading-text {
	font-size: 26rpx;
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
