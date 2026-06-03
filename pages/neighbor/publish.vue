<template>
	<view class="page">
		<!-- 顶部导航 -->
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">‹</text>
			</view>
			<text class="nav-title">{{ isEdit ? '编辑帖子' : '发布帖子' }}</text>
			<view class="publish-btn" :class="{ disabled: submitting }" @tap="submitPost">
				<text>{{ isEdit ? '保存' : '发布' }}</text>
			</view>
		</view>

		<!-- 表单区域 -->
		<scroll-view class="form-scroll" scroll-y="true">
			<!-- 基本信息 -->
			<view class="form-section">
				<!-- 分类选择 -->
				<view class="form-item" @tap="showCategoryPicker">
					<view class="form-label">分类</view>
					<view class="picker-wrapper">
						<text :class="form.categoryIndex !== null ? 'picker-value' : 'picker-placeholder'">
							{{ form.categoryIndex !== null ? categories[form.categoryIndex].name : '请选择分类' }}
						</text>
						<text class="arrow">›</text>
					</view>
				</view>
				<view class="form-divider"></view>

				<!-- 标题 -->
				<view class="form-item">
					<view class="form-label">标题</view>
					<input class="form-input" v-model="form.title" placeholder="输入帖子标题（必填）"
						placeholder-class="input-placeholder" maxlength="50" />
				</view>
				<view class="form-divider"></view>

				<!-- 正文 -->
				<view class="form-item content-item">
					<view class="form-label">正文</view>
					<textarea class="form-textarea" v-model="form.content" placeholder="输入帖子内容（必填）"
						placeholder-class="input-placeholder" maxlength="2000" />
					<text class="char-count">{{ form.content.length }}/2000</text>
				</view>
			</view>

			<!-- 图片上传 -->
			<view class="form-section">
				<view class="section-title">图片（最多9张）</view>
				<view class="image-list">
					<view class="image-item" v-for="(img, idx) in form.images" :key="idx">
						<image :src="img" mode="aspectFill" />
						<view class="image-remove" @tap="removeImage(idx)">
							<text>×</text>
						</view>
					</view>
					<view class="image-add" v-if="form.images.length < 9" @tap="chooseImage">
						<view class="icon-add">+</view>
						<text class="add-text">添加图片</text>
					</view>
				</view>
			</view>

			<!-- 联系方式 -->
			<view class="form-section">
				<view class="form-item">
					<view class="form-label">手机号</view>
					<input class="form-input" type="number" v-model="form.contactPhone"
						placeholder="方便联系（选填）" placeholder-class="input-placeholder" maxlength="11" />
				</view>
				<view class="form-divider"></view>

				<!-- 价格 -->
				<view class="form-item">
					<view class="form-label">价格</view>
					<input class="form-input" v-model="form.price" placeholder="如 ¥80起（选填）"
						placeholder-class="input-placeholder" />
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { createPost, updatePost, getPostDetail, CATEGORIES } from '@/utils/neighbor-api.js'

