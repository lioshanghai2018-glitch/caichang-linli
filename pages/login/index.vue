<template>
<view class="login-container">
	<!-- 顶部图片占位区 -->
	<view class="top-banner">
		<image class="banner-image" src="https://mp-ae9bd108-da40-4ae6-923b-c3007dedec12.cdn.bspapp.com/大研菜场_微信登录页.jpg" mode="aspectFill" />
	</view>

	<!-- 欢迎区 -->
	<view class="welcome-section">
		<text class="welcome-title">欢迎使用大研菜场</text>
		<text class="welcome-subtitle">微信一键登录,开启新鲜生活</text>
	</view>

	<!-- 登录操作区 -->
	<view class="action-section">
		<!-- #ifdef MP-WEIXIN -->
		<button class="btn-wechat-primary" :loading="wechatLoading" @tap="handleWeixinLogin">
			<text class="btn-text">微信一键登录</text>
		</button>
		<!-- #endif -->

		<!-- #ifdef H5 || APP-PLUS -->
		<view class="h5-app-content">
			<text class="test-hint">仅用于查看云端已有数据。开发期使用。</text>
			<view class="input-group">
				<text class="label">userId（可选）</text>
				<input class="input" v-model="testUserId" placeholder="留空自动生成" />
			</view>
			<button class="btn-sms-login" :loading="testLoading" @tap="handleTestLogin">进入测试模式</button>

			<!-- #ifdef APP-PLUS -->
			<view class="divider-with-text">
				<view class="divider-line"></view>
				<text class="divider-text">本机号码一键登录</text>
				<view class="divider-line"></view>
			</view>
			<button class="btn-oneclick" :loading="oneClickLoading" @tap="handleOneClick">本机号码一键登录</button>
			<!-- #endif -->
		</view>
		<!-- #endif -->
	</view>

	<!-- 底部协议 -->
	<view class="footer">
		<text>登录即表示您同意</text>
		<navigator url="/pages/agreement/agreement?type=user" class="link">《用户服务协议》</navigator>
		<text>和</text>
		<navigator url="/pages/agreement/agreement?type=privacy" class="link">《隐私政策》</navigator>
	</view>
</view>
</template>

<script>
// #ifdef H5 || APP-PLUS
import { loginAsTest, loginByUniverify } from '@/utils/auth.js'
// #endif
import { loginByWeixin } from '@/utils/auth.js'

export default {
	data() {
		return {
			wechatLoading: false,
			// #ifdef H5 || APP-PLUS
			testLoading: false,
			testUserId: '',
			oneClickLoading: false
			// #endif
		}
	},
	methods: {
		// #ifdef MP-WEIXIN
		async handleWeixinLogin() {
			this.wechatLoading = true
			try {
				const r = await uni.login({ provider: 'weixin' })
				if (!r || !r.code) throw new Error('未获取到 code，请重试')
				await loginByWeixin(r.code)
				uni.showToast({ title: '登录成功', icon: 'success' })
				setTimeout(() => {
					uni.reLaunch({ url: '/pages/index/index' })
				}, 600)
			} catch (e) {
				uni.showToast({ title: (e && (e.msg || e.message)) || '登录失败', icon: 'none', duration: 3000 })
			} finally {
				this.wechatLoading = false
			}
		},
		// #endif
		// #ifdef H5 || APP-PLUS
		async handleOneClick() {
			this.oneClickLoading = true
			try {
				await loginByUniverify()
				uni.showToast({ title: '登录成功', icon: 'success' })
				setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
			} catch (e) {
				uni.showToast({ title: e.msg || '一键登录失败', icon: 'none' })
			} finally {
				this.oneClickLoading = false
			}
		},
		handleTestLogin() {
			this.testLoading = true
			try {
				loginAsTest(this.testUserId)
				uni.showToast({ title: '已进入测试模式', icon: 'success' })
				setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
			} finally {
				this.testLoading = false
			}
		}
		// #endif
	}
}
</script>

<style>
.login-container {
	min-height: 100vh;
	background-color: #F5F1EB;
	display: flex;
	flex-direction: column;
}

/* ========== 顶部图片占位区 ========== */
.top-banner {
	width: 100%;
	height: 840rpx;
	overflow: hidden;
}

.banner-image {
	width: 100%;
	height: 100%;
	display: block;
}

/* ========== 欢迎区 ========== */
.welcome-section {
	background-color: #FFFFFF;
	padding: 50rpx 40rpx 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.welcome-title {
	font-size: 40rpx;
	font-weight: 700;
	color: #222222;
	margin-bottom: 16rpx;
}

.welcome-subtitle {
	font-size: 26rpx;
	color: #888888;
}

/* ========== 操作区 ========== */
.action-section {
	background-color: #FFFFFF;
	padding: 0 40rpx 40rpx;
	flex: 1;
}

/* 微信主按钮 */
.btn-wechat-primary {
	height: 96rpx;
	background-color: #1AAD19;
	border-radius: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 10rpx;
	border: none;
	padding: 0;
}

.btn-wechat-primary::after {
	border: none;
}

.btn-text {
	font-size: 32rpx;
	color: #FFFFFF;
	font-weight: 600;
	letter-spacing: 2rpx;
}

/* "或" 分隔线 */
.divider-with-text {
	display: flex;
	align-items: center;
	margin: 40rpx 0 30rpx;
}

.divider-line {
	flex: 1;
	height: 1rpx;
	background-color: #E0E0E0;
}

.divider-text {
	font-size: 24rpx;
	color: #999999;
	margin: 0 24rpx;
}

/* ========== SMS 表单（H5 块仍用 .input-group/.label/.input） ========== */
.input-group {
	margin-bottom: 24rpx;
}

.label {
	display: block;
	font-size: 26rpx;
	color: #333;
	margin-bottom: 10rpx;
}

.input {
	height: 80rpx;
	border: 2rpx solid #e8e8e8;
	border-radius: 10rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	background: #FAFAFA;
}

.btn-sms-login {
	height: 88rpx;
	background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
	color: #fff;
	border-radius: 44rpx;
	font-size: 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 20rpx;
	border: none;
}

.btn-sms-login::after {
	border: none;
}

/* ========== H5/APP 内容 ========== */
.h5-app-content {
	padding-top: 10rpx;
}

.test-hint {
	display: block;
	font-size: 26rpx;
	color: #999;
	margin-bottom: 16rpx;
}

.btn-oneclick {
	height: 80rpx;
	background: #fff;
	color: #2D5A27;
	border: 2rpx solid #2D5A27;
	border-radius: 40rpx;
	font-size: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 20rpx;
}

.btn-oneclick::after {
	border: none;
}

/* ========== 底部协议 ========== */
.footer {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	font-size: 22rpx;
	color: #999;
	text-align: center;
	padding: 40rpx 40rpx 50rpx;
	background-color: #FFFFFF;
}

.footer .link {
	color: #2D5A27;
	text-decoration: underline;
	margin: 0 4rpx;
}
</style>
