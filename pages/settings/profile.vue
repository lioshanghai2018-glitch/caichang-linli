<template>
<view class="page">
	<view class="nav-bar">
		<view class="back-btn" @tap="goBack">
			<text class="back-arrow">‹</text>
		</view>
		<text class="nav-title">用户信息</text>
	</view>

	<scroll-view class="form-scroll" scroll-y="true">
		<view class="card">
			<view class="option-item avatar-row">
				<text class="option-text">头像</text>
				<view class="option-right">
					<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
						<image v-if="avatarPreview" :src="avatarPreview" mode="aspectFill" class="avatar-img" @error="avatarFileID = ''" />
						<view v-else class="avatar-placeholder">+</view>
					</button>
					<view class="icon-arrow"></view>
				</view>
			</view>
			<view class="divider"></view>

			<view class="option-item" @tap="onTapNickname">
				<text class="option-text">昵称</text>
				<view class="option-right">
					<text class="option-value" :class="{ placeholder: !nickname }">{{ nickname || '亲爱的用户' }}</text>
					<view class="icon-arrow"></view>
				</view>
			</view>
			<view class="divider"></view>

			<view class="option-item" @tap="onTapGender">
				<text class="option-text">性别</text>
				<view class="option-right">
					<text class="option-value" :class="{ placeholder: !gender }">{{ gender || '未知' }}</text>
					<view class="icon-arrow"></view>
				</view>
			</view>
			<view class="divider"></view>

			<view class="option-item copyable" @tap="onCopyAccount">
				<text class="option-text">账号</text>
				<text class="option-value">{{ account || '—' }}</text>
			</view>
			<view class="divider"></view>

			<button class="option-item option-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
				<text class="option-text">手机号</text>
				<view class="option-right">
					<text class="option-value" :class="{ placeholder: !maskedPhone }">{{ maskedPhone || '一键绑定本机号码' }}</text>
					<view class="icon-arrow"></view>
				</view>
			</button>
			<view class="divider"></view>

			<view class="option-item" @tap="onTapBirthday">
				<text class="option-text">生日</text>
				<view class="option-right">
					<text class="option-value" :class="{ placeholder: !birthday }">{{ birthday || '完善生日，享生日好礼' }}</text>
					<view class="icon-arrow"></view>
				</view>
			</view>
			<view class="divider"></view>

			<view class="option-item">
				<text class="option-text">入会时间</text>
				<text class="option-value">{{ joinTimeText || '—' }}</text>
			</view>
			<view class="divider"></view>

			<view class="option-item" @tap="goCert">
				<text class="option-text">住户认证</text>
				<view class="option-right">
					<text class="option-value" :class="certValueClass">{{ certTitle }}</text>
					<view class="icon-arrow"></view>
				</view>
			</view>
		</view>

		<text class="disclaimer">性别信息、生日信息涉及权益发放，请谨慎修改</text>

		<view class="save-btn-wrap">
			<button class="save-btn" :class="{ disabled: !canSave || saving }" :loading="saving" @tap="onSave">
				<text>保存</text>
			</button>
		</view>
	</scroll-view>

	<view v-if="showGenderPicker" class="popup-mask" @tap="showGenderPicker = false">
		<view class="popup-panel" @tap.stop>
			<view class="popup-option" v-for="g in genderOptions" :key="g" @tap="onPickGender(g)">
				<text :class="{ active: g === gender }">{{ g || '未知' }}</text>
			</view>
			<view class="popup-cancel" @tap="showGenderPicker = false"><text>取消</text></view>
		</view>
	</view>

	<view v-if="showBirthdayPicker" class="popup-mask" @tap="showBirthdayPicker = false">
		<view class="popup-panel" @tap.stop>
			<picker mode="date" :value="pickerBirthdayDefault" :start="birthdayStart" :end="birthdayEnd" @change="onPickBirthday" fields="day">
				<view class="picker-trigger"><text>点击选择生日</text></view>
			</picker>
			<view class="popup-cancel" @tap="showBirthdayPicker = false"><text>取消</text></view>
		</view>
	</view>
</view>
</template>

<script>
import { updateProfile, getUserId, getMyUserInfo, bindWxPhone } from '@/utils/auth.js'
import { getLocalCertStatus } from '@/utils/neighbor-api.js'
import { STORAGE_KEYS } from '@/utils/config.js'

