<template>
	<view class="page">
		<!-- 加载中 -->
		<view v-if="loading" class="loading">
			<text>加载中...</text>
		</view>

		<!-- 态 1:联系商家 / 致电商家 + 申请入口 -->
		<block v-else-if="!showForm">
			<view class="contact-row">
				<view class="contact-card" @tap="contactMerchant">
					<view class="contact-icon">💬</view>
					<text class="contact-label">联系商家</text>
				</view>
				<view class="contact-card" @tap="callMerchant">
					<view class="contact-icon">📞</view>
					<text class="contact-label">致电商家</text>
				</view>
			</view>

			<view class="apply-link" @tap="showApplyForm">
				<text class="apply-link-text">申请</text>
				<text class="apply-link-arrow">›</text>
			</view>

			<view class="order-info-card">
				<view class="info-row">
					<text class="info-label">订单号</text>
					<text class="info-value">{{ order && (order.orderNo || order.id || order._id) || '-' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">金额</text>
					<text class="info-value price">¥{{ order && order.totalAmount || 0 }}</text>
				</view>
			</view>
		</block>

		<!-- 态 2:退款申请表单 -->
		<block v-else>
			<view class="form-card">
				<text class="form-section-title">退款类型</text>
				<view class="type-row">
					<view
						v-for="t in typeOptions"
						:key="t.v"
						class="type-chip"
						:class="{ active: refundType === t.v }"
						@tap="refundType = t.v"
					>
						<text>{{ t.l }}</text>
					</view>
				</view>
			</view>

			<view class="form-card">
				<text class="form-section-title">退款理由</text>
				<textarea
					class="reason-input"
					v-model="reason"
					placeholder="请输入退款理由(选填,有助于快速处理)"
					maxlength="500"
				/>
				<text class="char-count">{{ reason.length }}/500</text>
			</view>

			<view class="form-card">
				<text class="form-section-title">图片凭证</text>
				<text class="required-hint">* 图片必填,最多3张</text>
				<view class="image-list">
					<view v-for="(img, i) in images" :key="i" class="image-item">
						<image class="image-thumb" :src="img" mode="aspectFill" @tap="previewImg(img)" />
						<view class="image-remove" @tap="removeImage(i)">×</view>
					</view>
					<view v-if="images.length < 3" class="image-add" @tap="chooseImage">
						<text class="image-add-plus">+</text>
					</view>
				</view>
			</view>

			<view class="form-actions">
				<view class="btn-cancel" @tap="showForm = false">
					<text>取消</text>
				</view>
				<view class="btn-submit" :class="{ disabled: submitting }" @tap="submit">
					<text>{{ submitting ? '提交中…' : '提交申请' }}</text>
				</view>
			</view>
		</block>
	</view>
</template>

<script>
import { getMerchantId, getUserId } from '@/utils/auth.js'

export default {
	data() {
		return {
			order: null,
			merchantId: '',
			merchantPhone: '',
			loading: true,
			showForm: false,
			refundType: '',
			reason: '',
			images: [],
			submitting: false,
			typeOptions: [
				{ v: 'return_refund', l: '退货退款' },
				{ v: 'refund_only',   l: '仅退款' },
				{ v: 'exchange',      l: '我要换货' }
			]
		}
	},
	onLoad(query) {
		// 优先从 storage 拿(订单页 onSale 时塞进去的,避免重新查订单详情)
		const cached = uni.getStorageSync('refundTargetOrder')
		if (cached) {
			this.order = cached
			this.merchantId = cached.merchantId || ''
			this.loading = false
			this.fetchMerchantPhone()
		} else if (query && query.orderId) {
			// 兜底:用 orderId 去查
			this.loadOrder(query.orderId)
		} else {
			uni.showToast({ title: '订单信息缺失', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 800)
		}
	},
	methods: {
		async loadOrder(orderId) {
			try {
				const res = await this.callAPI('getOrderDetail', { orderNo: orderId })
				this.order = res.data
				this.merchantId = this.order.merchantId || ''
				await this.fetchMerchantPhone()
			} catch (e) {
				uni.showToast({ title: e.msg || '订单加载失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async fetchMerchantPhone() {
			try {
				let mid = this.merchantId
				if (!mid) mid = await getMerchantId()
				if (!mid) return
				this.merchantId = mid
				const res = await this.callAPI('getMerchantPublicInfo', { merchantId: mid })
				this.merchantPhone = (res.data && res.data.phone) || ''
			} catch (e) {
				console.warn('[refund] fetchMerchantPhone failed:', e)
				this.merchantPhone = ''
			}
		},
		async contactMerchant() {
			try {
				const userId = getUserId()
				if (!this.merchantId) {
					this.merchantId = await getMerchantId()
				}
				if (!this.merchantId || !userId) {
					return uni.showToast({ title: '请先登录', icon: 'none' })
				}
				uni.showLoading({ title: '连接中…' })
				await this.callAPI('createConversation', {
					merchantId: this.merchantId,
					userId: userId
				})
				uni.hideLoading()
				uni.navigateTo({ url: '/pages/service/index' })
			} catch (e) {
				uni.hideLoading()
				uni.showToast({ title: e.msg || '连接失败', icon: 'none' })
			}
		},
		callMerchant() {
			if (!this.merchantPhone) {
				return uni.showToast({ title: '商家暂未配置电话', icon: 'none' })
			}
			uni.makePhoneCall({
				phoneNumber: this.merchantPhone,
				fail: () => {
					// 用户取消拨号,不弹错
				}
			})
		},
		showApplyForm() {
			this.showForm = true
		},
		chooseImage() {
			const remain = 3 - this.images.length
			if (remain <= 0) {
				return uni.showToast({ title: '最多3张', icon: 'none' })
			}
			uni.chooseImage({
				count: remain,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					this.images = [...this.images, ...res.tempFilePaths]
				}
			})
		},
		removeImage(idx) {
			this.images.splice(idx, 1)
		},
		previewImg(url) {
			uni.previewImage({ urls: [url] })
		},
		async uploadOne(filePath, idx) {
			const orderKey = (this.order && (this.order.orderNo || this.order._id)) || Date.now()
			const cloudPath = `refund_images/${orderKey}_${Date.now()}_${idx}.jpg`
			return new Promise((resolve, reject) => {
				if (typeof uniCloud === 'undefined' || !uniCloud || typeof uniCloud.uploadFile !== 'function') {
					reject(new Error('uniCloud.uploadFile 不可用'))
					return
				}
				uniCloud.uploadFile({
					cloudPath,
					filePath,
					success: (r) => resolve(r.fileID),
					fail: (e) => reject(e)
				})
			})
		},
		async submit() {
			if (!this.refundType) {
				return uni.showToast({ title: '请选择退款类型', icon: 'none' })
			}
			if (this.images.length === 0) {
				return uni.showToast({ title: '请至少上传1张图片', icon: 'none' })
			}
			if (this.submitting) return
			this.submitting = true
			uni.showLoading({ title: '提交中…' })
			try {
				// 上传图片到云存储
				const fileIDs = []
				for (let i = 0; i < this.images.length; i++) {
					const fid = await this.uploadOne(this.images[i], i)
					fileIDs.push(fid)
				}
				await this.callAPI('applyRefund', {
					orderNo: this.order && (this.order.orderNo || this.order._id),
					type: this.refundType,
					reason: (this.reason || '').trim() || '用户申请售后',
					images: fileIDs,
					userId: getUserId()
				})
				uni.hideLoading()
				uni.showToast({ title: '申请已提交', icon: 'success' })
				// 清缓存,避免下次进入还是同一单
				uni.removeStorageSync('refundTargetOrder')
				setTimeout(() => uni.navigateBack(), 800)
			} catch (e) {
				uni.hideLoading()
				console.error('[refund] submit failed:', e)
				uni.showToast({ title: e.msg || '提交失败', icon: 'none' })
			} finally {
				this.submitting = false
			}
		},
		callAPI(method, params) {
			return new Promise((resolve, reject) => {
				uni.request({
					url: `https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/${method}`,
					method: 'POST',
					data: { method, params },
					success: (res) => {
						if (res.data && res.data.code === 0) {
							resolve(res.data)
						} else {
							reject(res.data || { msg: '请求失败' })
						}
					},
					fail: (err) => reject(err)
				})
			})
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background: #F5F1EB;
	padding: 32rpx 24rpx;
	box-sizing: border-box;
}
.loading {
	display: flex;
	justify-content: center;
	padding-top: 200rpx;
	color: #999;
	font-size: 28rpx;
}

/* ========== 态 1 联系/致电卡片 ========== */
.contact-row {
	display: flex;
	gap: 24rpx;
	margin-bottom: 32rpx;
}
.contact-card {
	flex: 1;
	background: #FFFFFF;
	border-radius: 20rpx;
	padding: 60rpx 20rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.contact-icon {
	font-size: 80rpx;
	margin-bottom: 16rpx;
}
.contact-label {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
}

.apply-link {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 12rpx;
	padding: 24rpx 0;
	margin-bottom: 32rpx;
}
.apply-link-text {
	font-size: 30rpx;
	color: #4F9A42;
	font-weight: 500;
}
.apply-link-arrow {
	font-size: 36rpx;
	color: #4F9A42;
	line-height: 1;
}

.order-info-card {
	background: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
}
.info-row {
	display: flex;
	font-size: 26rpx;
	line-height: 1.7;
	margin-bottom: 8rpx;
}
.info-label {
	width: 140rpx;
	color: #999;
	flex-shrink: 0;
}
.info-value {
	flex: 1;
	color: #333;
	word-break: break-all;
}
.info-value.price {
	color: #FF4D4F;
	font-weight: 600;
}

/* ========== 态 2 表单 ========== */
.form-card {
	background: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
}
.form-section-title {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
	margin-bottom: 16rpx;
}
.type-row {
	display: flex;
	gap: 16rpx;
}
.type-chip {
	flex: 1;
	height: 80rpx;
	border-radius: 12rpx;
	border: 2rpx solid #E5E5E5;
	background: #FAFAFA;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
}
.type-chip text {
	font-size: 26rpx;
	color: #666;
}
.type-chip.active {
	border-color: #4F9A42;
	background: #E8F5E9;
}
.type-chip.active text {
	color: #4F9A42;
	font-weight: 600;
}

.reason-input {
	width: 100%;
	height: 200rpx;
	background: #FAFAFA;
	border-radius: 12rpx;
	padding: 16rpx;
	font-size: 26rpx;
	color: #333;
	box-sizing: border-box;
}
.char-count {
	display: block;
	text-align: right;
	font-size: 22rpx;
	color: #999;
	margin-top: 8rpx;
}

.required-hint {
	display: block;
	font-size: 22rpx;
	color: #FF6B00;
	margin-bottom: 16rpx;
}

.image-list {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}
.image-item {
	position: relative;
	width: 180rpx;
	height: 180rpx;
}
.image-thumb {
	width: 100%;
	height: 100%;
	border-radius: 12rpx;
	background: #EEE;
}
.image-remove {
	position: absolute;
	top: -12rpx;
	right: -12rpx;
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.6);
	color: #FFF;
	font-size: 28rpx;
	line-height: 40rpx;
	text-align: center;
	font-weight: 600;
}
.image-add {
	width: 180rpx;
	height: 180rpx;
	border-radius: 12rpx;
	border: 2rpx dashed #DDD;
	background: #FAFAFA;
	display: flex;
	align-items: center;
	justify-content: center;
}
.image-add-plus {
	font-size: 60rpx;
	color: #999;
	font-weight: 300;
	line-height: 1;
}

.form-actions {
	display: flex;
	gap: 16rpx;
	margin-top: 40rpx;
	padding-bottom: env(safe-area-inset-bottom);
}
.btn-cancel,
.btn-submit {
	flex: 1;
	height: 88rpx;
	border-radius: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.btn-cancel {
	background: #FFFFFF;
	border: 2rpx solid #DDD;
}
.btn-cancel text {
	font-size: 28rpx;
	color: #666;
}
.btn-submit {
	background: #4F9A42;
}
.btn-submit.disabled {
	background: #B5D5B0;
}
.btn-submit text {
	font-size: 28rpx;
	color: #FFFFFF;
	font-weight: 600;
}
</style>
