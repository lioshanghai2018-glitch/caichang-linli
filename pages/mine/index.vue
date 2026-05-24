<template>
	<scroll-view class="page" scroll-y="true">
		<!-- 顶部用户信息区 -->
		<view class="user-header">
			<view class="user-info">
				<!-- 头像 -->
				<view class="avatar">
					<view class="avatar-head"></view>
					<view class="avatar-body"></view>
				</view>
				<!-- 文字区 -->
				<view class="user-text">
					<view class="user-name-row">
						<text class="user-name">Hi，亲爱的邻居</text>
						<view class="vip-tag"><text>{{ currentLevel }}</text></view>
					</view>
					<text class="user-phone">188 **** 5678</text>
					<text class="user-subtitle">源头直采·新鲜到家</text>
				</view>
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
			<view class="entry-item">
				<view class="entry-icon-wrap">
					<view class="iconfont icon-wodedingdan"></view>
					<view class="entry-badge"><text>3</text></view>
				</view>
				<text class="entry-title">我的订单</text>
				<text class="entry-subtitle">查看订单</text>
			</view>
			<!-- 收货地址 -->
			<view class="entry-item">
				<view class="entry-icon-wrap">
					<view class="iconfont icon-shouhuodizhi"></view>
				</view>
				<text class="entry-title">收货地址</text>
				<text class="entry-subtitle">管理地址</text>
			</view>
			<!-- 优惠券 -->
			<view class="entry-item">
				<view class="entry-icon-wrap">
					<view class="iconfont icon-youhuiquan"></view>
				</view>
				<text class="entry-title">优惠券</text>
				<text class="entry-subtitle">6张可用</text>
			</view>
			<!-- 客服中心 -->
			<view class="entry-item">
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
			<view class="option-item">
				<view class="iconfont icon-linlishequ"></view>
				<text class="option-text">邻里社区</text>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 浏览记录 -->
			<view class="option-item">
				<view class="iconfont icon-liulanjilu"></view>
				<text class="option-text">浏览记录</text>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 邀请好友 -->
			<view class="option-item">
				<view class="iconfont icon-yaoqinghaoyou"></view>
				<text class="option-text">邀请好友</text>
				<view class="option-tag"><text>领优惠券</text></view>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 关于我们 -->
			<view class="option-item">
				<view class="iconfont icon-guanyuwomen"></view>
				<text class="option-text">关于我们</text>
				<view class="icon-arrow"></view>
			</view>
			<view class="option-divider"></view>
			<!-- 设置 -->
			<view class="option-item">
				<view class="iconfont icon-shezhi"></view>
				<text class="option-text">设置</text>
				<view class="icon-arrow"></view>
			</view>
		</view>

		<!-- 蔬菜图占位区 -->
		<view class=" veggie-placeholder"><text>蔬菜图占位</text></view>
	</scroll-view>
	<custom-tabbar :current="3" />
</template>

<script>
	export default {
		data() {
			return {
				currentGrowth: 2350,
				nextLevelGrowth: 3000,
				currentLevel: 'V1',
				nextLevel: 'V2'
			}
		},
		computed: {
			progressPercent() {
				return Math.round((this.currentGrowth / this.nextLevelGrowth) * 100)
			},
			pointsNeeded() {
				return this.nextLevelGrowth - this.currentGrowth
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

.avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background-color: #E8F5E9;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.avatar-head {
	width: 48rpx;
	height: 48rpx;
	border: 3rpx solid #B0BEC5;
	border-radius: 50%;
}

.avatar-body {
	width: 60rpx;
	height: 30rpx;
	border: 3rpx solid #B0BEC5;
	border-top: none;
	border-radius: 0 0 30rpx 30rpx;
	margin-top: -6rpx;
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

/* ========== 蔬菜图占位区 ========== */
.veggie-placeholder {
	height: 300rpx;
	background-color: #E0E0E0;
	border-radius: 16rpx;
	margin: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.veggie-placeholder text {
	font-size: 28rpx;
	color: #999999;
}
</style>