export default {
	data() {
		return {
			userId: '',
			account: '',
			nickname: '',
			originalNickname: '',
			avatarFileID: '',
			originalAvatar: '',
			avatarPreview: '',
			avatarUploaded: false,
			gender: '',
			originalGender: '',
			birthday: '',
			originalBirthday: '',
			joinTimeText: '',
			maskedPhone: '',
			certStatus: 'none',
			saving: false,
			showGenderPicker: false,
			showBirthdayPicker: false,
			genderOptions: ['', '男', '女']
		}
	},
	computed: {
		canSave() {
			return this.nickname !== this.originalNickname
				|| !!this.avatarUploaded
				|| this.gender !== this.originalGender
				|| this.birthday !== this.originalBirthday
		},
		certTitle() {
			const map = { none: '未认证', pending: '审核中', certified: '已认证', rejected: '认证被拒' }
			return map[this.certStatus] || '未认证'
		},
		certValueClass() {
			return 'cert-value-' + (this.certStatus || 'none')
		},
		birthdayStart() {
			return '1900-01-01'
		},
		birthdayEnd() {
			const d = new Date()
			const pad = n => String(n).padStart(2, '0')
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
		},
		pickerBirthdayDefault() {
			return this.birthday ? `2000-${this.birthday}` : '2000-01-01'
		}
	},
	async onLoad() {
		this.userId = getUserId()
		await this.loadFromStorage()
		this.certStatus = getLocalCertStatus()
	},
	onShow() {
		this.certStatus = getLocalCertStatus()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadFromStorage() {
			const cached = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
			let info = cached
			try { info = (await getMyUserInfo()) || cached } catch (e) { /* 用本地缓存兜底 */ }
			this.account = info.account || ''
			this.originalNickname = info.nickname || ''
			this.nickname = this.originalNickname
			this.originalAvatar = info.avatar || ''
			this.avatarFileID = this.originalAvatar.startsWith('cloud://') ? this.originalAvatar : ''
			this.avatarPreview = this.avatarFileID ? '' : (info.avatar || '')
			if (this.avatarFileID) {
				uniCloud.getTempFileURL({ fileList: [this.avatarFileID] })
					.then(r => {
						const url = r.fileList && r.fileList[0] && r.fileList[0].tempFileURL
						if (url) this.avatarPreview = url
					})
					.catch(() => {})
			}
			this.originalGender = info.gender || ''
			this.gender = this.originalGender
			this.originalBirthday = info.birthday || ''
			this.birthday = this.originalBirthday
			this.maskedPhone = this.maskPhone(info.phone)
			this.joinTimeText = info.createdAt ? this.formatJoinTime(info.createdAt) : ''
		},
		formatJoinTime(d) {
			const dt = (d instanceof Date) ? d : new Date(d)
			if (isNaN(dt.getTime())) return ''
			const pad = n => String(n).padStart(2, '0')
			return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
		},
		onCopyAccount() {
			if (!this.account) return
			uni.setClipboardData({
				data: this.account,
				success: () => uni.showToast({ title: '账号已复制', icon: 'success' })
			})
		},
		maskPhone(p) {
			if (!p || p.length < 7) return ''
			return p.slice(0, 3) + '****' + p.slice(-4)
		},
		goCert() {
			uni.navigateTo({ url: '/pages/neighbor/cert' })
		},

		async onGetPhoneNumber(e) {
			if (!e.detail.code) {
				return uni.showToast({ title: '已取消授权', icon: 'none' })
			}
			uni.showLoading({ title: '绑定中...' })
			try {
				const data = await bindWxPhone(this.userId, e.detail.code)
				const fresh = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
				this.maskedPhone = this.maskPhone(fresh.phone)
				uni.hideLoading()
				uni.showToast({
					title: data && data.merged ? '已合并到原账户' : '绑定成功',
					icon: 'success'
				})
			} catch (err) {
				uni.hideLoading()
				uni.showToast({ title: (err && (err.msg || err.message)) || '绑定失败', icon: 'none' })
			}
		},

		onChooseAvatar(e) {
			const temp = e.detail.avatarUrl
			if (!temp) return
			this.avatarPreview = temp
			uni.showLoading({ title: '上传中...' })
			const cloudPath = `avatars/${this.userId}_${Date.now()}.jpg`
			uniCloud.uploadFile({
				cloudPath,
				filePath: temp,
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

		onTapNickname() {
			uni.showModal({
				title: '修改昵称',
				editable: true,
				placeholderText: '请输入昵称',
				content: this.nickname,
				success: (res) => {
					if (res.confirm && res.content != null) {
						this.nickname = String(res.content).slice(0, 20).trim()
					}
				}
			})
		},

		onTapGender() {
			this.showGenderPicker = true
		},
		onPickGender(g) {
			this.gender = g
			this.showGenderPicker = false
		},

		onTapBirthday() {
			this.showBirthdayPicker = true
		},
		onPickBirthday(e) {
			const v = e.detail.value || ''
			this.birthday = v.length >= 10 ? v.slice(5) : v
			this.showBirthdayPicker = false
		},

		async onSave() {
			if (!this.canSave || this.saving) return
			this.saving = true
			try {
				const update = { userId: this.userId }
				if (this.nickname !== this.originalNickname) update.nickname = this.nickname
				if (this.avatarUploaded && this.avatarFileID) update.avatar = this.avatarFileID
				if (this.gender !== this.originalGender) update.gender = this.gender
				if (this.birthday !== this.originalBirthday) update.birthday = this.birthday || ''
				await updateProfile(update)
				uni.showToast({ title: '保存成功', icon: 'success' })
				const fresh = uni.getStorageSync(STORAGE_KEYS.USER_INFO) || {}
				this.originalNickname = fresh.nickname || this.nickname
				this.originalAvatar = fresh.avatar || this.avatarFileID
				this.avatarUploaded = false
				this.originalGender = fresh.gender || ''
				this.gender = this.originalGender
				this.originalBirthday = fresh.birthday || ''
				this.birthday = this.originalBirthday
				this.joinTimeText = fresh.createdAt ? this.formatJoinTime(fresh.createdAt) : this.joinTimeText
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

.card {
	background-color: #FFFFFF;
	margin: 20rpx;
	border-radius: 16rpx;
	padding: 0 24rpx;
}

.option-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	min-height: 100rpx;
	padding: 20rpx 0;
}

.option-item.copyable:active {
	background-color: #F5F5F5;
}

.option-item.option-btn {
	background: transparent;
	padding: 20rpx 0;
	margin: 0;
	border: none;
	border-radius: 0;
	text-align: left;
	line-height: 1.4;
	font-size: 28rpx;
	color: #333;
}

.option-item.option-btn::after {
	border: none;
}

.option-item.avatar-row {
	min-height: 100rpx;
}

.option-text {
	font-size: 28rpx;
	color: #333;
}

.option-right {
	display: flex;
	align-items: center;
}

.option-value {
	font-size: 26rpx;
	color: #666;
	margin-right: 12rpx;
}

.option-value.placeholder {
	color: #BBB;
}

.cert-value-none, .cert-value-pending, .cert-value-rejected {
	color: #FAAD14;
}

.cert-value-certified {
	color: #4F9A42;
}

.divider {
	height: 1rpx;
	background-color: #F0F0F0;
}

.icon-arrow {
	width: 16rpx;
	height: 16rpx;
	border-right: 3rpx solid #999;
	border-bottom: 3rpx solid #999;
	transform: rotate(-45deg);
}

.avatar-btn {
	width: 80rpx;
	height: 80rpx;
	background-color: #F5F5F5;
	border-radius: 50%;
	border: 2rpx solid #EEE;
	padding: 0;
	margin: 0;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-btn::after {
	border: none;
}

.avatar-img {
	width: 100%;
	height: 100%;
	border-radius: 50%;
}

.avatar-placeholder {
	font-size: 40rpx;
	color: #AAA;
	line-height: 1;
}

.disclaimer {
	display: block;
	font-size: 24rpx;
	color: #999;
	padding: 20rpx 32rpx 0;
	line-height: 1.6;
}

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

.popup-mask {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	z-index: 999;
	display: flex;
	align-items: flex-end;
}

.popup-panel {
	width: 100%;
	background: #FFFFFF;
	border-radius: 24rpx 24rpx 0 0;
	padding-bottom: env(safe-area-inset-bottom);
}

.popup-option {
	height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	color: #333;
	border-bottom: 1rpx solid #F0F0F0;
}

.popup-option text.active {
	color: #4F9A42;
	font-weight: 600;
}

.popup-cancel {
	height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	color: #999;
}

.picker-trigger {
	height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.picker-trigger text {
	font-size: 30rpx;
	color: #4F9A42;
}
</style>
