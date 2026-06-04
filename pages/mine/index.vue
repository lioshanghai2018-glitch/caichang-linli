<template>
	<scroll-view class="page" scroll-y="true">
		<!-- 顶部用户信息区 -->
		<view class="user-header">
			<view class="user-info" @tap="onHeaderTap">
				<!-- 已登录：真实头像/昵称/手机号 -->
				<template v-if="isLogin">
					<image v-if="avatarUrl" class="avatar-real" :src="avatarUrl" mode="aspectFill" @error="avatarUrl = ''" />
					<view v-else class="avatar-placeholder">
						<text class="avatar-plus">+</text>
					</view>
					<view class="user-text">
						<view class="user-name-row">
							<text class="user-name">{{ userInfo.nickname ? 'Hi,' + userInfo.nickname : 'Hi,亲爱的邻居' }}</text>
							<view class="vip-tag"><text>{{ currentLevel }}</text></view>
						</view>
						<text class="user-phone">{{ maskedPhone || '未绑定手机号' }}</text>
						<text class="user-subtitle">源头直采·新鲜到家</text>
					</view>
				</template>
				<!-- 未登录：点击登录 -->
				<template v-else>
					<view class="avatar-placeholder">
						<text class="avatar-plus">+</text>
					</view>
					<view class="user-text">
						<view class="user-name-row">
							<text class="user-name login-tip">点击登录</text>
						</view>
						<text class="user-phone">登录后享受更多服务</text>
						<text class="user-subtitle">微信一键登录</text>
					</view>
				</template>
			</view>
			<!-- 右上角 -->
			<view class="header-right">
				<image class="avatar-img" src="/static/images/萝卜仔2.png" mode="aspectFill"></image>
			</view>
		</view>

		<!-- 会员中心卡片 -->
		<view class="vip-card">
			<image class="member-decor" src="/static/images/member-decor.png" mode="aspectFill" />
			<view class="member-left">
				<text class="vip-title">大研菜场会员</text>
				<text class="vip-subtitle">新鲜生活·专属特权</text>
				<view class="vip-btn"><text>会员中心</text></view>
			</view>
			<view class="member-right">
				<view class="growth-label-row">
					<text class="growth-label">成长值</text>
					<view class="icon-question"></view>
				</view>
				<view class="growth-value-row">
					<text class="growth-value">{{ currentGrowth }}</text>
					<text class="growth-denom">/ {{ nextLevelGrowth }}</text>
				</view>
				<view class="progress-bar">
					<view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
				</view>
				<text class="upgrade-tip">再积{{ pointsNeeded }}分升级{{ nextLevel }}</text>
			</view>
		</view>

		<!-- 功能入口网格 -->
		<view class="entry-grid">
			<!-- 我的订单 -->
			<view class="entry-item" @tap="goOrder">
				<view class="entry-icon-wrap">
					<view class="iconfont icon-wodedingdan"></view>
					<view class="entry-badge"><text>3</text></view>
				</view>
				<text class="entry-title">我的订单</text>
				<text class="entry-subtitle">查看订单</text>
			</view>
			<!-- 收货地址 -->
			<view class="entry-item" @tap="goAddress">
				<view class="entry-icon-wrap">
					<view class="iconfont icon-shouhuodizhi"></view>
				</view>
				<text class="entry-title">收货地址</text>
				<text class="entry-subtitle">管理地址</text>
			</view>
			<!-- 优惠券 -->
			<view class="entry-item" @tap="goCoupon">
				<view class="entry-icon-wrap">
					<view class="iconfont icon-youhuiquan"></view>
				</view>
				<text class="entry-title">优惠券</text>
				<text class="entry-subtitle">6张可用</text>
			</view>
			<!-- 客服中心 -->
			<view class="entry-item" @tap="goService">
				<view class="entry-icon-wrap">
					<view class="iconfont icon-kefuzhongxin"></view>
				</view>
				<text class="entry-title">客服中心</text>
				<text class="entry-subtitle">贴心服务</text>
			</view>
		</view>

		<!-- 功能选项列表 -->
		<view class="option-list">
			<!-- 邻里社区 -->
			<view class="option-item" @tap="goNeighbor">
				<view class="iconfont icon-linlishequ"></view>
				<text class="option-text">邻里社区</text>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 浏览记录 -->
			<view class="option-item" @tap="goHistory">
				<view class="iconfont icon-liulanjilu"></view>
				<text class="option-text">浏览记录</text>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 邀请好友 -->
			<view class="option-item" @tap="goInvite">
				<view class="iconfont icon-yaoqinghaoyou"></view>
				<text class="option-text">邀请好友</text>
				<view class="option-tag"><text>领优惠券</text></view>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 关于我们 -->
			<view class="option-item" @tap="goAbout">
				<view class="iconfont icon-guanyuwomen"></view>
				<text class="option-text">关于我们</text>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 设置 -->
			<view class="option-item" @tap="goSettings">
				<view class="iconfont icon-shezhi"></view>
				<text class="option-text">设置</text>
				<view class="icon-arrow"></view>
			</view>
		</view>

	</scroll-view>
	<custom-tabbar :current="3" />
