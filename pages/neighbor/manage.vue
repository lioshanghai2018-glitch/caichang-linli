<template>
	<view class="page">
		<!-- 顶部导航 -->
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">‹</text>
			</view>
			<text class="nav-title">我的发布</text>
			<view class="add-btn" @tap="goAddPost">
				<text>新增</text>
			</view>
		</view>

		<!-- 状态Tab -->
		<view class="status-tab">
			<view class="status-item" :class="{ active: currentStatus === 'all' }" @tap="switchStatus('all')">
				<text>全部</text>
			</view>
			<view class="status-item" :class="{ active: currentStatus === 'active' }" @tap="switchStatus('active')">
				<text>显示</text>
			</view>
			<view class="status-item" :class="{ active: currentStatus === 'closed' }" @tap="switchStatus('closed')">
				<text>隐藏</text>
			</view>
		</view>

		<!-- 帖子列表 -->
		<scroll-view class="post-list" scroll-y="true" :refresher-enabled="true"
			:refresher-triggered="refreshing" @refresherrefresh="onRefresh" @scrolltolower="loadMore">
			<!-- 空状态 -->
			<view class="empty-state" v-if="!loading && posts.length === 0">
				<text class="empty-text">暂无发布</text>
				<text class="empty-sub">点击上方"新增"发布帖子</text>
			</view>

			<!-- 帖子卡片 -->
			<view class="post-card" v-for="post in posts" :key="post._id || post.id">
				<view class="card-header">
					<view class="status-tag" :class="isDisplayed(post) ? 'online' : 'offline'">
						<text>{{ isDisplayed(post) ? '显示' : '隐藏' }}</text>
					</view>
					<text class="card-title">{{ post.title }}</text>
				</view>

				<text class="card-content">{{ post.content }}</text>

				<!-- 图片缩略图(过滤掉 http://tmp/ 临时路径) -->
				<view class="card-images" v-if="validImages(post.images).length > 0">
					<image
						class="card-image-thumb"
						v-for="(img, iIdx) in validImages(post.images).slice(0, 6)"
						:key="iIdx"
						:src="img"
						mode="aspectFill"
						@tap.stop="previewImage(validImages(post.images), iIdx)"
					/>
				</view>

				<!-- 商家下架原因 -->
				<view class="block-reason" v-if="post.blockedByAdmin">
					<text class="block-icon">⚠</text>
					<text class="block-text">已被管理员下架：{{ post.blockReason || '请联系管理员' }}</text>
				</view>

				<view class="card-meta">
					<text>{{ formatTime(post.createdAt) }}</text>
					<text class="dot">·</text>
					<text>{{ post.comments || 0 }}评论</text>
					<text class="dot">·</text>
					<text>{{ post.likes || 0 }}点赞</text>
				</view>

				<view class="card-actions">
					<view class="action-btn" @tap="goEditPost(post)">
						<text>编辑</text>
					</view>
					<view class="action-btn" v-if="isDisplayed(post)" @tap="hidePost(post)">
						<text>隐藏</text>
					</view>
					<view class="action-btn" v-else-if="!post.blockedByAdmin" @tap="showPost(post)">
						<text>显示</text>
					</view>
					<view class="action-btn disabled" v-else>
						<text>显示</text>
					</view>
					<view class="action-btn delete" @tap="confirmDelete(post)">
						<text>删除</text>
					</view>
				</view>
			</view>

			<!-- 加载更多 -->
			<view class="load-more" v-if="posts.length > 0">
				<text>{{ hasMore ? '加载更多...' : '没有更多了' }}</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getMyPosts, togglePostStatus, deletePost } from '@/utils/neighbor-api.js'
import { getUserId } from '@/utils/auth.js'

