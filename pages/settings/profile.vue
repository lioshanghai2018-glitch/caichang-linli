<template>
<view class="page">
	<!-- 顶部导航 -->
	<view class="nav-bar">
		<view class="back-btn" @tap="goBack">
			<text class="back-arrow">‹</text>
		</view>
		<text class="nav-title">用户设置</text>
	</view>

	<scroll-view class="form-scroll" scroll-y="true">
		<!-- 头像 -->
		<view class="form-section">
			<view class="form-item avatar-item">
				<text class="form-label">头像</text>
				<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
					<image v-if="avatarFileID" :src="avatarPreview" mode="aspectFill" class="avatar-img" @error="avatarFileID = ''" />
					<text v-else class="avatar-plus">+</text>
				</button>
				<text class="form-hint">点击更换</text>
			</view>
		</view>

		<!-- 微信昵称 -->
		<view class="form-section">
			<view class="form-item">
				<text class="form-label">微信昵称</text>
				<input class="form-input" type="nickname" v-model="nickname" placeholder="点击右侧获取微信昵称" maxlength="20" />
				<view class="form-action" @tap="fetchWeixinProfile">
					<text>获取</text>
				</view>
			</view>
		</view>

		<!-- 手机号 -->
		<view class="form-section">
			<view class="form-item">
				<text class="form-label">手机号</text>
				<view v-if="!phoneBound" class="phone-btn" @tap="onGetPhoneNumberTrigger">
					<button class="phone-inner" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">点击绑定本机手机号</button>
				</view>
				<view v-else class="phone-bound">
					<text class="phone-text">{{ maskedPhone }}</text>
					<text class="phone-tick">✓</text>
				</view>
			</view>
		</view>

		<!-- 住户认证 -->
		<view class="form-section">
			<view class="form-item cert-item" @tap="goCert">
				<view class="cert-left">
					<view class="cert-icon-wrap" :class="certStatus">
						<text class="cert-icon">{{ certIcon }}</text>
					</view>
					<view class="cert-info">
						<text class="cert-title">{{ certTitle }}</text>
						<text class="cert-desc">{{ certDesc }}</text>
					</view>
				</view>
				<view class="cert-action">
					<text class="cert-btn-text">{{ certBtnText }}</text>
					<view class="icon-arrow"></view>
				</view>
			</view>
		</view>

		<!-- 保存按钮 -->
		<view class="save-btn-wrap">
			<button class="save-btn" :class="{ disabled: !canSave || saving }" :loading="saving" @tap="onSave">
				<text>保存</text>
			</button>
		</view>
	</scroll-view>
</view>
</template>

<script>
import { updateProfile, bindWxPhone, getUserId } from '@/utils/auth.js'
import { getLocalCertStatus } from '@/utils/neighbor-api.js'
import { STORAGE_KEYS } from '@/utils/config.js'

