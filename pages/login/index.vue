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
			<view class="wechat-icon-wrap">
				<image class="wechat-icon" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M9.5 4C5.4 4 2 6.7 2 10.1c0 1.9 1 3.6 2.7 4.7L4 17.3l2.7-1.3c.7.2 1.5.3 2.3.4-.1-.4-.2-.9-.2-1.3 0-2.9 2.8-5.3 6.2-5.3.2 0 .5 0 .7.1C15 6.7 12.5 4 9.5 4zm-2 4c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm4 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z'/><path d='M22 13.9c0-2.6-2.6-4.7-5.9-4.7s-5.9 2.1-5.9 4.7 2.6 4.7 5.9 4.7c.7 0 1.4-.1 2-.3l1.8 1-.4-1.7c1.5-.9 2.5-2.2 2.5-3.7zm-7.7-1.5c.5 0 .8.3.8.8s-.3.8-.8.8-.8-.3-.8-.8.3-.8.8-.8zm3.6 0c.5 0 .8.3.8.8s-.3.8-.8.8-.8-.3-.8-.8.3-.8.8-.8z'/></svg>" mode="aspectFit" />
			</view>
			<text class="btn-text">微信一键登录</text>
		</button>

		<text class="phone-login-link" @tap="toggleSmsMode">{{ showSmsMode ? '收起' : '手机号登录' }}</text>

		<view class="divider-with-text">
			<view class="divider-line"></view>
			<text class="divider-text">或</text>
			<view class="divider-line"></view>
		</view>

		<view v-if="showSmsMode" class="sms-form">
			<view class="input-group">
				<text class="label">手机号</text>
				<view class="phone-row">
					<input class="input" type="number" v-model="phone" placeholder="请输入手机号" maxlength="11" />
					<view class="btn-sms" @tap="handleSendSms">
						<text>{{ smsCountdown > 0 ? smsCountdown + 's' : '获取验证码' }}</text>
					</view>
				</view>
			</view>
			<view class="input-group">
				<text class="label">验证码</text>
				<input class="input" type="number" v-model="code" placeholder="请输入验证码" maxlength="6" />
			</view>
			<button class="btn-sms-login" :loading="loading" @tap="handleSmsLogin">验证码登录</button>
		</view>
		<!-- #endif -->

		<!-- #ifdef H5 || APP-PLUS -->
		<view class="h5-app-content">
			<view class="tab-bar">
				<view class="tab" :class="{active: mode === 'sms'}" @tap="mode = 'sms'">
					<text>手机号登录</text>
				</view>
				<view class="tab" :class="{active: mode === 'test'}" @tap="mode = 'test'">
					<text>测试模式</text>
				</view>
			</view>

			<block v-if="mode === 'sms'">
				<view class="input-group">
					<text class="label">手机号</text>
					<input class="input" type="number" v-model="phone" placeholder="请输入手机号" maxlength="11" />
				</view>
				<view class="input-group">
					<text class="label">验证码</text>
					<view class="phone-row">
						<input class="input" type="number" v-model="code" placeholder="请输入验证码" maxlength="6" />
						<view class="btn-sms" @tap="handleSendSms">
							<text>{{ smsCountdown > 0 ? smsCountdown + 's' : '获取验证码' }}</text>
						</view>
					</view>
				</view>
				<button class="btn-sms-login" :loading="loading" @tap="handleSmsLogin">登录</button>

				<!-- #ifdef APP-PLUS -->
				<view class="divider-with-text">
					<view class="divider-line"></view>
					<text class="divider-text">本机号码一键登录</text>
					<view class="divider-line"></view>
				</view>
				<button class="btn-oneclick" :loading="oneClickLoading" @tap="handleOneClick">本机号码一键登录</button>
				<!-- #endif -->
			</block>

			<block v-else>
				<text class="test-hint">仅用于查看云端已有数据。开发期使用。</text>
				<view class="input-group">
					<text class="label">userId（可选）</text>
					<input class="input" v-model="testUserId" placeholder="留空自动生成" />
				</view>
				<button class="btn-sms-login" :loading="testLoading" @tap="handleTestLogin">进入测试模式</button>
			</block>
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
import { loginAsTest } from '@/utils/auth.js'
// #endif
import { loginBySms, sendSmsCode, loginByUniverify, loginByWeixin } from '@/utils/auth.js'

export default {
	data() {
		return {
			mode: 'sms',
			phone: '',
			code: '',
			loading: false,
			wechatLoading: false,
			// #ifdef H5 || APP-PLUS
			testLoading: false,
			testUserId: '',
			// #endif
			oneClickLoading: false,
			smsCountdown: 0,
			_smsTimer: null,
			// #ifdef MP-WEIXIN
			showSmsMode: false
			// #endif
		}
	},
	onUnload() {
		if (this._smsTimer) clearInterval(this._smsTimer)
	},
	methods: {
		// #ifdef MP-WEIXIN
		toggleSmsMode() {
			this.showSmsMode = !this.showSmsMode
		},
		// #endif
		async handleSendSms() {
			if (!this.phone || this.phone.length !== 11) {
				return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
			}
			if (this.smsCountdown > 0) return
			try {
				await sendSmsCode(this.phone)
				uni.showToast({ title: '已发送', icon: 'success' })
				this.smsCountdown = 60
				this._smsTimer = setInterval(() => {
					this.smsCountdown--
					if (this.smsCountdown <= 0 && this._smsTimer) {
						clearInterval(this._smsTimer)
						this._smsTimer = null
					}
				}, 1000)
			} catch (e) {
				uni.showToast({ title: e.msg || '发送失败', icon: 'none' })
			}
		},
		async handleSmsLogin() {
			if (!this.phone || this.phone.length !== 11) {
				return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
			}
			if (!this.code || this.code.length < 4) {
				return uni.showToast({ title: '请输入验证码', icon: 'none' })
			}
			this.loading = true
			try {
				await loginBySms(this.phone, this.code)
				uni.showToast({ title: '登录成功', icon: 'success' })
				setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
			} catch (e) {
				uni.showToast({ title: e.msg || '登录失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
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

.wechat-icon-wrap {
	width: 44rpx;
	height: 44rpx;
	background-color: #FFFFFF;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 16rpx;
}

.wechat-icon {
	width: 30rpx;
	height: 30rpx;
}

.btn-text {
	font-size: 32rpx;
	color: #FFFFFF;
	font-weight: 600;
	letter-spacing: 2rpx;
}

/* 手机号登录链接 */
.phone-login-link {
	display: block;
	text-align: center;
	font-size: 28rpx;
	color: #333333;
	margin-top: 32rpx;
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

/* ========== SMS 表单 ========== */
.sms-form {
	padding-top: 10rpx;
}

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

.phone-row {
	display: flex;
	gap: 12rpx;
	align-items: center;
}

.phone-row .input {
	flex: 1;
}

.btn-sms {
	height: 80rpx;
	padding: 0 20rpx;
	background: #E8F5E9;
	border-radius: 10rpx;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.btn-sms text {
	font-size: 24rpx;
	color: #2D5A27;
	white-space: nowrap;
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

.tab-bar {
	display: flex;
	background: #F5F5F5;
	border-radius: 12rpx;
	padding: 6rpx;
	margin-bottom: 36rpx;
}

.tab {
	flex: 1;
	padding: 16rpx 0;
	text-align: center;
	border-radius: 8rpx;
}

.tab text {
	font-size: 26rpx;
	color: #666;
}

.tab.active {
	background: #fff;
	box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
}

.tab.active text {
	color: #2D5A27;
	font-weight: 500;
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
