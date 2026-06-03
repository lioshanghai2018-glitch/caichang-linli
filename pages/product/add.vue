<template>
<view class="page">
  <!-- 返回按钮 -->
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">{{isEdit ? '编辑商品' : '新增商品'}}</text>
  </view>

  <!-- 图片上传区 -->
  <view class="card image-upload-section">
    <text class="section-label">商品图片</text>
    <view class="image-grid">
      <view class="image-item" v-for="(img, idx) in productImages" :key="idx">
        <image :src="img" mode="aspectFill" />
        <text class="delete-btn" @tap="deleteImage(idx)">×</text>
      </view>
      <view class="upload-btn" v-if="productImages.length < 9" @tap="chooseImage">
        <text class="upload-icon">+</text>
        <text class="upload-text">添加图片</text>
      </view>
    </view>
  </view>

  <!-- 基本信息 -->
  <view class="card info-section">
    <view class="form-row">
      <text class="form-label required">商品名称</text>
      <input class="form-input" placeholder="请输入商品名称" v-model="productName" />
    </view>
    <view class="form-row">
      <text class="form-label">商品规格</text>
      <input class="form-input" placeholder="如：500g/份" v-model="productSpec" />
    </view>
    <view class="form-row">
      <text class="form-label">商品分类</text>
      <picker :value="categoryIndex" :range="categories" range-key="label" @change="onCategoryChange">
        <view class="picker-value">
          <text>{{categories[categoryIndex].label}}</text>
          <text class="picker-arrow">›</text>
        </view>
      </picker>
    </view>
  </view>

  <!-- 价格设置 -->
  <view class="card price-section">
    <text class="section-title">价格设置</text>
    <view class="form-row">
      <text class="form-label required">销售价</text>
      <view class="price-input-wrap">
        <text class="price-unit">¥</text>
        <input class="form-input price-input" type="digit" placeholder="0.00" v-model="price" />
      </view>
    </view>
    <view class="form-row">
      <text class="form-label">原价</text>
      <view class="price-input-wrap">
        <text class="price-unit">¥</text>
        <input class="form-input price-input" type="digit" placeholder="0.00" v-model="originalPrice" />
      </view>
    </view>
  </view>

  <!-- 库存管理 -->
  <view class="card stock-section">
    <text class="section-title">库存管理</text>
    <view class="form-row">
      <text class="form-label">初始库存</text>
      <input class="form-input" type="number" placeholder="0" v-model="stock" />
    </view>
    <view class="form-row">
      <text class="form-label">预警库存</text>
      <input class="form-input" type="number" placeholder="0" v-model="stockWarn" />
    </view>
  </view>

  <!-- 商品设置 -->
  <view class="card settings-section">
    <text class="section-title">商品设置</text>
    <view class="switch-row">
      <view class="switch-info">
        <text class="switch-label">上架销售</text>
        <text class="switch-hint">关闭后商品不在店铺显示</text>
      </view>
      <view class="switch-wrap" @tap="toggleOnline">
        <view class="switch" :class="{on: isOnline}">
          <view class="switch-dot"></view>
        </view>
      </view>
    </view>
    <view class="switch-row">
      <view class="switch-info">
        <text class="switch-label">支持退换</text>
        <text class="switch-hint">允许客户申请退换货</text>
      </view>
      <view class="switch-wrap" @tap="toggleRefund">
        <view class="switch" :class="{on: allowRefund}">
          <view class="switch-dot"></view>
        </view>
      </view>
    </view>
  </view>

  <!-- 商品描述 -->
  <view class="card desc-section">
    <text class="section-title">商品描述</text>
    <textarea class="desc-textarea" placeholder="请输入商品描述（选填）" v-model="description" />
  </view>

  <!-- 底部操作栏 -->
  <view class="bottom-bar">
    <view class="action-btn secondary" @tap="saveDraft">
      <text class="btn-text">保存草稿</text>
    </view>
    <view class="action-btn primary" @tap="submitProduct">
      <text class="btn-text">{{isEdit ? '保存修改' : '立即上架'}}</text>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { createProduct, updateProduct, getProductDetail, getCategories } from '@/utils/api.js'

