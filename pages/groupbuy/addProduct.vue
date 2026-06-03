<template>
<view class="page">
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">{{ isEdit ? '编辑商品' : '新增商品' }}</text>
  </view>

  <view class="card">
    <view class="form-row column">
      <text class="form-label">商品图片</text>
      <view class="image-picker" @tap="pickAndUpload">
        <image v-if="form.image" :src="form.image" mode="aspectFill" class="img-fill" />
        <view v-else class="image-placeholder">
          <text class="image-icon">📷</text>
          <text class="image-text">点击拍照或从相册选</text>
        </view>
      </view>
    </view>

    <view class="form-row">
      <text class="form-label">商品名称</text>
      <input class="form-input" v-model="form.name" placeholder="请输入商品名称" />
    </view>
  </view>

  <view class="card">
    <view class="card-header">
      <text class="card-title">规格</text>
      <view class="ghost-btn primary" @tap="addSpec">
        <text>+ 添加规格</text>
      </view>
    </view>

    <view v-for="(spec, index) in form.specs" :key="index" class="spec-card">
      <view class="spec-row">
        <text class="spec-label">规格</text>
        <input class="spec-input" v-model="spec.name" placeholder="如 500g" />
      </view>
      <view class="spec-grid">
        <view class="spec-row">
          <text class="spec-label">价格</text>
          <input class="spec-input" type="digit" v-model="spec.price" placeholder="0.00" />
        </view>
        <view class="spec-row">
          <text class="spec-label">原价</text>
          <input class="spec-input" type="digit" v-model="spec.originalPrice" placeholder="0.00" />
        </view>
        <view class="spec-row">
          <text class="spec-label">库存</text>
          <input class="spec-input" type="number" v-model="spec.stock" placeholder="0" />
        </view>
      </view>
      <view v-if="form.specs.length > 1" class="spec-remove" @tap="removeSpec(index)">
        <text>删除该规格</text>
      </view>
    </view>
  </view>

  <button class="primary-btn" :disabled="submitting" @tap="submit">
    {{ submitting ? '提交中...' : (isEdit ? '保存' : '添加') }}
  </button>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { getFlashSale, addFlashSaleProduct, updateFlashSaleProduct } from '@/utils/api.js'

