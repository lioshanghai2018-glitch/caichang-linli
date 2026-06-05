<template>
	<view class="page">
		<!-- 顶部搜索栏 -->
		<view class="header">
			<view class="search-bar">
				<view class="search-icon-line"></view>
				<input
					class="search-input"
					v-model="searchKeyword"
					placeholder="搜索邻里帖子"
					placeholder-class="search-placeholder"
					confirm-type="search"
					@confirm="onSearch"
				/>
				<view v-if="searchKeyword" class="search-clear" @tap="clearSearch">×</view>
			</view>
		</view>

		<!-- 邻里横幅 -->
		<image class="banner-image" src="https://mp-ae9bd108-da40-4ae6-923b-c3007dedec12.cdn.bspapp.com/linli.jpg" mode="aspectFill"></image>

		<!-- 分类标签栏 -->
		<scroll-view class="tag-bar" scroll-x="true">
			<view class="tag-list">
				<view
					class="tag-item"
					:class="{ active: currentTag === index }"
					v-for="(tag, index) in tags"
					:key="index"
					@tap="switchTag(index)"
				>
					<text>{{tag}}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 帖子列表 -->
		<scroll-view class="post-list" scroll-y="true" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
			<!-- 空状态 -->
			<view class="empty-state" v-if="!loading && posts.length === 0">
				<text class="empty-text">暂无帖子</text>
				<text class="empty-sub">点击右下角"发布"发布第一条帖子</text>
			</view>

			<view class="post-card" v-for="post in posts" :key="post._id || post.id" @tap="goPostDetail(post)">
				<!-- 帖子头部：用户ID+认证标识+时间 -->
				<view class="post-header">
					<view class="user-id-wrap">
						<text class="user-id">{{ getDisplayId(post.authorId) }}</text>
						<view class="badge" v-if="post.isCertified || post.certified">
							<text>已认证</text>
						</view>
					</view>
					<text class="post-time">{{formatTime(post.createdAt) || post.time}}</text>
				</view>

				<!-- 标题 -->
				<text class="post-title">{{post.title}}</text>

				<!-- 正文 -->
				<text class="post-content">{{post.content}}</text>

				<!-- 图片区 -->
				<view class="post-images" v-if="post.images && post.images.length > 0">
					<image class="post-img" v-for="(img, iIdx) in post.images" :key="iIdx" :src="img" mode="aspectFill" />
				</view>

				<!-- 底部信息行 -->
				<view class="post-footer">
					<view class="footer-left">
						<view class="post-tag">
							<text>{{post.categoryName || post.tagLabel}}</text>
						</view>
						<text class="post-price" v-if="post.price">{{post.price}}</text>
					</view>
					<view class="footer-right">
						<view class="footer-icon" v-if="post.contactPhone">
							<view class="iconfont icon-dianhua icon-text"></view>
						</view>
						<view class="footer-icon">
							<view class="iconfont icon-dianzan icon-text"></view>
							<text class="icon-num">{{post.likes || 0}}</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 悬浮菜单 -->
		<view class="fab-menu" :class="{ open: menuOpen }">
			<view class="fab-btn" @tap="toggleMenu">
				<text>+</text>
			</view>
			<view class="fab-options" v-if="menuOpen">
				<view class="fab-option" @tap="onPublish">
					<text>发布</text>
				</view>
				<view class="fab-option" @tap="onManage">
					<text>管理</text>
				</view>
			</view>
		</view>
		<view class="fab-mask" v-if="menuOpen" @tap="toggleMenu"></view>
	</view>
</template>

<script>
import { getPostList } from '@/utils/neighbor-api.js'
import { requireLogin } from '@/utils/auth.js'

