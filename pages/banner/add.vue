<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">添加轮播图</text>
    </view>

    <view class="form-section">
      <view class="form-item" @tap="chooseImage">
        <view class="form-label">轮播图片</view>
        <view class="image-preview" v-if="form.image">
          <image :src="form.image" mode="aspectFill" class="preview-img"></image>
        </view>
        <view class="image-placeholder" v-else>
          <text>点击上传图片</text>
        </view>
      </view>
      <view class="form-divider"></view>

      <view class="form-item">
        <view class="form-label">标题</view>
        <input class="form-input" type="text" v-model="form.title" placeholder="轮播图标题（选填）" placeholder-class="input-placeholder" />
      </view>
      <view class="form-divider"></view>

      <view class="form-item">
        <view class="form-label">排序</view>
        <input class="form-input" type="number" v-model="form.sort" placeholder="数字越大越靠前" placeholder-class="input-placeholder" />
      </view>
      <view class="form-divider"></view>

      <view class="form-item">
        <view class="form-label">点击跳转</view>
        <picker :range="linkTypes" @change="onLinkTypeChange">
          <text class="form-input">{{linkTypes[form.linkTypeIndex] || '不跳转'}}</text>
        </picker>
      </view>
      <view class="form-divider"></view>

      <view class="form-item" v-if="form.linkTypeIndex > 0">
        <view class="form-label">跳转ID</view>
        <input class="form-input" type="text" v-model="form.linkId" placeholder="商品ID或分类ID" placeholder-class="input-placeholder" />
      </view>
      <view class="form-divider" v-if="form.linkTypeIndex > 0"></view>

      <view class="form-item switch-item">
        <view class="form-label">启用</view>
        <switch :checked="form.active" @change="e => form.active = e.detail.value" color="#4F9A42" />
      </view>
    </view>

    <view class="bottom-bar">
      <view class="save-btn" @tap="saveBanner">
        <text class="save-btn-text">保存</text>
      </view>
    </view>
  </view>
</template>

<script>
import { API_BASE, STORAGE_KEYS } from '@/utils/config.js'

export default {
  data() {
    return {
      form: {
        image: '',
        title: '',
        sort: 0,
        linkTypeIndex: 0,
        linkId: '',
        active: true
      },
      linkTypes: ['不跳转', '跳转商品', '跳转分类'],
      linkTypeMap: ['none', 'product', 'category']
    }
  },
  methods: {
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFile = res.tempFilePaths[0]
          this.uploadImage(tempFile)
        }
      })
    },
    async uploadImage(filePath) {
      uni.showLoading({ title: '上传中...' })
      try {
        const uploadRes = await uniCloud.uploadFile({
          filePath: filePath,
          cloudPath: 'banners/' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg'
        })
        if (uploadRes.fileID) {
          this.form.image = uploadRes.fileID
          uni.showToast({ title: '上传成功', icon: 'success' })
        } else {
          uni.showToast({ title: '上传失败', icon: 'none' })
        }
      } catch (e) {
        console.error('上传失败:', e)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
      uni.hideLoading()
    },
    onLinkTypeChange(e) {
      this.form.linkTypeIndex = e.detail.value
    },
    async saveBanner() {
      if (!this.form.image) {
        uni.showToast({ title: '请上传轮播图片', icon: 'none' })
        return
      }
      uni.showLoading({ title: '保存中...' })
      try {
        const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
        const merchantId = uni.getStorageSync(STORAGE_KEYS.MERCHANT_ID)
        const res = await uni.request({
          url: API_BASE + '/addBanner',
          method: 'POST',
          header: { 'Authorization': 'Bearer ' + token },
          data: {
            method: 'addBanner',
            params: {
              image: this.form.image,
              title: this.form.title,
              sort: Number(this.form.sort) || 0,
              linkType: this.linkTypeMap[this.form.linkTypeIndex] || 'none',
              linkId: this.form.linkId || '',
              active: this.form.active,
              merchantId: merchantId
            }
          }
        })
        if (res.data && res.data.code === 0) {
          uni.showToast({ title: '保存成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1000)
        } else {
          uni.showToast({ title: (res.data && res.data.msg) || '保存失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
      uni.hideLoading()
    },
    goBack() { uni.navigateBack() }
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #F5F1EB; padding-bottom: 140rpx; }

.nav-bar {
  display: flex; align-items: center; height: 88rpx;
  background-color: #FFFFFF; padding: 0 24rpx;
}

.back-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 44rpx; color: #333; font-weight: 300; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #333; flex: 1; text-align: center; margin-right: 56rpx; }

.form-section {
  background-color: #FFFFFF; margin: 20rpx; border-radius: 16rpx; padding: 0 24rpx;
}

.form-item { display: flex; align-items: center; padding: 28rpx 0; }
.form-label { font-size: 30rpx; color: #333; width: 160rpx; flex-shrink: 0; }
.form-input { flex: 1; font-size: 30rpx; color: #333; height: 48rpx; line-height: 48rpx; }
.input-placeholder { font-size: 30rpx; color: #CCC; }
.form-divider { height: 1rpx; background-color: #F0F0F0; }
.switch-item { justify-content: space-between; }

.image-preview { width: 300rpx; height: 180rpx; border-radius: 8rpx; overflow: hidden; }
.preview-img { width: 100%; height: 100%; }
.image-placeholder {
  width: 300rpx; height: 180rpx; border: 2rpx dashed #CCC; border-radius: 8rpx;
  display: flex; align-items: center; justify-content: center; color: #999; font-size: 26rpx;
}

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 20rpx 24rpx; background-color: #FFFFFF; border-top: 1rpx solid #E8E8E8;
}

.save-btn {
  background-color: #4F9A42; border-radius: 40rpx; height: 88rpx;
  display: flex; align-items: center; justify-content: center;
}

.save-btn-text { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
</style>
