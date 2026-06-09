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

			<view class="post-card" v-for="post in posts" :key="post._id || post.id">
				<!-- 头部:头像 + 昵称/时间(纵向) -->
				<view class="post-header">
					<view class="avatar">
						<image
							v-if="post.authorAvatar"
							class="avatar-img"
							:src="post.authorAvatar"
							mode="aspectFill"
						/>
						<text v-else>{{ getAvatarChar(post.userId || post.authorId) }}</text>
					</view>
					<view class="header-info">
						<view class="post-name-row">
							<text class="post-name">{{ post.authorNickname || getDisplayId(post.userId || post.authorId) }}</text>
							<view class="badge" v-if="post.isCertified || post.certified">
								<text>邻居认证</text>
							</view>
						</view>
						<text class="post-time">{{ formatTime(post.createdAt) }}</text>
					</view>
				</view>

				<!-- 正文 -->
				<view class="post-body">
					<text class="post-text">{{ post.content }}</text>
				</view>

				<!-- 9 宫格图片(过滤掉 http://tmp/ 临时路径,旧帖过期图直接不显示) -->
				<view
					class="post-grid"
					:class="gridClass(validImages(post.images))"
					v-if="validImages(post.images).length > 0"
				>
					<image
						class="grid-img"
						v-for="(img, iIdx) in validImages(post.images).slice(0, 6)"
						:key="iIdx"
						:src="img"
						mode="aspectFill"
						@tap.stop="previewImage(validImages(post.images), iIdx)"
					/>
				</view>

				<!-- 底部互动:CSS 画的爱心 + 聊天框 -->
				<view class="post-actions">
					<view class="action-item" :class="{ active: isLiked(post) }" @tap.stop="toggleLike(post)">
						<view class="icon-heart" :class="{ liked: isLiked(post) }"></view>
						<text class="action-num">{{ post.likeCount !== undefined ? post.likeCount : (post.likes || 0) }}</text>
					</view>
					<view class="action-item" @tap.stop="toggleComments(post)">
						<view class="icon-chat"></view>
						<text class="action-num">{{ post.commentCount !== undefined ? post.commentCount : (post.comments || 0) }}</text>
					</view>
				</view>

				<!-- 评论区(展开时) -->
				<view class="comment-section" v-if="post.expanded">
					<!-- 评论列表 -->
					<view class="comment-list" v-if="post.commentsList && post.commentsList.length > 0">
						<view class="comment-item" v-for="c in post.commentsList" :key="c._id">
							<text class="comment-name">{{ c.authorNickname || c.authorName || '邻居' }}:</text>
							<text class="comment-content">{{ c.content }}</text>
						</view>
					</view>
					<view class="comment-empty" v-else-if="!post.loadingComments">
						<text>暂无评论,抢沙发~</text>
					</view>

					<!-- 输入框 + 发布 -->
					<view class="comment-input-row">
						<input
							class="comment-input"
							v-model="commentDrafts[post._id || post.id]"
							placeholder="说点什么..."
							placeholder-class="comment-placeholder"
							confirm-type="send"
							@confirm="submitComment(post)"
						/>
						<view
							class="comment-submit"
							:class="{ disabled: commentSubmitting[post._id || post.id] }"
							@tap="submitComment(post)"
						>
							<text>发表</text>
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
import { getPostList, toggleLike as apiToggleLike, getComments as apiGetComments, createComment as apiCreateComment, loadCachedCategories, refreshCategories } from '@/utils/neighbor-api.js'
import { requireLogin, getUserId, isLoggedIn } from '@/utils/auth.js'

export default {
	data() {
		return {
			menuOpen: false,
			currentTag: 0,
			tags: ['全部'],
			categories: [],
			searchKeyword: '',
			posts: [],
			loading: false,
			refreshing: false,
			commentDrafts: {},
			commentSubmitting: {}
		}
	},
	onShow() {
		this.loadCategories()
		this.loadPosts()
	},
	methods: {
		async loadCategories() {
			// 始终从云端拉(分类是 6 条小数据,缓存只会导致后台新增/删除后用户端看不到)
			let result
			try {
				result = await refreshCategories()
			} catch (e) {
				console.error('[neighbor] 拉分类抛错:', e)
				result = null
			}
			if (result === null) {
				// 云端调用失败 → 回退到本地缓存,再不行用兜底
				const cached = loadCachedCategories()
				if (cached && cached.length > 0) {
					this.applyCategories(cached)
				} else {
					this.applyCategories([
						{ index: 1, name: '邻里互助' },
						{ index: 2, name: '手艺服务' },
						{ index: 3, name: '相约同行' },
						{ index: 4, name: '相亲交友' },
						{ index: 5, name: '二手闲置' }
					])
				}
				uni.showToast({ title: '分类同步失败,使用本地', icon: 'none' })
			} else {
				this.applyCategories(result)
			}
		},
		applyCategories(list) {
			this.categories = list
			this.tags = ['全部', ...list.map(c => c.name)]
		},
		// 过滤掉 http://tmp/ 临时路径(旧帖发布时存的临时文件,几小时就过期,现在已不可用)
		validImages(images) {
			if (!images || !Array.isArray(images)) return []
			return images.filter(img => img && !String(img).startsWith('http://tmp/'))
		},
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
			getAvatarChar(authorId) {
				if (!authorId) return '邻'
				return authorId.slice(-1).toUpperCase()
			},
			gridClass(count) {
				if (!count) return ''
				if (count >= 6) return 'count-6'
				return 'count-' + count
			},
			previewImage(images, idx) {
				uni.previewImage({ urls: images.slice(0, 6), current: idx })
			},
			goPostDetail(post) {
				// 已停用:点赞/评论直接触发,不再跳详情页
			},
			isLiked(post) {
				const uid = getUserId()
				return uid && post.likedUserIds && post.likedUserIds.indexOf(uid) >= 0
			},
			async toggleLike(post) {
				if (!isLoggedIn()) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}
				const uid = getUserId()
				const postId = post._id || post.id
				// 乐观更新:立即翻转 UI 状态
				const wasLiked = this.isLiked(post)
				if (!post.likedUserIds) post.likedUserIds = []
				if (wasLiked) {
					post.likedUserIds = post.likedUserIds.filter(id => id !== uid)
					post.likeCount = (post.likeCount !== undefined ? post.likeCount : (post.likes || 0)) - 1
				} else {
					post.likedUserIds.push(uid)
					post.likeCount = (post.likeCount !== undefined ? post.likeCount : (post.likes || 0)) + 1
				}
				try {
					const res = await apiToggleLike(postId, uid)
					// 用云端返回值校正
					if (res && res.data && res.data.likeCount !== undefined) {
						post.likeCount = res.data.likeCount
					}
				} catch (e) {
					uni.showToast({ title: '点赞失败,请重试', icon: 'none' })
					// 回滚
					if (wasLiked) {
						post.likedUserIds.push(uid)
						post.likeCount = (post.likeCount || 0) + 1
					} else {
						post.likedUserIds = post.likedUserIds.filter(id => id !== uid)
						post.likeCount = Math.max(0, (post.likeCount || 0) - 1)
					}
				}
			},
			async toggleComments(post) {
				const postId = post._id || post.id
				post.expanded = !post.expanded
				if (post.expanded && !post.commentsLoaded) {
					await this.loadComments(post)
				}
			},
			async loadComments(post) {
				const postId = post._id || post.id
				post.loadingComments = true
				try {
					const res = await apiGetComments(postId, 1, 50)
					post.commentsList = (res.data && res.data.list) || res.data || []
				} catch (e) {
					post.commentsList = []
					uni.showToast({ title: '评论加载失败', icon: 'none' })
				}
				post.loadingComments = false
				post.commentsLoaded = true
			},
			async submitComment(post) {
				if (!isLoggedIn()) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					return
				}
				const postId = post._id || post.id
				const content = (this.commentDrafts[postId] || '').trim()
				if (!content) {
					uni.showToast({ title: '请输入评论内容', icon: 'none' })
					return
				}
				if (this.commentSubmitting[postId]) return
				this.commentSubmitting[postId] = true

				const uid = getUserId()
				const userInfo = uni.getStorageSync('user_info') || {}
				const authorName = userInfo.nickname || userInfo.nickName || '邻居'

				try {
					const res = await apiCreateComment(postId, uid, content, authorName)
					// 乐观追加
					if (!post.commentsList) post.commentsList = []
					post.commentsList.push({
						_id: (res.data && res.data._id) || ('local_' + Date.now()),
						content,
						authorName,
						authorNickname: authorName,
						authorAvatar: userInfo.avatar || '',
						createdAt: new Date().toISOString()
					})
					post.commentCount = (post.commentCount !== undefined ? post.commentCount : (post.comments || 0)) + 1
					this.commentDrafts[postId] = ''
					uni.showToast({ title: '发表成功', icon: 'success' })
				} catch (e) {
					uni.showToast({ title: '发表失败,请重试', icon: 'none' })
				}
				this.commentSubmitting[postId] = false
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
					// currentTag 是 tags 数组下标(0=全部,1=第一个分类,...)
					// 实际分类在 this.categories[currentTag-1],要拿它的 name 字段给云端过滤
					const categoryName = (this.currentTag === 0)
						? ''
						: (this.categories[this.currentTag - 1] && this.categories[this.currentTag - 1].name) || ''
					const res = await getPostList({
						categoryName,
						keyword: this.searchKeyword,
						status: 1
					})
					this.posts = res.data || []
				} catch (e) {
					// 使用本地存储 + Mock 数据
					let localPosts = uni.getStorageSync('local_posts') || []
					if (this.currentTag > 0) {
						const catName = (this.categories[this.currentTag - 1] && this.categories[this.currentTag - 1].name) || ''
						localPosts = localPosts.filter(p => p.categoryName === catName)
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
				await Promise.all([this.loadCategories(), this.loadPosts()])
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
	width: 100%;
	background-color: #FFFFFF;
	overflow-x: hidden;
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
	margin: 0 0 20rpx;
	width: 100%;
	height: 300rpx;
	border-radius: 0;
}

/* 分类标签栏 */
.tag-bar {
	white-space: nowrap;
	margin-bottom: 20rpx;
}

.tag-list {
	display: inline-flex;
	white-space: nowrap;
	padding: 0 24rpx;
	box-sizing: border-box;
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
	width: 100%;
	box-sizing: border-box;
	padding: 0 24rpx;
	overflow-x: hidden;
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

/* 帖子卡片 - 微信朋友圈样式 */
.post-card {
	background-color: #FFFFFF;
	padding: 24rpx 24rpx 20rpx;
	border-bottom: 1rpx solid #F0F0F0;
	box-sizing: border-box;
	width: 100%;
	max-width: 100%;
	overflow: hidden;
}

.post-header {
	display: flex;
	align-items: flex-start;
	margin-bottom: 16rpx;
}

.avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background-color: #4F9A42;
	color: #FFFFFF;
	font-size: 32rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 20rpx;
}

.header-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	padding-top: 4rpx;
}

.avatar-img {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: block;
}

.post-name-row {
	display: flex;
	align-items: center;
}

.post-name {
	font-size: 28rpx;
	font-weight: 600;
	color: #576B95;
}

.badge {
	background-color: #FFEEEE;
	border: 2rpx solid #E63946;
	padding: 2rpx 8rpx;
	border-radius: 4rpx;
	margin-left: 12rpx;
	display: inline-flex;
	align-items: center;
}

.badge text {
	font-size: 20rpx;
	color: #E63946;
	font-weight: 600;
}

.post-time {
	font-size: 22rpx;
	color: #B2B2B2;
	margin-top: 6rpx;
}

.post-body {
	margin-bottom: 16rpx;
}

.post-text {
	font-size: 30rpx;
	color: #111111;
	line-height: 1.6;
	word-break: break-all;
	overflow-wrap: break-word;
}

/* 朋友圈图片布局(6 种) */
.post-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 6rpx;
	margin-bottom: 16rpx;
	max-width: 500rpx;
	align-self: flex-start;
}