</template>

<script>
	import { isLoggedIn, requireLogin, getMyUserInfo } from '@/utils/auth.js'
	import { STORAGE_KEYS } from '@/utils/config.js'

	export default {
		data() {
			return {
				currentGrowth: 2350,
				nextLevelGrowth: 3000,
				currentLevel: 'V1',
				nextLevel: 'V2',
				isLogin: false,
				userInfo: {},
				avatarUrl: '',
				maskedPhone: '',
				defaultAvatar: 'https://img.icons8.com/color/96/user.png'
			}
		},
		computed: {
			progressPercent() {
				return Math.round((this.currentGrowth / this.nextLevelGrowth) * 100)
			},
			pointsNeeded() {
				return this.nextLevelGrowth - this.currentGrowth
			}
		},
		onShow() {
			this.loadUserInfo()
		},
		methods: {
			async loadUserInfo() {
				this.isLogin = isLoggedIn()
				if (!this.isLogin) {
					this.userInfo = {}
					this.avatarUrl = ''
					this.maskedPhone = ''
					return
				}
				// 优先从云端拉最新数据，绕开 storage 缓存不一致问题
				try {
					const fresh = await getMyUserInfo()
					if (fresh) this.userInfo = fresh
					else this.userInfo = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
				} catch (e) {
					this.userInfo = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
				}
				this.maskedPhone = this.maskPhone(this.userInfo.phone || uni.getStorageSync(STORAGE_KEYS.USER_PHONE))
				const rawAvatar = this.userInfo.avatar
				// 没头像 或 头像就是云函数初始化时的默认图 → 当作"无头像"，显示占位符
				if (!rawAvatar || rawAvatar === this.defaultAvatar) {
					this.avatarUrl = ''
				} else if (rawAvatar.startsWith('cloud://')) {
					try {
						const r = await uniCloud.getTempFileURL({ fileList: [rawAvatar] })
						this.avatarUrl = (r.fileList && r.fileList[0] && r.fileList[0].tempFileURL) || ''
					} catch (e) {
						this.avatarUrl = ''
					}
				} else {
					this.avatarUrl = rawAvatar
				}
			},
			maskPhone(phone) {
				if (!phone) return ''
				const s = String(phone)
				if (s.length < 11) return s
				return s.slice(0, 3) + ' **** ' + s.slice(7)
			},
			onHeaderTap() {
				if (!this.isLogin) {
					uni.navigateTo({ url: '/pages/login/index' })
					return
				}
				uni.navigateTo({ url: '/pages/settings/profile' })
			},
			async goOrder() {
				if (!await requireLogin()) return
				uni.switchTab({ url: '/pages/order/index' })
			},
			async goAddress() {
				if (!await requireLogin()) return
				uni.navigateTo({ url: '/pages/address/index' })
			},
			async goNeighbor() {
				if (!await requireLogin()) return
				uni.navigateTo({ url: '/pages/neighbor/index' })
			},
			async goCoupon() {
				if (!await requireLogin()) return
				uni.navigateTo({ url: '/pages/coupon/index' })
			},
			async goService() {
				if (!await requireLogin()) return
				uni.navigateTo({ url: '/pages/service/index' })
			},
			async goHistory() {
				if (!await requireLogin()) return
				uni.navigateTo({ url: '/pages/history/index' })
			},
			goInvite() {
				uni.showToast({ title: '邀请功能开发中', icon: 'none' })
			},
			goSettings() {
				uni.navigateTo({ url: '/pages/settings/index' })
			}
		}
	}