export default {
	data() {
		return {
			userId: '',
			nickname: '',
			avatarFileID: '',
			avatarPreview: '',
			avatarUploaded: false,  // 本次会话内是否刚上传过头像（用于决定保存时是否调云端）
			originalNickname: '',
			originalAvatar: '',
			phoneBound: false,
			maskedPhone: '',
			certStatus: 'none',
			saving: false,
			defaultAvatar: 'https://img.icons8.com/color/96/user.png'
		}
	},
	computed: {
		canSave() {
			return this.nickname.trim() !== this.originalNickname || !!this.avatarUploaded
		},
		certIcon() {
			const icons = { none: '?', pending: '⏳', certified: '✓', rejected: '✗' }
			return icons[this.certStatus] || '?'
		},
		certTitle() {
			const titles = {
				none: '住户认证',
				pending: '认证审核中',
				certified: '已认证住户',
				rejected: '认证被拒'
			}
			return titles[this.certStatus] || ''
		},
		certDesc() {
			const descs = {
				none: '完成认证即可发布帖子',
				pending: '请耐心等待审核结果',
				certified: '可享受社区全部功能',
				rejected: '请重新上传认证资料'
			}
			return descs[this.certStatus] || ''
		},
		certBtnText() {
			const texts = {
				none: '去认证',
				pending: '查看进度',
				certified: '已认证',
				rejected: '重新认证'
			}
			return texts[this.certStatus] || ''
		}
	},
	onLoad() {
		this.userId = getUserId()
		this.loadFromStorage()
		this.certStatus = getLocalCertStatus()
	},
	onShow() {
		// 从 cert 页回来时刷新状态
		this.certStatus = getLocalCertStatus()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		loadFromStorage() {
			const info = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
			this.originalNickname = info.nickname || ''
			this.nickname = this.originalNickname
			this.originalAvatar = info.avatar || ''
			this.avatarFileID = this.originalAvatar.startsWith('cloud://') ? this.originalAvatar : ''
			this.avatarPreview = this.avatarFileID ? '' : (info.avatar || '')
			// 已上传过头像且是 fileID：解析临时 URL 用于预览
			if (this.avatarFileID) {
				uniCloud.getTempFileURL({ fileList: [this.avatarFileID] })
					.then(r => {
						const url = r.fileList && r.fileList[0] && r.fileList[0].tempFileURL
						if (url) this.avatarPreview = url
					})
					.catch(() => {})
			}
			this.phoneBound = !!info.phone
			this.maskedPhone = this.maskPhone(info.phone)
		},
		onChooseAvatar(e) {
			const tempFilePath = e.detail.avatarUrl
			if (!tempFilePath) return
			this.avatarPreview = tempFilePath
			uni.showLoading({ title: '上传中...' })
			const cloudPath = `avatars/${this.userId}_${Date.now()}.jpg`
			uniCloud.uploadFile({
				cloudPath,
				filePath: tempFilePath,
				success: (res) => {
					uni.hideLoading()
					if (res && res.fileID) {
						this.avatarFileID = res.fileID
						this.avatarUploaded = true
					} else {
						uni.showToast({ title: '上传失败', icon: 'none' })
					}
				},
				fail: () => {
					uni.hideLoading()
					uni.showToast({ title: '上传失败，请重试', icon: 'none' })
				}
			})
		},
		onGetPhoneNumberTrigger() {
			// 占位（open-type 已被内部 button 拦截）
		},
		async onGetPhoneNumber(e) {
			if (!e.detail.code) {
				return uni.showModal({
					title: '需要绑定手机号',
					content: '是否重新授权？',
					confirmText: '重新授权',
					cancelText: '取消',
					success: () => {}
				})
			}
			uni.showLoading({ title: '绑定中...' })
			try {
				const data = await bindWxPhone(e.detail.code)
				const phone = (data && data.userInfo && data.userInfo.phone) || ''
				// bindWxPhone 已更新 storage，从 storage 重新读
				const fresh = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
				this.phoneBound = !!fresh.phone
				this.maskedPhone = this.maskPhone(fresh.phone)
				uni.hideLoading()
				uni.showToast({ title: data.merged ? '已合并到原账户' : '绑定成功', icon: 'success' })
			} catch (err) {
				uni.hideLoading()
				uni.showToast({ title: (err && (err.msg || err.message)) || '绑定失败', icon: 'none' })
			}
		},
		// 拉取微信昵称（type="nickname" 输入框会触发微信原生选择器；这里只是兜底）
		fetchWeixinProfile() {
			uni.showToast({ title: '点击输入框选微信昵称', icon: 'none', duration: 2000 })
		},
		maskPhone(p) {
			if (!p || p.length < 7) return ''
			return p.slice(0, 3) + '****' + p.slice(-4)
		},
		goCert() {
			uni.navigateTo({ url: '/pages/neighbor/cert' })
		},
		async onSave() {
			if (!this.canSave || this.saving) return
			this.saving = true
			try {
				const update = { userId: this.userId }
				if (this.nickname.trim() !== this.originalNickname) update.nickname = this.nickname.trim()
				if (this.avatarUploaded && this.avatarFileID) update.avatar = this.avatarFileID
				await updateProfile(update)
				uni.showToast({ title: '保存成功', icon: 'success' })
				// 更新 storage 原始值，避免保存后还能继续保存
				const fresh = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
				this.originalNickname = fresh.nickname || this.nickname
				this.originalAvatar = fresh.avatar || this.avatarFileID
				this.avatarUploaded = false
				setTimeout(() => uni.navigateBack(), 600)
			} catch (e) {
				uni.showToast({ title: (e && (e.msg || e.message)) || '保存失败', icon: 'none' })
			} finally {
				this.saving = false
			}
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

.form-scroll {
	height: calc(100vh - 88rpx);
}

.form-section {
	background-color: #FFFFFF;
	margin: 20rpx;
	border-radius: 16rpx;
	padding: 0 24rpx;
}

.form-item {
	display: flex;
	align-items: center;
	padding: 28rpx 0;
}

.avatar-item {
	flex-direction: column;
	align-items: center;
	padding: 40rpx 0;
}

.form-label {
	font-size: 30rpx;
	color: #333;
	width: 140rpx;
	flex-shrink: 0;
}

.form-hint {
	font-size: 22rpx;
	color: #999;
	margin-top: 12rpx;
}

.avatar-btn {
	width: 160rpx;
	height: 160rpx;
	background-color: #F5F5F5;
	border-radius: 50%;
	border: 2rpx dashed #CCC;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	overflow: hidden;
	margin-top: 12rpx;
}

.avatar-btn::after {
	border: none;
}

.avatar-img {
	width: 100%;
	height: 100%;
	border-radius: 50%;
}

.avatar-plus {
	font-size: 60rpx;
	color: #AAA;
	line-height: 1;
}

.form-input {
	flex: 1;
	font-size: 30rpx;
	color: #333;
	min-height: 48rpx;
	line-height: 48rpx;
}

.form-action {
	width: 120rpx;
	height: 60rpx;
	background-color: #E8F5E9;
	border-radius: 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: 16rpx;
	flex-shrink: 0;
}

.form-action text {
	font-size: 26rpx;
	color: #2D5A27;
}

.phone-btn {
	flex: 1;
	height: 80rpx;
	background: #E8F5E9;
	border: 2rpx solid #4CAF50;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.phone-inner {
	width: 100%;
	height: 100%;
	background: transparent;
	color: #2D5A27;
	font-size: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	padding: 0;
}

.phone-inner::after {
	border: none;
}

.phone-bound {
	flex: 1;
	height: 80rpx;
	background: #F0F8F0;
	border: 2rpx solid #C8E6C9;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 24rpx;
}

.phone-text {
	font-size: 30rpx;
	color: #2D5A27;
	font-weight: 500;
}

.phone-tick {
	font-size: 32rpx;
	color: #4CAF50;
}

/* 住户认证 */
.cert-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 20rpx;
	margin: 0 -24rpx;
	border-radius: 12rpx;
}

.cert-left {
	display: flex;
	align-items: center;
}

.cert-icon-wrap {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: #FFF;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 16rpx;
}

.cert-icon {
	font-size: 32rpx;
}

.cert-status-none .cert-icon-wrap { background: #FFF8E1; }
.cert-status-pending .cert-icon-wrap { background: #FFF8E1; }
.cert-status-certified .cert-icon-wrap { background: #E8F5E9; }
.cert-status-rejected .cert-icon-wrap { background: #FFEBEE; }

.cert-status-none .cert-icon, .cert-status-pending .cert-icon { color: #FFC107; }
.cert-status-certified .cert-icon { color: #4F9A42; }
.cert-status-rejected .cert-icon { color: #FF6B6B; }

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

.icon-arrow {
	width: 16rpx;
	height: 16rpx;
	border-right: 3rpx solid #999;
	border-bottom: 3rpx solid #999;
	transform: rotate(-45deg);
}

/* 保存按钮 */
.save-btn-wrap {
	padding: 40rpx 32rpx;
}

.save-btn {
	height: 92rpx;
	background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
	color: #fff;
	border-radius: 46rpx;
	font-size: 32rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
}

.save-btn::after {
	border: none;
}

.save-btn.disabled {
	background: #CCC;
	color: #FFF;
}
</style>
