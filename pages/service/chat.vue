<template>
<view class="page">
	<!-- 返回按钮 -->
	<view class="back-bar">
		<text class="back-arrow" @tap="goBack">‹</text>
		<text class="page-title">{{ userName }}</text>
		<text class="resolve-btn" :class="{resolved: convStatus === 'resolved'}" @tap="toggleResolve">
			<text>{{ convStatus === 'resolved' ? '已解决' : '标记解决' }}</text>
		</text>
	</view>

	<!-- 消息列表 -->
	<scroll-view class="message-list" scroll-y :scroll-top="scrollTop">
		<view class="message-wrapper" v-for="(msg, idx) in messages" :key="msg._id || idx" :class="msg.senderType || msg.role">
			<view class="message-avatar">
				<text>{{ (msg.senderType || msg.role) === 'merchant' ? '🏪' : '👤' }}</text>
			</view>
			<view class="message-bubble">
				<text class="message-text">{{ msg.content }}</text>
				<text class="message-time">{{ formatTime(msg.createTime || msg.createdAt) }}</text>
			</view>
		</view>

		<view class="empty-chat" v-if="messages.length === 0 && !loading">
			<text>暂无消息，开始对话吧~</text>
		</view>
	</scroll-view>

	<!-- 快捷回复模板 -->
	<view class="quick-templates" v-if="quickReplies.length > 0 && convStatus !== 'resolved'">
		<view class="template-item" v-for="(tpl, ti) in quickReplies" :key="ti" @tap.stop="sendQuickReply(tpl)">
			<text>{{tpl}}</text>
		</view>
	</view>

	<!-- 底部输入框 -->
	<view class="input-bar" v-if="convStatus !== 'resolved'">
		<input class="input-field" placeholder="输入消息..." v-model="inputText" :adjust-position="true" @confirm="sendMessage" />
		<view class="send-btn" @tap="sendMessage">
			<text>发送</text>
		</view>
	</view>
	<view class="input-bar resolved-tip" v-else>
		<text class="resolved-tip-text">会话已解决</text>
		<view class="reopen-btn" @tap="reopen">
			<text>重新打开</text>
		</view>
	</view>
</view>
</template>

<script>
import { getMessages, sendMessage, markAsRead, updateConversation } from '@/utils/api.js'
import { STORAGE_KEYS } from '@/utils/config.js'