export default {
  data() {
    return {
      isEdit: false,
      productId: '',
      productImages: [],
      productName: '',
      productSpec: '',
      categoryIndex: 0,
      categories: [],
      price: '',
      originalPrice: '',
      stock: '',
      stockWarn: '',
      isOnline: true,
      allowRefund: false,
      description: '',
      submitting: false
    }
  },
  onLoad(options) {
    this.fetchCategories()
    if (options.id) {
      this.isEdit = true
      this.productId = options.id
      this.loadProduct(options.id)
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async fetchCategories() {
      try {
        const res = await getCategories()
        const list = Array.isArray(res.data) ? res.data : (res.data?.list || [])
        this.categories = list.filter(c => c.status !== false).map(c => ({ key: c.key || c._id, label: c.name }))
      } catch (e) {
        console.warn('分类加载失败', e)
      }
    },
    async chooseImage() {
      // 1. 选来源
      let src = null
      try {
        const r = await uni.showActionSheet({ itemList: ['拍照', '从相册选'] })
        src = r.tapIndex === 0 ? 'camera' : 'album'
      } catch (e) { return }
      // 2. 选图（最多 9 张）
      let img
      try {
        img = await uni.chooseImage({
          sourceType: [src],
          count: 9 - this.productImages.length,
          sizeType: ['compressed']
        })
      } catch (e) { return }
      // 3. 逐张直传云存储
      uni.showLoading({ title: '上传中 0/' + img.tempFilePaths.length })
      let ok = 0, fail = 0
      for (let i = 0; i < img.tempFilePaths.length; i++) {
        try {
          const cloudPath = `merchant/product/${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}.jpg`
          const r = await uniCloud.uploadFile({ cloudPath, filePath: img.tempFilePaths[i] })
          this.productImages = [...this.productImages, r.fileID]
          ok++
        } catch (e) {
          fail++
        }
        uni.showLoading({ title: `上传中 ${ok + fail}/${img.tempFilePaths.length}` })
      }
      uni.hideLoading()
      if (fail > 0) uni.showToast({ title: `成功 ${ok} 失败 ${fail}`, icon: 'none' })
    },
    deleteImage(idx) {
      this.productImages.splice(idx, 1)
    },
    onCategoryChange(e) {
      this.categoryIndex = e.detail.value
    },
    toggleOnline() {
      this.isOnline = !this.isOnline
    },
    toggleRefund() {
      this.allowRefund = !this.allowRefund
    },
    loadProduct(id) {
      uni.showLoading({ title: '加载中...' })
      getProductDetail(id).then(res => {
        const p = res.data
        if (!p) { uni.hideLoading(); return }
        this.productName = p.name || ''
        this.productSpec = p.spec || ''
        this.price = p.price != null ? String(p.price) : ''
        this.originalPrice = p.originalPrice != null ? String(p.originalPrice) : ''
        this.stock = p.stock != null ? String(p.stock) : ''
        this.stockWarn = p.stockWarn != null ? String(p.stockWarn) : ''
        this.isOnline = p.status === 'online' || p.status === true
        this.allowRefund = !!p.allowRefund
        this.description = p.description || ''
        this.productImages = p.images || (p.image ? [p.image] : [])
        const idx = this.categories.findIndex(c => c.key === p.category)
        if (idx >= 0) this.categoryIndex = idx
        uni.hideLoading()
      }).catch(e => {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '加载商品失败', icon: 'none' })
      })
    },
    saveDraft() {
      uni.showToast({ title: '草稿已保存', icon: 'success' })
    },
    submitProduct() {
      if (this.submitting) return
      if (!this.productName) {
        uni.showToast({ title: '请输入商品名称', icon: 'none' })
        return
      }
      if (!this.price) {
        uni.showToast({ title: '请输入销售价', icon: 'none' })
        return
      }
      const cat = this.categories[this.categoryIndex] || {}
      const payload = {
        name: this.productName,
        spec: this.productSpec,
        category: cat.key || '',
        categoryName: cat.label || '',
        price: Number(this.price) || 0,
        originalPrice: Number(this.originalPrice) || 0,
        stock: Number(this.stock) || 0,
        stockWarn: Number(this.stockWarn) || 0,
        status: this.isOnline ? 'online' : 'offline',
        allowRefund: this.allowRefund,
        description: this.description,
        images: this.productImages,
        coverImage: this.productImages[0] || ''
      }
      this.submitting = true
      uni.showLoading({ title: this.isEdit ? '保存中...' : '上架中...' })
      const op = this.isEdit
        ? updateProduct(this.productId, payload)
        : createProduct(payload)
      op.then(() => {
        uni.hideLoading()
        uni.showToast({ title: this.isEdit ? '修改成功' : '上架成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1200)
      }).catch(e => {
        uni.hideLoading()
        uni.showToast({ title: e.msg || (this.isEdit ? '保存失败' : '上架失败'), icon: 'none' })
      }).finally(() => {
        this.submitting = false
      })
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

/* 返回栏 */
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
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
}

/* 通用卡片 */
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 20rpx;
}
.section-label {
  font-size: 28rpx;
  color: #333333;
  display: block;
  margin-bottom: 16rpx;
}

/* 图片上传区 */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.image-item {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
}
.image-item image {
  width: 100%;
  height: 100%;
}
.image-item .delete-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #FFFFFF;
}
.upload-btn {
  width: 200rpx;
  height: 200rpx;
  background: #F5F5F5;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #E8E8E8;
}
.upload-icon {
  font-size: 60rpx;
  color: #999999;
  line-height: 1;
}
.upload-text {
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 表单行 */
.form-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}
.form-row:last-child {
  border-bottom: none;
}
.form-label {
  font-size: 28rpx;
  color: #333333;
  width: 160rpx;
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
.form-input::placeholder {
  color: #CCCCCC;
}
.picker-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.picker-value text:first-child {
  font-size: 28rpx;
  color: #333333;
}
.picker-arrow {
  font-size: 32rpx;
  color: #999999;
  margin-left: 8rpx;
}

/* 价格输入 */
.price-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.price-unit {
  font-size: 32rpx;
  color: #333333;
  margin-right: 8rpx;
}
.price-input {
  width: 160rpx;
  text-align: right;
}

/* 开关行 */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}
.switch-row:last-child {
  border-bottom: none;
}
.switch-info {
  display: flex;
  flex-direction: column;
}
.switch-label {
  font-size: 28rpx;
  color: #333333;
}
.switch-hint {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.switch {
  width: 96rpx;
  height: 52rpx;
  background: #E8E8E8;
  border-radius: 26rpx;
  padding: 4rpx;
  transition: all 0.3s;
}
.switch.on {
  background: #4CAF50;
}
.switch-dot {
  width: 44rpx;
  height: 44rpx;
  background: #FFFFFF;
  border-radius: 50%;
  transition: all 0.3s;
}
.switch.on .switch-dot {
  transform: translateX(44rpx);
}

/* 描述文本框 */
.desc-textarea {
  width: 100%;
  min-height: 160rpx;
  font-size: 28rpx;
  color: #333333;
  line-height: 1.6;
  padding: 16rpx 0;
  box-sizing: border-box;
}
.desc-textarea::placeholder {
  color: #CCCCCC;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 24rpx;
  display: flex;
  gap: 16rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
}
.action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-btn.secondary {
  background: #F5F5F5;
}
.action-btn.primary {
  background: #4CAF50;
}
.action-btn .btn-text {
  font-size: 32rpx;
  font-weight: 500;
}
.action-btn.secondary .btn-text {
  color: #666666;
}
.action-btn.primary .btn-text {
  color: #FFFFFF;
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>