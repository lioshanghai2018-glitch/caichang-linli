<template>
	<view class="page">
		<!-- 顶部导航 -->
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">‹</text>
			</view>
			<text class="nav-title">住户认证</text>
		</view>

		<!-- 认证状态卡片 -->
		<view class="status-card" :class="certStatus">
			<view class="status-icon-wrap">
				<text class="status-icon">{{ statusIcon }}</text>
			</view>
			<text class="status-title">{{ statusTitle }}</text>
			<text class="status-desc">{{ statusDesc }}</text>
		</view>

		<!-- 未认证：上传资料 -->
		<view class="upload-section" v-if="certStatus === 'none' || certStatus === 'rejected'">
			<view class="section-title">认证资料</view>

			<!-- 拒绝原因 -->
			<view class="reject-reason" v-if="certStatus === 'rejected'">
				<text class="reject-label">拒绝原因：</text>
				<text class="reject-text">{{ rejectReason || '资料不符合要求，请重新上传' }}</text>
			</view>

			<!-- 账单凭证上传 -->
			<view class="upload-item">
				<view class="upload-header">
					<text class="upload-label">地址证明</text>
					<text class="upload-required">*必填</text>
				</view>
				<text class="upload-hint">水电费/燃气费/宽带账单（任选一项，需显示小区地址）</text>
				<view class="upload-box" @tap="uploadBill">
					<image v-if="billUrl" :src="billUrl" mode="aspectFill" class="upload-img" />
					<view v-else class="upload-placeholder">
						<text class="icon-plus">+</text>
						<text class="upload-tip">上传账单</text>
					</view>
				</view>
			</view>

			<!-- 隐私协议 -->
			<view class="agreement">
				<checkbox-group @change="onAgreeChange">
					<label class="agreement-label">
						<checkbox value="agree" :checked="agreed" color="#4F9A42" />
						<text>我已阅读并同意</text>
					</label>
				</checkbox-group>
				<text class="agreement-link" @tap="showAgreement">《邻里社区认证协议》</text>
			</view>

			<!-- 提交按钮 -->
			<view class="submit-btn" :class="{disabled: !canSubmit}" @tap="submitCert">
				<text>提交认证</text>
			</view>
		</view>

		<!-- 审核中 -->
		<view class="pending-section" v-if="certStatus === 'pending'">
			<view class="pending-icon">
				<view class="spinner"></view>
			</view>
			<text class="pending-text">资料审核中</text>
			<text class="pending-sub">预计1-3个工作日完成审核，请耐心等待</text>

			<view class="cert-info">
				<view class="info-row">
					<text class="info-label">提交时间</text>
					<text class="info-value">{{ submitTime || '未知' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">认证小区</text>
					<text class="info-value">{{ communityName || '未知' }}</text>
				</view>
			</view>
		</view>

		<!-- 已认证 -->
		<view class="certified-section" v-if="certStatus === 'certified'">
			<view class="cert-badge">
				<text class="cert-icon">✓</text>
			</view>
			<text class="cert-title">认证成功</text>
			<text class="cert-community">{{ communityName }}</text>
			<text class="cert-tips">您已认证为小区住户，可享受发布、联系等全部功能</text>

			<view class="cert-info">
				<view class="info-row">
					<text class="info-label">认证编号</text>
					<text class="info-value">{{ certId || '---' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">认证时间</text>
					<text class="info-value">{{ certTime || '未知' }}</text>
				</view>
			</view>

			<view class="cert-actions">
				<view class="action-btn secondary" @tap="reCert">
					<text>重新认证</text>
				</view>
			</view>
		</view>

		<!-- 认证说明 -->
		<view class="tips-section" v-if="certStatus !== 'pending'">
			<text class="tips-title">认证说明</text>
			<view class="tips-list">
				<text class="tips-item">1. 认证仅限小区真实住户</text>
				<text class="tips-item">2. 地址证明需真实、地址清晰可辨</text>
				<text class="tips-item">3. 您的信息仅用于身份核实，绝不对外泄露</text>
				<text class="tips-item">4. 认证成功后可发布帖子、参与社区互动</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getCertStatus, submitCert, uploadCertImage, getLocalCertStatus, saveLocalCertStatus, resetMyCert } from '@/utils/neighbor-api.js'
import { getUserId } from '@/utils/auth.js'

export default {
	data() {
		return {
			certStatus: 'none',
			billUrl: '',
			agreed: false,
			rejectReason: '',
			communityName: '',
			submitTime: '',
			certId: '',
			certTime: '',
			submitting: false
		}
	},
	computed: {
		statusIcon() {
			const icons = { none: '?', pending: '⏳', certified: '✓', rejected: '✗' }
			return icons[this.certStatus] || '?'
		},
		statusTitle() {
			const titles = {
				none: '未认证',
				pending: '审核中',
				certified: '已认证',
				rejected: '认证被拒'
			}
			return titles[this.certStatus] || ''
		},
		statusDesc() {
			const descs = {
				none: '完成认证即可发布帖子、参与社区活动',
				pending: '您的资料正在审核中',
				certified: '您已完成住户认证',
				rejected: '请重新上传认证资料'
			}
			return descs[this.certStatus] || ''
		},
		canSubmit() {
			return this.billUrl && this.agreed
		}
	},
	onLoad() {
		this.loadCertStatus()
	},
	onShow() {
		// 从其他页面返回时重新拉一次云端，避免本地脏数据掩盖商家审核结果
		this.loadCertStatus()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		loadCertStatus() {
			// 优先从本地存储读取
			const localStatus = getLocalCertStatus()
			this.certStatus = localStatus
			this.rejectReason = uni.getStorageSync('cert_reject_reason') || ''
			this.communityName = uni.getStorageSync('cert_community') || ''
			this.submitTime = uni.getStorageSync('cert_submit_time') || ''
			this.certId = uni.getStorageSync('cert_id') || ''
			this.certTime = uni.getStorageSync('cert_time') || ''
			this.billUrl = uni.getStorageSync('cert_bill') || ''

			// 尝试从API获取最新状态
			const userId = getUserId() || Date.now().toString()
			getCertStatus(userId).then(res => {
				if (res.data) {
					this.certStatus = res.data.status
					this.communityName = res.data.communityName || ''
					this.certTime = res.data.certTime || ''
					this.certId = res.data.certId || ''
					saveLocalCertStatus(res.data.status, res.data)
				}
			}).catch(() => {})
		},
		uploadBill() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					this.billUrl = res.tempFilePaths[0]
					uni.setStorageSync('cert_bill', this.billUrl)
				}
			})
		},
		onAgreeChange(e) {
			this.agreed = e.detail.value.includes('agree')
		},
		showAgreement() {
			uni.showModal({
				title: '邻里社区认证协议',
				content: '1. 您承诺提供的认证资料真实有效\n2. 我们仅将您的信息用于核实身份，不会对外泄露\n3. 认证成功后可享受社区全部功能\n4. 如发现虚假信息，认证将被取消',
				showCancel: false,
				confirmText: '我已知悉'
			})
		},
		async submitCert() {
			if (this.submitting) return  // 防重复点击
			if (!this.canSubmit) {
				if (!this.billUrl) {
					uni.showToast({ title: '请上传地址证明', icon: 'none' })
				} else if (!this.agreed) {
					uni.showToast({ title: '请阅读并同意认证协议', icon: 'none' })
				}
				return
			}
			this.submitting = true

			uni.showLoading({ title: '上传中...' })

			const userId = getUserId() || Date.now().toString()
			let billCloudUrl = this.billUrl

			try {
				// 上传账单到云存储。billUrl 可能是 wxfile://tmp/、http://tmp/（本地临时路径）
				// 或 cloud://（历史本地缓存，已不再产生）。非 cloud:// 都触发上传。
				if (this.billUrl && !this.billUrl.startsWith('cloud://')) {
					const res = await uploadCertImage(this.billUrl, `certs/${userId}_bill_${Date.now()}.jpg`)
					const fileID = (res && (res.data?.fileID || res.fileID)) || ''
					if (!fileID) {
						throw new Error('返回无 fileID（响应: ' + JSON.stringify(res).slice(0, 200) + '）')
					}
					billCloudUrl = fileID
				}

				// 兜底：上传后必须是非本地路径。允许 cloud://（历史本地缓存）或 http(s)://。
				if (!billCloudUrl
					|| billCloudUrl === this.billUrl
					|| (!billCloudUrl.startsWith('cloud://') && !billCloudUrl.startsWith('http'))) {
					uni.showToast({ title: '账单图未上传到云端，请重试', icon: 'none' })
					throw new Error('账单图未上传到云端')
				}

				uni.showLoading({ title: '提交中...' })

				// 姓名/手机号从本地用户信息取，商家审核页要显示
				// user_info 存的是登录返回的 userInfo 完整对象（uni-id 字段是 nickname；自建 users 表是 phone）
				const userInfo = uni.getStorageSync('user_info') || {}
				const certData = {
					userId: userId,
					userName: userInfo.nickname || uni.getStorageSync('userName') || '邻居',
					phone: uni.getStorageSync('user_phone') || userInfo.mobile || userInfo.phone || '',
					billUrl: billCloudUrl,
					submitTime: new Date().toISOString()
				}

				// 保存到本地存储（商家后台可以读取）
				let localCerts = uni.getStorageSync('local_certs') || '[]'
				try {
					localCerts = JSON.parse(localCerts)
				} catch (e) {
					localCerts = []
				}
				const idx = localCerts.findIndex(c => c.userId === certData.userId)
				if (idx >= 0) {
					localCerts[idx] = { ...localCerts[idx], ...certData, status: 'pending' }
				} else {
					localCerts.push({ ...certData, status: 'pending' })
				}
				uni.setStorageSync('local_certs', JSON.stringify(localCerts))

				try {
					await submitCert(certData)
				} catch (e) {
					// API失败也继续，本地已保存
				}

				uni.showToast({ title: '提交成功', icon: 'success' })

				// 保存本地状态
				saveLocalCertStatus('pending', {
					submitTime: new Date().toLocaleString('zh-CN'),
					billUrl: billCloudUrl
				})
				this.certStatus = 'pending'
				this.submitTime = new Date().toLocaleString('zh-CN')
				setTimeout(() => {
					uni.navigateBack()
				}, 1000)
			} catch (e) {
				console.error('[cert] submitCert failed:', e)
				uni.showToast({ title: '账单上传失败：' + ((e && (e.msg || e.message)) || '请重试'), icon: 'none', duration: 3000 })
			} finally {
				uni.hideLoading()
				this.submitting = false
			}
		},
		async reCert() {
			const ok = await new Promise(r => uni.showModal({
				title: '重新认证',
				content: '重新认证将清除当前认证状态，确定要继续吗？',
				success: s => r(s.confirm)
			}))
			if (!ok) return
			const userId = getUserId() || Date.now().toString()
			try {
				// 先调云端把 DB 状态清回 'none'，否则下次提交会被 submitCert 拒绝（pending/certified 状态）
				await resetMyCert(userId)
			} catch (e) {
				console.error('[cert] resetMyCert failed:', e)
				uni.showToast({ title: '重置失败：' + (e.msg || '请重试'), icon: 'none' })
				return
			}
			saveLocalCertStatus('none')
			this.certStatus = 'none'
			this.billUrl = ''
			this.agreed = false
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background-color: #F5F1EB;
	padding-bottom: 40rpx;
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

/* 状态卡片 */
.status-card {
	margin: 20rpx;
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 40rpx;
	text-align: center;
}

.status-card.none {
	border: 2rpx dashed #DDD;
}

.status-card.pending {
	border: 2rpx solid #FFC107;
}

.status-card.certified {
	border: 2rpx solid #4F9A42;
}

.status-card.rejected {
	border: 2rpx solid #FF6B6B;
}

.status-icon-wrap {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	margin: 0 auto 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.status-card.none .status-icon-wrap {
	background-color: #F5F5F5;
}

.status-card.pending .status-icon-wrap {
	background-color: #FFF8E1;
}

.status-card.certified .status-icon-wrap {
	background-color: #E8F5E9;
}

.status-card.rejected .status-icon-wrap {
	background-color: #FFEBEE;
}

.status-icon {
	font-size: 48rpx;
}

.status-card.none .status-icon {
	color: #999;
}

.status-card.pending .status-icon {
	color: #FFC107;
}

.status-card.certified .status-icon {
	color: #4F9A42;
}

.status-card.rejected .status-icon {
	color: #FF6B6B;
}

.status-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #333;
	display: block;
}

.status-desc {
	font-size: 26rpx;
	color: #999;
	display: block;
	margin-top: 8rpx;
}

/* 上传区域 */
.upload-section {
	margin: 0 20rpx;
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 24rpx;
}

.reject-reason {
	background-color: #FFEBEE;
	border-radius: 12rpx;
	padding: 20rpx;
	margin-bottom: 24rpx;
}

.reject-label {
	font-size: 26rpx;
	color: #FF6B6B;
	font-weight: 600;
}

.reject-text {
	font-size: 26rpx;
	color: #333;
}

.upload-item {
	margin-bottom: 32rpx;
}

.upload-header {
	display: flex;
	align-items: center;
	margin-bottom: 8rpx;
}

.upload-label {
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
}

.upload-required {
	font-size: 24rpx;
	color: #FF6B6B;
	margin-left: 8rpx;
}

.upload-hint {
	font-size: 24rpx;
	color: #999;
	margin-bottom: 16rpx;
}

.upload-box {
	width: 100%;
	height: 360rpx;
	background-color: #F5F5F5;
	border-radius: 16rpx;
	border: 2rpx dashed #DDD;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.upload-img {
	width: 100%;
	height: 100%;
}

.upload-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.icon-plus {
	font-size: 64rpx;
	color: #AAA;
	line-height: 1;
}

.upload-tip {
	font-size: 28rpx;
	color: #AAA;
	margin-top: 12rpx;
}

/* 协议 */
.agreement {
	display: flex;
	align-items: center;
	margin: 24rpx 0;
	flex-wrap: wrap;
}

.agreement-label {
	display: flex;
	align-items: center;
}

.agreement text {
	font-size: 26rpx;
	color: #666;
}

.agreement-link {
	font-size: 26rpx;
	color: #4F9A42;
}

/* 提交按钮 */
.submit-btn {
	background-color: #4F9A42;
	border-radius: 48rpx;
	padding: 28rpx;
	text-align: center;
	margin-top: 24rpx;
}

.submit-btn.disabled {
	background-color: #CCC;
}

.submit-btn text {
	font-size: 32rpx;
	color: #FFFFFF;
	font-weight: 600;
}

/* 审核中 */
.pending-section {
	margin: 20rpx;
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 60rpx 40rpx;
	text-align: center;
}

.pending-icon {
	margin-bottom: 24rpx;
}

.spinner {
	width: 60rpx;
	height: 60rpx;
	border: 4rpx solid #FFF8E1;
	border-top-color: #FFC107;
	border-radius: 50%;
	margin: 0 auto;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.pending-text {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
}

.pending-sub {
	font-size: 26rpx;
	color: #999;
	display: block;
	margin-top: 12rpx;
}

/* 已认证 */
.certified-section {
	margin: 20rpx;
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 60rpx 40rpx;
	text-align: center;
}

.cert-badge {
	width: 120rpx;
	height: 120rpx;
	background-color: #E8F5E9;
	border-radius: 50%;
	margin: 0 auto 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cert-icon {
	font-size: 64rpx;
	color: #4F9A42;
	font-weight: bold;
}

.cert-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #333;
}

.cert-community {
	font-size: 28rpx;
	color: #4F9A42;
	display: block;
	margin-top: 8rpx;
}

.cert-tips {
	font-size: 26rpx;
	color: #999;
	display: block;
	margin-top: 16rpx;
}

.cert-actions {
	margin-top: 40rpx;
}

.action-btn {
	padding: 24rpx 48rpx;
	border-radius: 48rpx;
}

.action-btn.secondary {
	background-color: #F5F5F5;
	border: 2rpx solid #E0E0E0;
}

.action-btn.secondary text {
	font-size: 28rpx;
	color: #666;
}

/* 通用信息区域 */
.cert-info {
	margin-top: 40rpx;
	padding-top: 40rpx;
	border-top: 1rpx solid #F0F0F0;
}

.info-row {
	display: flex;
	justify-content: space-between;
	padding: 16rpx 0;
}

.info-label {
	font-size: 28rpx;
	color: #999;
}

.info-value {
	font-size: 28rpx;
	color: #333;
}

/* 说明 */
.tips-section {
	margin: 20rpx;
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
}

.tips-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
	display: block;
	margin-bottom: 16rpx;
}

.tips-list {
	display: flex;
	flex-direction: column;
}

.tips-item {
	font-size: 26rpx;
	color: #666;
	line-height: 2;
}
</style>