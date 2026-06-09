<template>
<view class="page">
	<!-- 顶部统计条 -->
	<view class="stats-bar">
		<text class="stats-text">共 {{ communities.length }} 个小区</text>
		<view class="refresh-btn" @tap="fetchList">
			<text class="refresh-icon">↻</text>
			<text>刷新</text>
		</view>
	</view>

	<view class="empty-state" v-if="communities.length === 0 && !loading">
		<text class="empty-icon">🏘</text>
		<text class="empty-text">还没有小区，点击右下角添加</text>
	</view>

	<scroll-view class="cm-list" scroll-y v-else>
		<view class="cm-item" v-for="(item, idx) in communities" :key="item._id || idx">
			<view class="cm-main">
				<view class="cm-code-tag">
					<text>{{ item.code || '-' }}</text>
				</view>
				<view class="cm-text">
					<text class="cm-name">{{ item.name }}</text>
					<text class="cm-time">创建于 {{ formatTime(item.createdAt) }}</text>
				</view>
			</view>
			<view class="cm-actions">
				<text class="action-btn" @tap.stop="goEdit(item)">编辑</text>
				<text class="action-btn danger" @tap.stop="del(item)">删除</text>
			</view>
		</view>
		<view class="bottom-placeholder"></view>
	</scroll-view>

	<view class="add-btn" @tap="goAdd">
		<text class="add-icon">+</text>
	</view>
</view>
</template>

<script>
import { getCommunities, deleteCommunity } from '@/utils/api.js'

export default {
	data() {
		return {
			communities: [],
			loading: false
		}
	},
	onShow() {
		this.fetchList()
	},
	methods: {
		async fetchList() {
			this.loading = true
			try {
				const res = await getCommunities()
				const list = Array.isArray(res.data) ? res.data : []
				this.communities = list
			} catch (e) {
				uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		formatTime(ts) {
			if (!ts) return '-'
			const d = new Date(ts)
			if (isNaN(d.getTime())) return '-'
			const pad = n => (n < 10 ? '0' + n : '' + n)
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
		},
		goAdd() {
			uni.navigateTo({ url: '/pages/community/add' })
		},
		goEdit(item) {
			uni.navigateTo({ url: `/pages/community/add?id=${item._id}` })
		},
		del(item) {
			uni.showModal({
				title: '删除小区',
				content: `确定删除「${item.name}」？此操作不可恢复`,
				success: async (res) => {
					if (!res.confirm) return
					try {
						await deleteCommunity(item._id)
						uni.showToast({ title: '已删除', icon: 'success' })
						this.fetchList()
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
	padding: 20rpx 20rpx 180rpx;
}

/* 统计条 */
.stats-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #FFFFFF;
	border-radius: 16rpx;
	padding: 20rpx 24rpx;
	margin-bottom: 20rpx;
}
.stats-text {
	font-size: 26rpx;
	color: #666666;
}
.refresh-btn {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 6rpx 16rpx;
	background: #F5F5F5;
	border-radius: 20rpx;
}
.refresh-icon {
	font-size: 26rpx;
	color: #4CAF50;
	font-weight: 600;
}
.refresh-btn text {
	font-size: 24rpx;
	color: #4CAF50;
}

.cm-list {
	height: calc(100vh - 160rpx);
}

.cm-item {
	display: flex;
	align-items: center;
	background: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
}

.cm-main {
	flex: 1;
	display: flex;
	align-items: center;
	min-width: 0;
}

.cm-code-tag {
	min-width: 64rpx;
	height: 64rpx;
	padding: 0 12rpx;
	background: #E8F5E9;
	border-radius: 10rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 16rpx;
}

.cm-code-tag text {
	font-size: 26rpx;
	font-weight: 600;
	color: #2E7D32;
}

.cm-text {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.cm-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #000000;
	margin-bottom: 6rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cm-time {
	font-size: 22rpx;
	color: #999999;
}

.cm-actions {
	display: flex;
	align-items: center;
	gap: 12rpx;
	flex-shrink: 0;
}

.action-btn {
	font-size: 26rpx;
	color: #4CAF50;
	padding: 8rpx 16rpx;
}

.action-btn.danger {
	color: #FF4D4F;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 200rpx 0;
}

.empty-icon {
	font-size: 100rpx;
	margin-bottom: 24rpx;
}

.empty-text {
	font-size: 28rpx;
	color: #999999;
}

.add-btn {
	position: fixed;
	bottom: 80rpx;
	right: 24rpx;
	width: 96rpx;
	height: 96rpx;
	background: #4CAF50;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 20rpx rgba(76,175,80,0.4);
}

.add-icon {
	font-size: 60rpx;
	color: #FFFFFF;
	font-weight: 300;
}

.bottom-placeholder {
	height: 40rpx;
}
</style>