export default {
	data() {
		return {
			isEdit: false,
			postId: '',
			categories: CATEGORIES.slice(1), // 去掉"全部"
			submitting: false,
			form: {
				categoryIndex: null,
				categoryName: '',
				title: '',
				content: '',
				images: [],
				contactPhone: '',
				price: ''
			}
		}
	},
	onLoad(options) {
		// 确保有 userId
		if (!uni.getStorageSync('userId')) {
			const newUserId = 'user_' + Date.now()
			uni.setStorageSync('userId', newUserId.replace('user_', ''))
		}

		// 检查认证状态
		const status = uni.getStorageSync('cert_status') || 'none'
		if (status !== 'certified') {
			uni.showModal({
				title: '需要认证',
				content: '发布帖子需要先完成住户认证，是否前往认证？',
				confirmText: '去认证',
				success: (res) => {
					if (res.confirm) {
						uni.navigateTo({ url: '/pages/neighbor/cert' })
					} else {
						uni.navigateBack()
					}
				}
			})
			return
		}

		if (options.edit) {
			this.isEdit = true
			this.postId = options.edit
			this.loadPostData()
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		showCategoryPicker() {
			const list = this.categories.map(c => c.name)
			uni.showActionSheet({
				itemList: list,
				success: (res) => {
					this.form.categoryIndex = res.tapIndex
					this.form.categoryName = list[res.tapIndex]
				}
			})
		},
		chooseImage() {
			const count = 9 - this.form.images.length
			uni.chooseImage({
				count,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					this.form.images = [...this.form.images, ...res.tempFilePaths]
				}
			})
		},
		removeImage(idx) {
			this.form.images.splice(idx, 1)
		},
		validateForm() {
			if (this.form.categoryIndex === null) {
				uni.showToast({ title: '请选择分类', icon: 'none' })
				return false
			}
			if (!this.form.title.trim()) {
				uni.showToast({ title: '请输入标题', icon: 'none' })
				return false
			}
			if (!this.form.content.trim()) {
				uni.showToast({ title: '请输入内容', icon: 'none' })
				return false
			}
			if (this.form.contactPhone && !/^1\d{10}$/.test(this.form.contactPhone)) {
				uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
				return false
			}
			return true
		},
		async submitPost() {
			if (!this.validateForm() || this.submitting) return

			this.submitting = true
			uni.showLoading({ title: '发布中...' })

			const postData = {
				_id: 'post_' + Date.now(),
				categoryIndex: this.form.categoryIndex + 1,
				categoryName: this.form.categoryName,
				title: this.form.title.trim(),
				content: this.form.content.trim(),
				images: this.form.images,
				contactPhone: this.form.contactPhone,
				price: this.form.price,
				authorName: uni.getStorageSync('userName') || '邻居',
				// authorId 不再从本地 storage 读取，**由云端从 token 解析**
				likes: 0,
				comments: 0,
				status: 1,
				createdAt: new Date().toISOString()
			}

			try {
				if (this.isEdit) {
					await updatePost(this.postId, postData)
					uni.showToast({ title: '保存成功', icon: 'success' })
				} else {
					await createPost(postData)
					uni.showToast({ title: '已提交，待审核', icon: 'success' })
				}
			} catch (e) {
				// API 未就绪时使用本地存储
				let localPosts = uni.getStorageSync('local_posts') || []
				if (this.isEdit) {
					const idx = localPosts.findIndex(p => (p._id || p.id) === this.postId)
					if (idx >= 0) {
						localPosts[idx] = { ...localPosts[idx], ...postData }
					}
					uni.showToast({ title: '保存成功', icon: 'success' })
				} else {
					localPosts.unshift(postData)
					uni.setStorageSync('local_posts', localPosts)
					uni.showToast({ title: '已提交，待审核', icon: 'success' })
				}
			}

			uni.hideLoading()
			setTimeout(() => {
				uni.navigateBack()
			}, 1000)
			this.submitting = false
		},
		async loadPostData() {
			try {
				const res = await getPostDetail({ postId: this.postId })
				const data = res.data || {}
				// 填充表单
				const catIdx = this.categories.findIndex(c => c.name === data.categoryName)
				this.form = {
					categoryIndex: catIdx >= 0 ? catIdx : null,
					categoryName: data.categoryName || '',
					title: data.title || '',
					content: data.content || '',
					images: data.images || [],
					contactPhone: data.contactPhone || '',
					price: data.price || ''
				}
			} catch (e) {
				console.error('加载帖子失败', e)
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

.publish-btn {
	padding: 8rpx 24rpx;
	background-color: #4F9A42;
	border-radius: 24rpx;
}

.publish-btn.disabled {
	opacity: 0.6;
}

.publish-btn text {
	font-size: 26rpx;
	color: #FFFFFF;
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
	align-items: flex-start;
	padding: 28rpx 0;
}

.form-label {
	font-size: 30rpx;
	color: #333;
	width: 140rpx;
	flex-shrink: 0;
	line-height: 48rpx;
}

.picker-wrapper {
	flex: 1;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.picker-placeholder {
	font-size: 30rpx;
	color: #CCC;
}

.picker-value {
	font-size: 30rpx;
	color: #333;
}

.arrow {
	font-size: 28rpx;
	color: #CCC;
}

.form-input {
	flex: 1;
	font-size: 30rpx;
	color: #333;
	min-height: 48rpx;
	line-height: 48rpx;
}

.form-textarea {
	flex: 1;
	font-size: 30rpx;
	color: #333;
	min-height: 200rpx;
	line-height: 1.6;
}

.content-item {
	flex-direction: column;
}

.char-count {
	font-size: 24rpx;
	color: #CCC;
	margin-top: 8rpx;
	text-align: right;
	width: 100%;
}

.form-divider {
	height: 1rpx;
	background-color: #F0F0F0;
}

.input-placeholder {
	color: #CCC;
}

.section-title {
	font-size: 30rpx;
	color: #333;
	padding: 28rpx 0 20rpx;
}

.image-list {
	display: flex;
	flex-wrap: wrap;
	padding-bottom: 28rpx;
}

.image-item {
	width: 200rpx;
	height: 200rpx;
	margin-right: 16rpx;
	margin-bottom: 16rpx;
	border-radius: 12rpx;
	overflow: hidden;
	position: relative;
}

.image-item image {
	width: 100%;
	height: 100%;
}

.image-remove {
	position: absolute;
	top: 0;
	right: 0;
	width: 40rpx;
	height: 40rpx;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
}

.image-remove text {
	font-size: 28rpx;
	color: #FFF;
}

.image-add {
	width: 200rpx;
	height: 200rpx;
	background-color: #F5F5F5;
	border-radius: 12rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border: 2rpx dashed #DDD;
}

.icon-add {
	font-size: 60rpx;
	color: #AAA;
	line-height: 1;
}

.add-text {
	font-size: 24rpx;
	color: #AAA;
	margin-top: 8rpx;
}
</style>