export default {
  data() {
    return {
      isEdit: false,
      productId: null,
      flashSaleId: null,
      productsInSale: [],
      submitting: false,
      form: {
        name: '',
        image: '',
        specs: [{ name: '默认', price: '', originalPrice: '', stock: 99 }]
      }
    }
  },
  onLoad(options) {
    if (options.flashSaleId) this.flashSaleId = options.flashSaleId
    if (options.id) {
      this.isEdit = true
      this.productId = options.id
      this.loadItem(options.id)
    }
  },
  methods: {
    goBack() { uni.navigateBack() },

    async loadItem(id) {
      uni.showLoading({ title: '加载中...' })
      try {
        // 从 flashSale 文档里找（不需要云端新接口）
        const res = await getFlashSale()
        const list = (res.data || [])
        const saleArr = Array.isArray(list) ? list : (list ? [list] : [])
        const sale = saleArr.find(s => (s.products || []).some(p => p._id === id))
        if (sale) {
          this.flashSaleId = sale._id
          const p = sale.products.find(x => x._id === id)
          if (p) {
            this.form.name = p.name || ''
            this.form.image = p.image || ''
            this.form.specs = (p.specs && p.specs.length)
              ? p.specs.map(s => ({ name: s.name || '', price: String(s.price ?? ''), originalPrice: String(s.originalPrice ?? ''), stock: s.stock ?? 0 }))
              : [{ name: '默认', price: '', originalPrice: '', stock: 99 }]
          }
        } else {
          uni.showToast({ title: '未找到该商品', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    addSpec() {
      this.form.specs.push({ name: '', price: '', originalPrice: '', stock: 99 })
    },
    removeSpec(index) {
      if (this.form.specs.length > 1) this.form.specs.splice(index, 1)
    },

    async pickAndUpload() {
      // 1. 选来源
      let src = null
      try {
        const r = await uni.showActionSheet({ itemList: ['拍照', '从相册选'] })
        src = r.tapIndex === 0 ? 'camera' : 'album'
      } catch (e) { return }
      // 2. 选图
      let img
      try {
        img = await uni.chooseImage({ sourceType: [src], count: 1, sizeType: ['compressed'] })
      } catch (e) { return }
      const tempPath = img.tempFilePaths[0]
      // 3. 直传云存储（uni-app 标准做法：APP/小程序直传，H5 自动走云函数中转）
      uni.showLoading({ title: '上传中...' })
      try {
        const cloudPath = `merchant/product/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
        const res = await uniCloud.uploadFile({ cloudPath, filePath: tempPath })
        this.form.image = res.fileID
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '上传失败: ' + (e.errMsg || e.message || ''), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    async submit() {
      if (this.submitting) return
      if (!this.form.name.trim()) return uni.showToast({ title: '请输入商品名称', icon: 'none' })
      if (!this.flashSaleId) return uni.showToast({ title: '缺少 flashSaleId', icon: 'none' })
      const validSpecs = this.form.specs
        .map(s => ({ name: (s.name || '').trim(), price: Number(s.price) || 0, originalPrice: Number(s.originalPrice) || 0, stock: Number(s.stock) || 0 }))
        .filter(s => s.name)
      if (validSpecs.length === 0) return uni.showToast({ title: '请至少填一个规格', icon: 'none' })

      const first = validSpecs[0]
      const data = {
        flashSaleId: this.flashSaleId,
        name: this.form.name.trim(),
        image: this.form.image,
        originalPrice: first.originalPrice || first.price || 0,
        flashPrice: first.price || 0,
        stock: first.stock || 0,
        specs: validSpecs
      }

      this.submitting = true
      uni.showLoading({ title: this.isEdit ? '保存中...' : '添加中...' })
      try {
        const res = this.isEdit
          ? await updateFlashSaleProduct(this.productId, data)
          : await addFlashSaleProduct(data)
        if (res && res.code === 0) {
          uni.showToast({ title: this.isEdit ? '已保存' : '已添加', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 800)
        } else {
          uni.showToast({ title: (res && res.msg) || '失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '请求失败', icon: 'none' })
      } finally {
        this.submitting = false
        uni.hideLoading()
      }
    }
  }
}
</script>

<style>
.page { background: #F5F1EB; min-height: 100vh; padding: 0 20rpx 200rpx; }

.back-bar { display: flex; align-items: center; height: 88rpx; }
.back-arrow { font-size: 48rpx; color: #000; font-weight: 300; padding: 0 8rpx; }
.page-title { font-size: 32rpx; font-weight: 600; color: #000; }

.card { background: #FFFFFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #000; }

.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-row.column { flex-direction: column; align-items: stretch; }
.form-label { width: 160rpx; font-size: 28rpx; color: #333; }
.form-row.column .form-label { width: auto; margin-bottom: 12rpx; }
.form-input { flex: 1; font-size: 28rpx; color: #000; min-width: 0; }

.image-picker { width: 240rpx; height: 240rpx; background: #FAFAFA; border: 2rpx dashed #DDD; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; overflow: hidden; align-self: center; }
.image-placeholder { display: flex; flex-direction: column; align-items: center; }
.image-icon { font-size: 60rpx; margin-bottom: 8rpx; }
.image-text { font-size: 22rpx; color: #999; }
.img-fill { width: 100%; height: 100%; }

.spec-card { background: #FAFAFA; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; position: relative; }
.spec-row { display: flex; align-items: center; padding: 6rpx 0; }
.spec-label { width: 100rpx; font-size: 26rpx; color: #666; }
.spec-input { flex: 1; font-size: 26rpx; color: #000; min-width: 0; }
.spec-grid { display: flex; flex-direction: column; gap: 4rpx; margin-top: 8rpx; }
.spec-remove { text-align: center; padding: 12rpx 0; margin-top: 8rpx; border-top: 1rpx solid #EEE; }
.spec-remove text { font-size: 24rpx; color: #F44336; }

.ghost-btn { padding: 6rpx 16rpx; border: 1rpx solid #DDD; border-radius: 8rpx; }
.ghost-btn text { font-size: 24rpx; color: #666; }
.ghost-btn.primary { background: #E8F5E9; border-color: #4CAF50; }
.ghost-btn.primary text { color: #4CAF50; font-weight: 500; }

.primary-btn { background: #4CAF50; color: #FFF; border-radius: 12rpx; font-size: 30rpx; margin-top: 24rpx; }
.primary-btn[disabled] { background: #A5D6A7; }
.primary-btn::after { border: none; }

.bottom-placeholder { height: 120rpx; }
</style>