/* 默认 3 列,3 张 / 6 张用 */
.grid-img {
	width: calc((100% - 12rpx) / 3);
	height: calc((100% - 12rpx) / 3);
	aspect-ratio: 1;
	background-color: #F5F5F5;
	border-radius: 4rpx;
	box-sizing: border-box;
}

/* 1 张图: 1:1 正方形 */
.post-grid.count-1 .grid-img {
	width: 240rpx;
	height: 240rpx;
	border-radius: 6rpx;
}

/* 2 张图: 2 列正方形 */
.post-grid.count-2 .grid-img {
	width: calc((100% - 6rpx) / 2);
	height: calc((100% - 6rpx) / 2);
}

/* 3 张图: 继承默认 3 列 */

/* 4 张图: 2x2 九宫格 */
.post-grid.count-4 .grid-img {
	width: calc((100% - 6rpx) / 2);
	height: calc((100% - 6rpx) / 2);
}

/* 5 张图: 3+2 两行(前 3 张 3 列,后 2 张 2 列) */
.post-grid.count-5 .grid-img:nth-child(n+4) {
	width: calc((100% - 6rpx) / 2);
	height: calc((100% - 6rpx) / 2);
}

/* 6 张图: 继承默认 3 列(自然形成 3x2) */

.post-actions {
	display: flex;
	align-items: center;
	gap: 40rpx;
	padding-top: 4rpx;
}

