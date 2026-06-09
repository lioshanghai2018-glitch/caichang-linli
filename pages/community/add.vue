<template>
<view class="page">
	<view class="back-bar">
		<text class="back-arrow" @tap="goBack">‹</text>
		<text class="page-title">{{ isEdit ? '编辑小区' : '新增小区' }}</text>
	</view>

	<view class="card">
		<view class="form-row">
			<text class="form-label required">小区编号</text>
			<input
				class="form-input"
				placeholder="如：A1、B2（字母+数字 2 位）"
				v-model="code"
				maxlength="2"
				:disabled="isEdit"
			/>
		</view>
		<view class="form-row">
			<text class="form-label required">小区名称</text>
			<input
				class="form-input"
				placeholder="如：阳光小区"
				v-model="name"
				maxlength="20"
			/>
		</view>
	</view>

	<view class="tip" v-if="isEdit">
		<text>小区编号创建后不可修改</text>
	</view>

	<view class="bottom-bar">
		<view class="action-btn primary" @tap="submit">
			<text class="btn-text">{{ isEdit ? '保存修改' : '立即添加' }}</text>
		</view>
	</view>

	<view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { addCommunity, updateCommunity, getCommunities } from '@/utils/api.js'

export default {
	data() {
		return {
			isEdit: false,
			cmId: '',
			code: '',
			name: '',
			submitting: false
		}
	},
	onLoad(options) {
		if (options.id) {
			this.isEdit = true
			this.cmId = options.id
			this.loadItem(options.id)
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadItem(id) {
			uni.showLoading({ title: '加载中...' })
			try {
				const res = await getCommunities()
				const list = Array.isArray(res.data) ? res.data : []
				const item = list.find(c => c._id === id)
				if (item) {
					this.name = item.name || ''
					this.code = item.code || ''
				}
			} catch (e) {
				uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
			} finally {
				uni.hideLoading()
			}
		},
		validate() {
			if (!this.code.trim()) {
				uni.showToast({ title: '请输入小区编号', icon: 'none' })
				return false
			}
			if (!/^[A-Za-z][0-9]$/.test(this.code.trim())) {
				uni.showToast({ title: '编号格式：字母+数字（如 A1）', icon: 'none' })
				return false
			}
			if (!this.name.trim()) {
				uni.showToast({ title: '请输入小区名称', icon: 'none' })
				return false
			}
			return true
		},
		async submit() {
			if (this.submitting) return
			if (!this.validate()) return
			this.submitting = true
			uni.showLoading({ title: this.isEdit ? '保存中...' : '添加中...' })
			const payload = {
				code: this.code.trim().toUpperCase(),
				name: this.name.trim()
			}
			try {
				if (this.isEdit) {
					await updateCommunity(this.cmId, payload)
				} else {
					await addCommunity(payload)
				}
				uni.hideLoading()
				uni.showToast({ title: this.isEdit ? '已保存' : '已添加', icon: 'success' })
				setTimeout(() => uni.navigateBack(), 1000)
			} catch (e) {
				uni.hideLoading()
				uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
			} finally {
				this.submitting = false
			}
		}
	}
}
</script>

<style>
.page {
	background-color: #F5F1EB;
	min-height: 100vh;
	padding: 0 20rpx 180rpx;
}

.back-bar {
	display: flex;
	align-items: center;
	height: 88rpx;
}

.back-arrow {
	font-size: 48rpx;
	color: #000000;
	font-weight: 300;
	padding: 0 8rpx;
}

.page-title {
	flex: 1;
	font-size: 32rpx;
	font-weight: 600;
	color: #000000;
	text-align: center;
}

.card {
	background: #FFFFFF;
	border-radius: 16rpx;
	padding: 8rpx 24rpx;
	margin-bottom: 16rpx;
}

.form-row {
	display: flex;
	align-items: center;
	padding: 28rpx 0;
	border-bottom: 1rpx solid #F5F5F5;
}

.form-row:last-child {
	border-bottom: none;
}

.form-label {
	font-size: 28rpx;
	color: #333333;
	width: 180rpx;
	flex-shrink: 0;
}

.form-label.required::before {
	content: '*';
	color: #FF0000;
	margin-right: 4rpx;
}

.form-input {
	flex: 1;
	font-size: 28rpx;
	color: #333333;
	text-align: right;
}

.form-input[disabled] {
	color: #999999;
	background: transparent;
}

.form-input::placeholder {
	color: #CCCCCC;
}

.tip {
	padding: 0 24rpx;
}

.tip text {
	font-size: 22rpx;
	color: #999999;
}

.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	background: #FFFFFF;
	padding: 20rpx 24rpx;
	box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
}

.action-btn {
	height: 88rpx;
	border-radius: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.action-btn.primary {
	background: #4CAF50;
}

.action-btn .btn-text {
	font-size: 32rpx;
	font-weight: 500;
	color: #FFFFFF;
}

.bottom-placeholder {
	height: 120rpx;
}
</style>