export default {
	data() {
		return {
			userId: '', // 从 storage 读取真实登录用户 ID
			currentStatus: 'all',
			posts: [],
			loading: false,
			refreshing: false,
			hasMore: false
		}
	},
	onLoad() {
		this.userId = getUserId()
		if (!this.userId) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1000)
			return
		}
		this.loadMyPosts()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		isDisplayed(post) {
			const s = post.status
			return s === 1 || s === '1' || s === true || s === 'active' || s === 'online'
		},
		async loadMyPosts() {
			if (this.loading) return
			this.loading = true

			try {
				const params = { userId: this.userId }
				if (this.currentStatus === 'active' || this.currentStatus === 'closed') {
					params.status = this.currentStatus
				}
				const res = await getMyPosts(params)
				this.posts = res.data || []
			} catch (e) {
				// 使用本地存储
				let allPosts = uni.getStorageSync('local_posts') || []
				if (this.currentStatus === 'active') {
					allPosts = allPosts.filter(p => p.status == 1 || p.status === 'active' || p.status === 'online')
				} else if (this.currentStatus === 'closed') {
					allPosts = allPosts.filter(p => p.status == 0 || p.status === 'closed' || p.status === 'offline')
				}
				this.posts = allPosts
			}
			this.loading = false
		},
		switchStatus(status) {
			if (this.currentStatus === status) return
			this.currentStatus = status
			this.loadMyPosts()
		},
		async onRefresh() {
			this.refreshing = true
			await this.loadMyPosts()
			this.refreshing = false
		},
		loadMore() {
			// 分页加载，后续扩展
		},
		goAddPost() {
			uni.navigateTo({ url: '/pages/neighbor/publish' })
		},
		goEditPost(post) {
			const id = post._id || post.id
			uni.navigateTo({ url: `/pages/neighbor/publish?edit=${id}` })
		},
		async hidePost(post) {
			const id = post._id || post.id
			uni.showModal({
				title: '确认隐藏',
				content: '确定要下架该帖子吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							await togglePostStatus(id, 0)
						} catch (e) {
							// 本地存储
							let localPosts = uni.getStorageSync('local_posts') || []
							const idx = localPosts.findIndex(p => (p._id || p.id) === id)
							if (idx >= 0) localPosts[idx].status = 'closed'
							uni.setStorageSync('local_posts', localPosts)
						}
						post.status = 'closed'
						uni.showToast({ title: '已隐藏', icon: 'success' })
					}
				}
			})
		},
		async showPost(post) {
			const id = post._id || post.id
			try {
				await togglePostStatus(id, 1)
			} catch (e) {
				let localPosts = uni.getStorageSync('local_posts') || []
				const idx = localPosts.findIndex(p => (p._id || p.id) === id)
				if (idx >= 0) localPosts[idx].status = 'active'
				uni.setStorageSync('local_posts', localPosts)
			}
			post.status = 'active'
			uni.showToast({ title: '已显示', icon: 'success' })
		},
		confirmDelete(post) {
			const id = post._id || post.id
			uni.showModal({
				title: '确认删除',
				content: '确定要删除该帖子吗？删除后无法恢复',
				success: async (res) => {
					if (res.confirm) {
						try {
							await deletePost(id)
						} catch (e) {
							// 本地存储
							let localPosts = uni.getStorageSync('local_posts') || []
							localPosts = localPosts.filter(p => (p._id || p.id) !== id)
							uni.setStorageSync('local_posts', localPosts)
						}
						this.posts = this.posts.filter(p => (p._id || p.id) !== id)
						uni.showToast({ title: '已删除', icon: 'success' })
					}
				}
			})
		},
		previewImage(images, idx) {
			uni.previewImage({ urls: images.slice(0, 6), current: idx })
		},
		// 过滤掉 http://tmp/ 临时路径(旧帖发布时存的临时文件,几小时就过期,现在已不可用)
		validImages(images) {
			if (!images || !Array.isArray(images)) return []
			return images.filter(img => img && !String(img).startsWith('http://tmp/'))
		},
		formatTime(isoString) {
			if (!isoString) return ''
			const date = new Date(isoString)
			const now = new Date()
			const diff = now - date
			if (diff < 60000) return '刚刚'
			if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
			if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
			if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
			return date.toLocaleDateString('zh-CN')
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background-color: #F5F1EB;
}

.nav-bar {
	display: flex;
	align-items: center;
	height: 88rpx;
	background-color: #FFFFFF;
	padding: 0 24rpx;
	border-bottom: 1rpx solid #F0F0F0;
}

.back-btn {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-arrow {
	font-size: 44rpx;
	color: #333;
	font-weight: 300;
}

.nav-title {
	flex: 1;
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	text-align: center;
}

.add-btn {
	padding: 8rpx 24rpx;
	background-color: #4F9A42;
	border-radius: 24rpx;
}

.add-btn text {
	font-size: 26rpx;
	color: #FFFFFF;
}

.status-tab {
	display: flex;
	background-color: #FFFFFF;
	padding: 0 24rpx;
	border-bottom: 1rpx solid #F0F0F0;
}

.status-item {
	flex: 1;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.status-item text {
	font-size: 28rpx;
	color: #666;
}

.status-item.active text {
	color: #4F9A42;
	font-weight: 600;
}

.status-item.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 48rpx;
	height: 4rpx;
	background-color: #4F9A42;
	border-radius: 2rpx;
}

.post-list {
	height: calc(100vh - 176rpx);
	padding: 20rpx;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-top: 200rpx;
}

.empty-text {
	font-size: 32rpx;
	color: #333;
	font-weight: 600;
}

.empty-sub {
	font-size: 26rpx;
	color: #999;
	margin-top: 16rpx;
}

.post-card {
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
}

.card-header {
	display: flex;
	align-items: center;
	margin-bottom: 16rpx;
}

.status-tag {
	padding: 4rpx 12rpx;
	border-radius: 6rpx;
	flex-shrink: 0;
}

.status-tag.online {
	background-color: #E8F5E9;
}

.status-tag.online text {
	font-size: 22rpx;
	font-weight: 600;
	color: #4F9A42;
}

.status-tag.offline {
	background-color: #F5F5F5;
}

.status-tag.offline text {
	font-size: 22rpx;
	font-weight: 600;
	color: #999;
}

.card-title {
	font-size: 30rpx;
	color: #333;
	font-weight: 600;
	margin-left: 12rpx;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.card-content {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.card-images {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-top: 12rpx;
}

.card-image-thumb {
	width: 120rpx;
	height: 120rpx;
	border-radius: 6rpx;
	background-color: #F5F5F5;
}

.block-reason {
	background-color: #FFF3E0;
	border-radius: 8rpx;
	padding: 12rpx 16rpx;
	margin-top: 12rpx;
	display: flex;
	align-items: center;
}

.block-icon {
	font-size: 24rpx;
	margin-right: 8rpx;
}

.block-text {
	font-size: 24rpx;
	color: #FF6B00;
}

.card-meta {
	font-size: 24rpx;
	color: #999;
	margin-top: 16rpx;
}

.dot {
	margin: 0 8rpx;
}

.card-actions {
	display: flex;
	justify-content: flex-end;
	margin-top: 20rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid #F0F0F0;
}

.action-btn {
	padding: 8rpx 24rpx;
	border-radius: 20rpx;
	background-color: #F5F5F5;
	margin-left: 16rpx;
}

.action-btn text {
	font-size: 24rpx;
	color: #666;
}

.action-btn.disabled {
	background-color: #E0E0E0;
}

.action-btn.disabled text {
	color: #999;
}

.action-btn.delete text {
	color: #FF6B6B;
}

.load-more {
	text-align: center;
	padding: 30rpx 0;
}

.load-more text {
	font-size: 24rpx;
	color: #999;
}
</style>