export default {
	data() {
		return {
			conversationId: '',
			userName: '',
			convStatus: 'active',
			messages: [],
			inputText: '',
			scrollTop: 0,
			loading: false,
			sending: false,
			pollingTimer: null,
			lastTimestamp: 0,
			quickReplies: [
				'预计30分钟内送达',
				'请稍等，正在分拣中',
				'已安排骑手配送'
			]
		}
	},
	onLoad(options) {
		if (options.conversationId) {
			this.conversationId = options.conversationId
		}
		if (options.userName) {
			this.userName = decodeURIComponent(options.userName)
		}
	},
	onShow() {
		if (this.conversationId) {
			this.loadConvInfo()
			this.loadMessages()
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
		async loadConvInfo() {
			// 从缓存读会话的 status（轮询时会更新）
		},
		async loadMessages() {
			if (!this.conversationId) return
			this.loading = true
			try {
				const res = await getMessages({ conversationId: this.conversationId })
				console.log('[chat] getMessages 返回:', JSON.stringify(res).slice(0, 500))
				this.messages = Array.isArray(res.data) ? res.data : []
				console.log('[chat] messages 数量:', this.messages.length, '首条:', this.messages[0] ? Object.keys(this.messages[0]) : '无')
				if (this.messages.length > 0) {
					this.lastTimestamp = this.messages[this.messages.length - 1].createTime || this.messages[this.messages.length - 1].createdAt
				}
				this.scrollToBottom()
				// 标记商家侧已读：老数据用 senderType
				await markAsRead({ conversationId: this.conversationId, senderType: 'user' })
			} catch (e) {
				console.error('加载消息失败', e)
			} finally {
				this.loading = false
			}
		},
		async sendMessage() {
			const content = this.inputText.trim()
			if (!content) return
			this.inputText = ''
			await this.doSend(content)
		},
		async doSend(content) {
			console.log('[chat] doSend 被调, content:', content, 'sending:', this.sending)
			if (!content) return
			if (this.sending) return  // 重入锁：防止快捷回复 + input confirm + 按钮 tap 三重触发
			// 内容级去重：300ms 内同 content 重复调用直接忽略（兜底防双击/事件冒泡）
			const now = Date.now()
			if (this._lastSentContent === content && now - (this._lastSentAt || 0) < 300) {
				console.log('[chat] doSend 内容去重:', content)
				return
			}
			this._lastSentContent = content
			this._lastSentAt = now
			if (!this.conversationId) {
				uni.showToast({ title: '会话未初始化', icon: 'none' })
				return
			}
			if (this.convStatus === 'resolved') {
				uni.showToast({ title: '会话已解决，请先重新打开', icon: 'none' })
				return
			}
			this.sending = true
			const merchantId = uni.getStorageSync(STORAGE_KEYS.MERCHANT_ID) || ''
			const userInfo = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
			const merchantName = userInfo.name || userInfo.shopName || '商家'
			// 乐观插入
			const tempId = 'temp_' + Date.now()
			this.messages.push({
				_id: tempId,
				senderType: 'merchant',
				content,
				createTime: Date.now(),
				pending: true
			})
			this.scrollToBottom()
			try {
				await sendMessage({
					conversationId: this.conversationId,
					merchantId,
					senderType: 'merchant',
					senderId: merchantId || 'merchant',
					senderName: merchantName,
					content,
					type: 'text'
				})
				// 重新拉一次确保顺序和时间戳准确
				await this.loadMessages()
			} catch (e) {
				uni.showToast({ title: e.msg || '发送失败', icon: 'none' })
				// 失败移除乐观消息
				this.messages = this.messages.filter(m => m._id !== tempId)
			} finally {
				this.sending = false
			}
		},
		sendQuickReply(text) {
			// 防双击去重：500ms 内重复点击同一文本直接忽略
			const now = Date.now()
			if (this._lastQuickReply === text && now - (this._lastQuickReplyAt || 0) < 500) {
				console.log('[chat] sendQuickReply 去重:', text)
				return
			}
			this._lastQuickReply = text
			this._lastQuickReplyAt = now
			// 快捷回复不走 input：直接调底层发送，避免触发 input @confirm 重复
			this.doSend(text)
		},
		async toggleResolve() {
			const next = this.convStatus === 'resolved' ? 'active' : 'resolved'
			try {
				await updateConversation({ conversationId: this.conversationId, status: next })
				this.convStatus = next
				uni.showToast({ title: next === 'resolved' ? '已标记为已解决' : '已重新打开', icon: 'success' })
			} catch (e) {
				uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
			}
		},
		reopen() {
			this.toggleResolve()
		},
		async pollMessages() {
			if (!this.conversationId) return
			try {
				const res = await getMessages({
					conversationId: this.conversationId,
					lastTimestamp: this.lastTimestamp
				})
				if (res.data && res.data.length > 0) {
					this.messages = [...this.messages, ...res.data]
					this.lastTimestamp = this.messages[this.messages.length - 1].createTime || this.messages[this.messages.length - 1].createdAt
					this.scrollToBottom()
					// 标记已读
					await markAsRead({ conversationId: this.conversationId, senderType: 'user' })
				}
			} catch (e) {
				// 忽略轮询错误
			}
		},
		startPolling() {
			this.stopPolling()
			this.pollingTimer = setInterval(() => this.pollMessages(), 3000)
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
				setTimeout(() => { this.scrollTop = 99999 }, 50)
			})
		},
		formatTime(timestamp) {
			if (!timestamp) return ''
			const d = new Date(timestamp)
			if (isNaN(d.getTime())) return ''
			return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
		},
		goBack() { uni.navigateBack() }
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
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	margin: 0 12rpx;
}
.resolve-btn {
	font-size: 24rpx;
	color: #4CAF50;
	padding: 8rpx 16rpx;
	background: #E8F5E9;
	border-radius: 24rpx;
}
.resolve-btn.resolved {
	color: #999999;
	background: #F5F5F5;
}
.resolve-btn text {
	font-size: 24rpx;
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
.empty-chat {
	text-align: center;
	padding: 100rpx 0;
	color: #999999;
	font-size: 28rpx;
}

/* 快捷回复模板 */
.quick-templates {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	padding: 20rpx;
	background: #FFFFFF;
	border-top: 1rpx solid #F0F0F0;
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
.input-bar.resolved-tip {
	justify-content: space-between;
}
.resolved-tip-text {
	font-size: 28rpx;
	color: #999999;
	flex: 1;
	text-align: center;
}
.reopen-btn {
	padding: 12rpx 24rpx;
	background: #4CAF50;
	border-radius: 24rpx;
}
.reopen-btn text {
	font-size: 26rpx;
	color: #FFFFFF;
}
</style>
