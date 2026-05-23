<template>
	<view class="page">
		<!-- 顶部搜索栏 -->
		<view class="header">
			<view class="search-bar">
				<view class="search-icon-line"></view>
				<text class="search-placeholder">搜索邻里帖子</text>
			</view>
		</view>

		<!-- 邻里插图占位 -->
		<view class="banner-placeholder">
			<text>邻里插图占位</text>
		</view>

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
		<scroll-view class="post-list" scroll-y="true">
			<view class="post-card" v-for="post in posts" :key="post.id">
				<!-- 帖子头部：头像+用户名+标识+时间 -->
				<view class="post-header">
					<view class="avatar"></view>
					<view class="user-info">
						<view class="user-row">
							<text class="username">{{post.username}}</text>
							<view class="badge" v-if="post.badge">
								<text>{{post.badge}}</text>
							</view>
						</view>
					</view>
					<text class="post-time">{{post.time}}</text>
				</view>

				<!-- 正文 -->
				<text class="post-content">{{post.content}}</text>

				<!-- 图片区（仅手艺服务类） -->
				<view class="post-images" v-if="post.images && post.images.length > 0">
					<view class="img-placeholder" v-for="(img, iIdx) in post.images" :key="iIdx">
						<text>图</text>
					</view>
				</view>

				<!-- 底部信息行 -->
				<view class="post-footer">
					<view class="footer-left">
						<view class="post-tag">
							<text>{{post.tagLabel}}</text>
						</view>
						<text class="post-price" v-if="post.price">{{post.price}}</text>
						<text class="post-join" v-if="post.joinCount">{{post.joinCount}}</text>
					</view>
					<view class="footer-right">
						<view class="footer-icon" v-if="post.phoneCount">
							<text class="iconfont icon-dianhua icon-text"></text>
							<text class="icon-num">{{post.phoneCount}}</text>
						</view>
						<view class="footer-icon" v-if="post.commentCount">
							<text class="iconfont icon-pinglun icon-text"></text>
							<text class="icon-num">{{post.commentCount}}评论</text>
						</view>
						<view class="footer-icon">
							<text class="iconfont icon-dianzan icon-text"></text>
							<text class="icon-num">{{post.likeCount}}</text>
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
	export default {
		data() {
			return {
				menuOpen: false,
				currentTag: 0,
				tags: ['全部', '邻里互助', '手艺服务', '相约同行', '相亲交友', '二手闲置'],
				posts: [
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
		},
		methods: {
			switchTag(index) {
				this.currentTag = index
			},
			toggleMenu() {
				this.menuOpen = !this.menuOpen
			},
			onPublish() {
				this.menuOpen = false
				uni.showToast({ title: '发布功能开发中', icon: 'none' })
			},
			onManage() {
				this.menuOpen = false
				uni.showToast({ title: '管理功能开发中', icon: 'none' })
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

/* 邻里插图占位 */
.banner-placeholder {
	margin: 0 24rpx 20rpx;
	height: 300rpx;
	background-color: #E0E0E0;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.banner-placeholder text {
	font-size: 28rpx;
	color: #999999;
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
	padding: 0 32rpx;
	border-radius: 32rpx;
	margin-right: 16rpx;
	background-color: #FFFFFF;
	border: 2rpx solid #E0E0E0;
}

.tag-item text {
	font-size: 28rpx;
	font-weight: 400;
	color: #666666;
}

.tag-item.active {
	background-color: #4f9a42;
	border-color: #4f9a42;
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

.avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background-color: #E8F5E9;
	flex-shrink: 0;
}

.user-info {
	flex: 1;
	margin-left: 16rpx;
}

.user-row {
	display: flex;
	align-items: center;
}

.username {
	font-size: 32rpx;
	font-weight: 600;
	color: #333333;
}

.badge {
	background-color: #E8F5E9;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	margin-left: 12rpx;
}

.badge text {
	font-size: 24rpx;
	font-weight: 600;
	color: #4f9a42;
}

.post-time {
	font-size: 24rpx;
	color: #999999;
	flex-shrink: 0;
}

/* 正文 */
.post-content {
	font-size: 28rpx;
	font-weight: 400;
	color: #333333;
	line-height: 44rpx;
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
	padding: 4rpx 16rpx;
	border-radius: 8rpx;
	margin-right: 12rpx;
}

.post-tag text {
	font-size: 24rpx;
	color: #4f9a42;
}

.post-price {
	font-size: 28rpx;
	font-weight: 600;
	color: #4f9a42;
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