.action-item {
	display: flex;
	align-items: center;
}

/* CSS 爱心 */
.icon-heart {
	width: 32rpx;
	height: 28rpx;
	position: relative;
	display: inline-block;
	margin-right: 8rpx;
}

.icon-heart::before,
.icon-heart::after {
	content: '';
	position: absolute;
	top: 0;
	width: 18rpx;
	height: 26rpx;
	background: #576B95;
	border-radius: 18rpx 18rpx 0 0;
}

.icon-heart::before {
	left: 14rpx;
	transform: rotate(-45deg);
	transform-origin: 0 100%;
}

.icon-heart::after {
	right: 14rpx;
	transform: rotate(45deg);
	transform-origin: 100% 100%;
}

/* CSS 聊天框 */
.icon-chat {
	width: 32rpx;
	height: 28rpx;
	position: relative;
	display: inline-block;
	margin-right: 8rpx;
}

.icon-chat::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	width: 30rpx;
	height: 22rpx;
	border: 2rpx solid #576B95;
	border-radius: 6rpx;
	background: transparent;
	box-sizing: border-box;
}

.icon-chat::after {
	content: '';
	position: absolute;
	bottom: 2rpx;
	left: 4rpx;
	width: 8rpx;
	height: 8rpx;
	border-right: 2rpx solid #576B95;
	border-bottom: 2rpx solid #576B95;
	transform: rotate(45deg);
}