export default {
	data() {
		return {
			menuOpen: false,
			currentTag: 0,
			tags: ['全部', '邻里互助', '手艺服务', '相约同行', '相亲交友', '二手闲置'],
			searchKeyword: '',
			posts: [],
			loading: false,
			refreshing: false
		}
	},
	onLoad() {
		this.loadPosts()
	},
	methods: {
			switchTag(index) {
				this.currentTag = index
				this.resetAndLoad()
			},
			onSearch() {
				if (!this.searchKeyword.trim()) {
					uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
					return
				}
				this.resetAndLoad()
			},
			clearSearch() {
				this.searchKeyword = ''
				this.resetAndLoad()
			},
			toggleMenu() {
				this.menuOpen = !this.menuOpen
			},
			async onPublish() {
				this.menuOpen = false
				if (!await requireLogin()) return
				const status = uni.getStorageSync('cert_status') || 'none'
				if (status !== 'certified') {
					uni.showModal({
						title: '需要认证',
						content: '发布帖子需要先完成住户认证，认证通过后可享受社区全部功能。',
						confirmText: '去认证',
						success: (res) => {
							if (res.confirm) {
								uni.navigateTo({ url: '/pages/neighbor/cert' })
							}
						}
					})
					return
				}
				uni.navigateTo({ url: '/pages/neighbor/publish' })
			},
			onManage() {
				this.menuOpen = false
				uni.navigateTo({ url: '/pages/neighbor/manage' })
			},
			getDisplayId(authorId) {
				if (!authorId) return '游客'
				// 如果是长ID，截取后6位显示
				if (authorId.length > 8) {
					return authorId.slice(-6)
				}
				return authorId
			},
			goPostDetail(post) {
				const id = post._id || post.id
				uni.navigateTo({ url: '/pages/neighbor/detail?id=' + id + '&title=' + encodeURIComponent(post.title || post.content.substring(0,20)) + '&author=' + encodeURIComponent(post.authorName || post.username) + '&time=' + encodeURIComponent(post.createdAt || post.time) })
			},
			onSearch(e) {
				this.searchKeyword = e.detail.value || ''
				this.resetAndLoad()
			},
			resetAndLoad() {
				this.posts = []
				this.loadPosts()
			},
			async loadPosts() {
				if (this.loading) return
				this.loading = true

				try {
					const categoryIndex = this.currentTag === 0 ? '' : this.currentTag
					const res = await getPostList({
						category: categoryIndex,
						keyword: this.searchKeyword,
						status: 1
					})
					this.posts = res.data || []
				} catch (e) {
					// 使用本地存储 + Mock 数据
					let localPosts = uni.getStorageSync('local_posts') || []
					if (this.currentTag > 0) {
						localPosts = localPosts.filter(p => p.categoryIndex === this.currentTag)
					}
					if (this.searchKeyword) {
						localPosts = localPosts.filter(p =>
							p.title.includes(this.searchKeyword) ||
							p.content.includes(this.searchKeyword)
						)
					}

					if (localPosts.length === 0) {
						localPosts = [
							{
								id: 1,
								username: '张师傅',
								badge: '认证手艺',
								time: '2小时前',
								content: '专业水电维修 15年经验',
								tagLabel: '水电维修',
								price: '¥80起',
								phoneCount: 12,
								likeCount: 12,
								joinCount: '',
								commentCount: '',
								images: [1, 2, 3]
							},
							{
								id: 2,
								username: '和业小王',
								badge: '',
								time: '5小时前',
								content: '周六早起徒步象山 周末约起来',
								tagLabel: '徒步',
								price: '',
								phoneCount: '',
								likeCount: 23,
								joinCount: '6人已报名',
								commentCount: 8,
								images: []
							},
							{
								id: 3,
								username: '李姐',
								badge: '认证邻居',
								time: '昨天',
								content: '谁家有多余的葱？我拿鸡蛋换',
								tagLabel: '互助',
								price: '',
								phoneCount: '',
								likeCount: 9,
								joinCount: '',
								commentCount: 5,
								images: []
							}
						]
					}
					this.posts = localPosts
				}
				this.loading = false
			},
			async onRefresh() {
				this.refreshing = true
				await this.loadPosts()
				this.refreshing = false
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
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #FFFFFF;
}

/* 搜索栏 */
.header {
	padding: 16rpx 24rpx;
}

.search-bar {
	display: flex;
	align-items: center;
	height: 80rpx;
	background-color: #F5F5F5;
	border: 2rpx solid #E0E0E0;
	border-radius: 16rpx;
	padding: 0 24rpx;
}

.search-icon-line {
	width: 24rpx;
	height: 24rpx;
	border: 3rpx solid #999999;
	border-radius: 50%;
	position: relative;
	margin-right: 12rpx;
}

.search-icon-line::after {
	content: '';
	position: absolute;
	right: -8rpx;
	bottom: -8rpx;
	width: 12rpx;
	height: 3rpx;
	background-color: #999999;
	transform: rotate(45deg);
	border-radius: 2rpx;
}

.search-placeholder {
	font-size: 28rpx;
	color: #999999;
}

.search-input {
	flex: 1;
	font-size: 28rpx;
	color: #333333;
	height: 60rpx;
	line-height: 60rpx;
}

.search-clear {
	width: 40rpx;
	height: 40rpx;
	line-height: 36rpx;
	text-align: center;
	font-size: 32rpx;
	color: #999999;
	background-color: #E0E0E0;
	border-radius: 50%;
	margin-left: 8rpx;
}

/* 邻里横幅 */
.banner-image {
	margin: 0 24rpx 20rpx;
	width: calc(100% - 48rpx);
	height: 300rpx;
	border-radius: 16rpx;
}

/* 分类标签栏 */
.tag-bar {
	white-space: nowrap;
	padding: 0 24rpx;
	margin-bottom: 20rpx;
}

.tag-list {
	display: flex;
}

.tag-item {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 64rpx;
	padding: 8rpx 24rpx;
	border-radius: 40rpx;
	margin-right: 12rpx;
	background-color: #FFFFFF;
	border: 2rpx solid #E0E0E0;
}

.tag-item text {
	font-size: 22rpx;
	font-weight: 400;
	color: #666666;
}

.tag-item.active {
	background-color: #4F9A42;
	border-color: #4F9A42;
}

.tag-item.active text {
	font-weight: 600;
	color: #FFFFFF;
}

/* 帖子列表 */
.post-list {
	flex: 1;
	padding: 0 24rpx;
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

.post-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
	margin-top: 16rpx;
	display: block;
}

.post-img {
	width: 140rpx;
	height: 140rpx;
	border-radius: 8rpx;
	margin-right: 8rpx;
}

/* 帖子卡片 */
.post-card {
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 20rpx;
	border: 1rpx solid #F0F0F0;
}

.post-header {
	display: flex;
	align-items: center;
}

/* 帖子头部 */
.post-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.user-id-wrap {
	display: flex;
	align-items: center;
}

.user-id {
	font-size: 26rpx;
	font-weight: 600;
	color: #333333;
}

.badge {
	background-color: #E8F5E9;
	padding: 2rpx 8rpx;
	border-radius: 4rpx;
	margin-left: 12rpx;
}

.badge text {
	font-size: 18rpx;
	font-weight: 600;
	color: #4F9A42;
}

.post-time {
	font-size: 20rpx;
	font-weight: 400;
	color: #999999;
	flex-shrink: 0;
}

/* 正文 */
.post-content {
	font-size: 24rpx;
	font-weight: 400;
	color: #333333;
	line-height: 40rpx;
	margin-top: 16rpx;
}

/* 图片区 */
.post-images {
	display: flex;
	margin-top: 16rpx;
}

.img-placeholder {
	width: 140rpx;
	height: 140rpx;
	border-radius: 8rpx;
	background-color: #F5F5F5;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 16rpx;
}

.img-placeholder text {
	font-size: 24rpx;
	color: #CCCCCC;
}

/* 底部信息行 */
.post-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 20rpx;
}

.footer-left {
	display: flex;
	align-items: center;
}

.post-tag {
	background-color: #E8F5E9;
	padding: 2rpx 8rpx;
	border-radius: 4rpx;
	margin-right: 12rpx;
}

.post-tag text {
	font-size: 18rpx;
	font-weight: 600;
	color: #4F9A42;
}

.post-price {
	font-size: 22rpx;
	font-weight: 600;
	color: #4F9A42;
	margin-right: 12rpx;
}

.post-join {
	font-size: 28rpx;
	color: #666666;
}

.footer-right {
	display: flex;
	align-items: center;
}

.footer-icon {
	display: flex;
	align-items: center;
	margin-left: 20rpx;
}

.icon-text {
	font-size: 28rpx;
	margin-right: 6rpx;
}

.icon-num {
	font-size: 28rpx;
	color: #666666;
}

/* 悬浮菜单 */
.fab-menu {
	position: fixed;
	right: 40rpx;
	bottom: 40rpx;
	z-index: 101;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.fab-btn {
	width: 112rpx;
	height: 112rpx;
	background-color: #4f9a42;
	border-radius: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(79, 154, 66, 0.3);
	transition: transform 0.3s;
}

.fab-menu.open .fab-btn {
	transform: rotate(45deg);
}

.fab-btn text {
	font-size: 48rpx;
	color: #FFFFFF;
	font-weight: 300;
}

.fab-options {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	margin-bottom: 24rpx;
}

.fab-option {
	background-color: #FFFFFF;
	border-radius: 48rpx;
	padding: 20rpx 32rpx;
	margin-top: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.fab-option text {
	font-size: 28rpx;
	color: #333333;
	font-weight: 500;
}

.fab-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.3);
	z-index: 100;
}
</style>