</script>

<style>
.page {
	height: 100vh;
	background-color: #FFFFFF;
}

/* ========== 顶部用户信息区 ========== */
.user-header {
	display: flex;
	justify-content: space-between;
	padding: 32rpx;
	background-color: #FFFFFF;
}

.user-info {
	display: flex;
	align-items: center;
}

.avatar-real {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background-color: #E8F5E9;
	flex-shrink: 0;
}

.avatar-placeholder {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background-color: #E8F5E9;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.avatar-plus {
	font-size: 60rpx;
	color: #B0BEC5;
	font-weight: 200;
	line-height: 1;
}

.user-text {
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
}

.user-name-row {
	display: flex;
	align-items: center;
}

.user-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #333333;
}

.user-name.login-tip {
	color: #4F9A42;
}

.vip-tag {
	background-color: #4F9A42;
	font-size: 18rpx;
	font-weight: 600;
	color: #FFFFFF;
	border-radius: 8rpx;
	padding: 2rpx 10rpx;
	margin-left: 12rpx;
}

.user-phone {
	font-size: 22rpx;
	font-weight: 400;
	color: #666666;
	margin-top: 8rpx;
}

.user-subtitle {
	font-size: 20rpx;
	font-weight: 400;
	color: #666666;
	margin-top: 4rpx;
}

.header-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.avatar-img {
	width: 240rpx;
	height: 240rpx;
	border-radius: 16rpx;
}

/* ========== 会员中心卡片 ========== */
.vip-card {
	min-height: 210rpx;
	border-radius: 16rpx;
	margin: -30rpx 20rpx 20rpx;
	overflow: hidden;
	position: relative;
	background: linear-gradient(135deg, #67A961, #3A7A42);
}

.member-decor {
	position: absolute;
	right: 0;
	bottom: 0;
	width: 60%;
	height: 100%;
	opacity: 0.1;
	z-index: 0;
}

.member-left, .member-right {
	position: relative;
	z-index: 1;
}

.member-left {
	width: 55%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	position: absolute;
	left: 32rpx;
	top: 28rpx;
	bottom: 28rpx;
}

.vip-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #FFFFFF;
	letter-spacing: 4rpx;
	margin-top: -10rpx;
}

.vip-subtitle {
	font-size: 20rpx;
	font-weight: 400;
	color: rgba(255,255,255,0.7);
	margin-top: 16rpx;
}

.vip-btn {
	margin-top: 24rpx;
	display: inline-flex;
	align-items: center;
	border: 2rpx solid rgba(255,255,255,0.5);
	border-radius: 40rpx;
	padding: 6rpx 20rpx;
	width: fit-content;
}

.vip-btn text {
	font-size: 22rpx;
	color: rgba(255,255,255,0.9);
}

.member-right {
	width: 45%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-end;
	position: absolute;
	right: 32rpx;
	top: 28rpx;
	bottom: 28rpx;
}

.growth-label-row {
	display: flex;
	align-items: center;
}

.growth-label {
	font-size: 22rpx;
	color: rgba(255,255,255,0.7);
	margin-left: -20rpx;
}

.icon-question {
	width: 20rpx;
	height: 20rpx;
	border: 2rpx solid rgba(255,255,255,0.5);
	border-radius: 50%;
	margin-left: 8rpx;
	position: relative;
}

.icon-question::after {
	content: '?';
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	color: rgba(255,255,255,0.7);
	font-size: 12rpx;
}

.growth-value-row {
	display: flex;
	align-items: baseline;
	margin-top: 8rpx;
}

.growth-value {
	font-size: 44rpx;
	font-weight: 700;
	color: #FFFFFF;
}

.growth-denom {
	font-size: 20rpx;
	font-weight: 400;
	color: rgba(255,255,255,0.6);
	margin-left: 4rpx;
}