.action-num {
	font-size: 26rpx;
	color: #576B95;
}

/* 评论区(展开) */
.comment-section {
	margin-top: 16rpx;
	padding: 16rpx;
	background-color: #F7F7F7;
	border-radius: 8rpx;
}

.comment-list {
	margin-bottom: 12rpx;
}

.comment-item {
	font-size: 26rpx;
	color: #333;
	line-height: 1.6;
	margin-bottom: 8rpx;
	word-break: break-all;
	overflow-wrap: break-word;
}

.comment-name {
	color: #576B95;
	font-weight: 500;
}

.comment-content {
	color: #333;
}

.comment-empty {
	font-size: 24rpx;
	color: #999;
	text-align: center;
	padding: 16rpx 0;
}

.comment-input-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 8rpx;
}

.comment-input {
	flex: 1;
	height: 64rpx;
	background-color: #FFFFFF;
	border: 2rpx solid #E0E0E0;
	border-radius: 32rpx;
	padding: 0 20rpx;
	font-size: 26rpx;
	color: #333;
}

.comment-placeholder {
	color: #BBB;
	font-size: 26rpx;
}

.comment-submit {
	padding: 0 24rpx;
	height: 64rpx;
	background-color: #4F9A42;
	border-radius: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.comment-submit.disabled {
	opacity: 0.5;
}

.comment-submit text {
	font-size: 26rpx;
	color: #FFFFFF;
	font-weight: 500;
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