.progress-bar {
	height: 10rpx;
	width: 180rpx;
	background-color: rgba(255,255,255,0.2);
	border-radius: 5rpx;
	margin-top: 12rpx;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	width: 78%;
	background-color: #4F9A42;
	border-radius: 6rpx;
}

.upgrade-tip {
	font-size: 20rpx;
	color: #FFD700;
	margin-top: 8rpx;
}

/* ========== 功能入口网格 ========== */
.entry-grid {
	display: flex;
	padding: 32rpx;
	margin-top: -30rpx;
	background-color: #FFFFFF;
}

.entry-item {
	flex: 1;
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.entry-icon-wrap {
	position: relative;
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.entry-icon-wrap .iconfont {
	font-size: 64rpx;
	color: #4F9A42;
}

.entry-badge {
	position: absolute;
	top: -8rpx;
	right: -8rpx;
	background-color: #FF3333;
	font-size: 24rpx;
	color: #FFFFFF;
	border-radius: 24rpx;
	padding: 2rpx 8rpx;
	min-width: 24rpx;
	text-align: center;
}

.entry-title {
	font-size: 26rpx;
	font-weight: 600;
	color: #333333;
	margin-top: 12rpx;
}

.entry-subtitle {
	font-size: 20rpx;
	font-weight: 400;
	color: #666666;
	margin-top: 4rpx;
}

/* ========== 认证卡片 ========== */
.cert-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 20rpx;
	border-radius: 12rpx;
	margin-bottom: 8rpx;
}

.cert-card.none {
	background-color: #FFF8E1;
}

.cert-card.pending {
	background-color: #FFF8E1;
}

.cert-card.certified {
	background-color: #E8F5E9;
}

.cert-card.rejected {
	background-color: #FFEBEE;
}

.cert-left {
	display: flex;
	align-items: center;
}

.cert-icon-wrap {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 16rpx;
}

.cert-card.none .cert-icon-wrap {
	background-color: #FFF;
}

.cert-card.pending .cert-icon-wrap {
	background-color: #FFF;
}

.cert-card.certified .cert-icon-wrap {
	background-color: #FFF;
}

.cert-card.rejected .cert-icon-wrap {
	background-color: #FFF;
}

.cert-icon {
	font-size: 32rpx;
}

.cert-card.none .cert-icon {
	color: #999;
}

.cert-card.pending .cert-icon {
	color: #FFC107;
}

.cert-card.certified .cert-icon {
	color: #4F9A42;
}

.cert-card.rejected .cert-icon {
	color: #FF6B6B;
}

.cert-info {
	display: flex;
	flex-direction: column;
}

.cert-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
}

.cert-desc {
	font-size: 24rpx;
	color: #666;
	margin-top: 4rpx;
}

.cert-action {
	display: flex;
	align-items: center;
}

.cert-btn-text {
	font-size: 26rpx;
	color: #4F9A42;
	margin-right: 8rpx;
}

.cert-card.certified .cert-btn-text {
	color: #4F9A42;
}

/* ========== 功能选项列表 ========== */
.option-list {
	padding: 20rpx 32rpx;
	margin-top: -50rpx;
	background-color: #FFFFFF;
}

.option-item {
	height: 100rpx;
	display: flex;
	align-items: center;
	padding: 0 20rpx;
}

.option-item .iconfont {
	font-size: 40rpx;
	color: #4F9A42;
}

.option-text {
	font-size: 26rpx;
	font-weight: 400;
	color: #333333;
	flex: 1;
	margin-left: 16rpx;
}

.option-tag {
	background-color: #FFD700;
	font-size: 24rpx;
	color: #333333;
	border-radius: 8rpx;
	padding: 4rpx 12rpx;
	margin-left: 12rpx;
}

.icon-arrow {
	width: 16rpx;
	height: 16rpx;
	border-right: 3rpx solid #999999;
	border-bottom: 3rpx solid #999999;
	transform: rotate(-45deg);
}

.option-divider {
	height: 2rpx;
	background-color: #E0E0E0;
	margin: 0 32rpx;
}
</style>