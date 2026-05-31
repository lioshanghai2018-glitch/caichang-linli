<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack" v-if="showForm">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">{{ showForm ? (isEdit ? '编辑特惠商品' : '添加特惠商品') : '特惠活动' }}</text>
      <view class="right-btn" v-if="!showForm" @tap="refresh">
        <text>刷新</text>
      </view>
    </view>

    <!-- 活动设置 -->
    <view class="section" v-if="!showForm">
      <view class="section-title">活动设置</view>
      <view class="form-item">
        <text class="form-label">活动状态</text>
        <view class="switch-wrap">
          <switch :checked="activity.status" @change="toggleActivity" color="#4F9A42" />
        </view>
      </view>
    </view>

    <!-- 特惠商品列表 -->
    <view class="product-list" v-if="!showForm">
      <view class="section-header">
        <text class="section-title">特惠商品</text>
      </view>

      <scroll-view class="scroll-list" scroll-y="true">
        <view class="product-card" v-for="item in products" :key="item._id || item.id" @tap="editProduct(item)">
          <image class="product-image" :src="(item.images && item.images[0]) || item.image || '/static/images/default.png'" mode="aspectFill"></image>
          <view class="product-info">
            <text class="product-name">{{ item.name }}</text>
            <view class="price-row">
              <text class="flash-price">¥{{ getMinFlashPrice(item) }}</text>
              <text class="original-price">¥{{ getMinOriginalPrice(item) }}</text>
            </view>
            <view class="product-specs" v-if="item.specs?.length">
              <text class="spec-tag" v-for="(spec, idx) in item.specs.slice(0, 2)" :key="idx">{{ spec.name }}</text>
              <text class="spec-more" v-if="item.specs.length > 2">+{{ item.specs.length - 2 }}</text>
            </view>
          </view>
          <view class="product-actions">
            <view class="action-icon delete" @tap.stop="confirmDelete(item)">
              <text class="iconfont icon-fenjian" style="color: #FF5252;"></text>
            </view>
          </view>
        </view>

        <view class="empty-hint" v-if="products.length === 0 && !loading">
          <text>暂无特惠商品</text>
        </view>

        <view class="load-more" v-if="hasMore">
          <text>加载更多...</text>
        </view>
      </scroll-view>

      <!-- 添加按钮 -->
      <view class="fab-btn" @tap="addProduct">
        <text>+</text>
      </view>
    </view>

    <!-- 商品表单 -->
    <view class="product-form" v-if="showForm">
      <scroll-view class="form-scroll" scroll-y="true">
        <view class="form-section">
          <view class="form-item">
            <text class="form-label">商品名称</text>
            <input class="form-input" v-model="form.name" placeholder="请输入商品名称" />
          </view>
        </view>

        <view class="form-section">
          <text class="section-title">商品图片</text>
          <view class="image-list">
            <view class="image-item" v-for="(img, idx) in form.images" :key="idx">
              <image :src="img" mode="aspectFill"></image>
              <view class="delete-icon" @tap="removeImage(idx)">×</view>
            </view>
            <view class="add-image" @tap="chooseImage" v-if="form.images.length < 9">
              <text class="iconfont icon-jiahao"></text>
              <text>添加图片</text>
            </view>
          </view>
          <view class="upload-tip">最多9张，支持拍照或从相册选择</view>
        </view>

        <view class="form-section">
          <text class="section-title">规格设置</text>
          <view class="spec-list">
            <view class="spec-item" v-for="(spec, idx) in form.specs" :key="idx">
              <view class="spec-row">
                <input class="spec-input" v-model="spec.name" placeholder="规格名称（如：500g/份）" />
                <view class="spec-price-wrap">
                  <text class="price-prefix">¥</text>
                  <input class="spec-input price" type="digit" v-model="spec.originalPrice" placeholder="原价" />
                </view>
              </view>
              <view class="spec-row">
                <view class="spec-price-wrap flash">
                  <text class="price-prefix">特惠¥</text>
                  <input class="spec-input price" type="digit" v-model="spec.flashPrice" placeholder="特惠价" />
                </view>
              </view>
              <view class="spec-actions">
                <view class="spec-delete" @tap="removeSpec(idx)" v-if="form.specs.length > 1">
                  <text>删除规格</text>
                </view>
              </view>
            </view>
            <view class="add-spec-btn" @tap="addSpec">
              <text class="iconfont icon-jiahao"></text>
              <text>添加规格</text>
            </view>
          </view>
        </view>

        <view class="form-section">
          <view class="form-item">
            <text class="form-label">描述</text>
            <textarea class="form-textarea" v-model="form.description" placeholder="请输入商品描述" />
          </view>
        </view>

        <view class="form-actions">
          <view class="btn cancel" @tap="cancelForm">
            <text>取消</text>
          </view>
          <view class="btn confirm" @tap="submitForm">
            <text>保存</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { getFlashSale, saveFlashSale, getFlashSaleProducts, addFlashSaleProduct, updateFlashSaleProduct, deleteFlashSaleProduct, uploadImage } from '@/api'

export default {
  data() {
    return {
      activity: { status: false },
      products: [],
      loading: false,
      hasMore: false,

      showForm: false,
      isEdit: false,
      currentProductId: null,
      form: {
        name: '',
        images: [],
        specs: [{ name: '', originalPrice: '', flashPrice: '' }],
        description: ''
      }
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    goBack() {
      this.showForm = false
    },
    refresh() {
      this.loadData()
    },
    async loadData() {
      this.loading = true

      try {
        const res = await getFlashSale()
        this.activity = res.data || { status: false }
      } catch (e) {
        console.error('加载活动失败', e)
      }

      try {
        const res = await getFlashSaleProducts({})
        this.products = res.data || []
      } catch (e) {
        console.error('加载商品失败', e)
      }

      this.loading = false
    },
    async toggleActivity(e) {
      this.activity.status = e.detail.value
      try {
        await saveFlashSale({ status: this.activity.status })
        uni.showToast({ title: this.activity.status ? '已开启' : '已关闭', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    getMinFlashPrice(item) {
      if (!item.specs || item.specs.length === 0) return item.flashPrice || 0
      return Math.min(...item.specs.map(s => Number(s.flashPrice) || 0))
    },
    getMinOriginalPrice(item) {
      if (!item.specs || item.specs.length === 0) return item.originalPrice || 0
      return Math.min(...item.specs.map(s => Number(s.originalPrice) || 0))
    },
    addProduct() {
      this.isEdit = false
      this.currentProductId = null
      this.form = {
        name: '',
        images: [],
        specs: [{ name: '', originalPrice: '', flashPrice: '' }],
        description: ''
      }
      this.showForm = true
    },
    editProduct(item) {
      this.isEdit = true
      this.currentProductId = item._id || item.id
      this.form = {
        name: item.name || '',
        images: item.images || [],
        specs: item.specs?.length ? item.specs.map(s => ({
          name: s.name || '',
          originalPrice: s.originalPrice || '',
          flashPrice: s.flashPrice || ''
        })) : [{ name: '', originalPrice: '', flashPrice: '' }],
        description: item.description || ''
      }
      this.showForm = true
    },
    addSpec() {
      this.form.specs.push({ name: '', originalPrice: '', flashPrice: '' })
    },
    removeSpec(idx) {
      if (this.form.specs.length > 1) {
        this.form.specs.splice(idx, 1)
      }
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sourceType: ['camera', 'album'],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0]
          uni.showLoading({ title: '上传中...' })
          try {
            const uploadRes = await uploadImage(tempFilePath)
            const imageUrl = uploadRes.fileID
            this.form.images.push(imageUrl)
            uni.hideLoading()
          } catch (e) {
            console.error('上传失败', e)
            uni.hideLoading()
            uni.showToast({ title: '上传失败', icon: 'none' })
          }
        }
      })
    },
    removeImage(idx) {
      this.form.images.splice(idx, 1)
    },
    cancelForm() {
      this.showForm = false
    },
    async submitForm() {
      if (!this.form.name) {
        uni.showToast({ title: '请输入商品名称', icon: 'none' })
        return
      }

      // 验证至少有一个有效的规格
      const validSpecs = this.form.specs.filter(s => s.name && (s.originalPrice || s.flashPrice))
      if (validSpecs.length === 0) {
        uni.showToast({ title: '请至少添加一个规格', icon: 'none' })
        return
      }

      const data = {
        name: this.form.name,
        images: this.form.images,
        specs: validSpecs,
        description: this.form.description
      }

      // 计算一个默认值用于列表展示
      if (!data.originalPrice && validSpecs[0]) {
        data.originalPrice = validSpecs[0].originalPrice
      }
      if (!data.flashPrice && validSpecs[0]) {
        data.flashPrice = validSpecs[0].flashPrice
      }

      try {
        if (this.isEdit) {
          await updateFlashSaleProduct(this.currentProductId, data)
          uni.showToast({ title: '更新成功', icon: 'success' })
        } else {
          await addFlashSaleProduct(data)
          uni.showToast({ title: '添加成功', icon: 'success' })
        }
        this.showForm = false
        this.loadData()
      } catch (e) {
        console.error('保存失败', e)
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    },
    confirmDelete(item) {
      uni.showModal({
        title: '确认删除',
        content: '删除该特惠商品？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteFlashSaleProduct(item._id || item.id)
              this.products = this.products.filter(p => (p._id || p.id) !== (item._id || item.id))
              uni.showToast({ title: '已删除', icon: 'success' })
            } catch (e) {
              console.error('删除失败', e)
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #F5F1EB; }
.nav-bar { display: flex; align-items: center; height: 88rpx; background-color: #FFFFFF; padding: 0 24rpx; }
.back-btn { width: 56rpx; display: flex; align-items: center; }
.back-arrow { font-size: 44rpx; color: #333; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #333; text-align: center; }
.right-btn { font-size: 28rpx; color: #4F9A42; }

.section { background: #FFF; margin: 20rpx; border-radius: 16rpx; padding: 24rpx; }
.form-item { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #F0F0F0; }
.form-item:last-child { border-bottom: none; }
.form-label { width: 140rpx; font-size: 28rpx; color: #333; }
.switch-wrap { margin-left: auto; }

/* 商品列表 */
.product-list { padding: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; }
.scroll-list { height: calc(100vh - 300rpx); }
.product-card { display: flex; background: #FFF; border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.product-image { width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #F5F5F5; }
.product-info { flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; justify-content: center; }
.product-name { font-size: 28rpx; color: #333; font-weight: 600; margin-bottom: 8rpx; }
.price-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; }
.flash-price { font-size: 32rpx; color: #FF3333; font-weight: 600; }
.original-price { font-size: 24rpx; color: #999; text-decoration: line-through; }
.product-specs { display: flex; gap: 8rpx; flex-wrap: wrap; }
.spec-tag { font-size: 20rpx; color: #666; background: #F5F5F5; padding: 4rpx 12rpx; border-radius: 8rpx; }
.spec-more { font-size: 20rpx; color: #999; }
.product-actions { display: flex; flex-direction: column; justify-content: center; gap: 12rpx; }
.action-icon { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.action-icon .iconfont { font-size: 40rpx; }

.empty-hint { text-align: center; padding: 100rpx 0; color: #999; }
.load-more { text-align: center; padding: 20rpx; color: #999; font-size: 24rpx; }

/* FAB按钮 */
.fab-btn { position: fixed; right: 40rpx; bottom: 60rpx; width: 100rpx; height: 100rpx; background: #4F9A42; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(79,154,66,0.4); z-index: 100; }
.fab-btn text { font-size: 60rpx; color: #FFF; font-weight: 300; line-height: 1; }

/* 商品表单 */
.product-form { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #F5F1EB; z-index: 200; }
.form-scroll { height: 100%; padding-bottom: 120rpx; }
.form-section { background: #FFF; margin: 20rpx; border-radius: 16rpx; padding: 24rpx; }
.form-section .form-item { padding: 24rpx 0; }
.form-input { flex: 1; font-size: 28rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; }
.picker-value { flex: 1; font-size: 28rpx; text-align: right; color: #333; }

.image-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.image-item { position: relative; width: 200rpx; height: 200rpx; }
.image-item image { width: 100%; height: 100%; border-radius: 12rpx; }
.delete-icon { position: absolute; top: -16rpx; right: -16rpx; width: 48rpx; height: 48rpx; background: rgba(0,0,0,0.5); border-radius: 50%; color: #FFF; font-size: 32rpx; display: flex; align-items: center; justify-content: center; }
.add-image { width: 200rpx; height: 200rpx; background: #F5F5F5; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; }
.add-image .iconfont { font-size: 48rpx; color: #999; }
.add-image text { font-size: 24rpx; color: #999; }
.upload-tip { font-size: 24rpx; color: #999; margin-top: 12rpx; text-align: center; }

.spec-list { display: flex; flex-direction: column; gap: 16rpx; }
.spec-item { background: #F9F9F9; border-radius: 12rpx; padding: 20rpx; }
.spec-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.spec-input { flex: 1; height: 64rpx; background: #FFF; border-radius: 8rpx; padding: 0 16rpx; font-size: 26rpx; }
.spec-price-wrap { display: flex; align-items: center; background: #FFF; border-radius: 8rpx; height: 64rpx; flex: 1; }
.spec-price-wrap.flash { background: #FFEBEB; }
.price-prefix { padding: 0 12rpx; font-size: 26rpx; color: #333; white-space: nowrap; }
.spec-price-wrap.flash .price-prefix { color: #FF3333; }
.spec-input.price { flex: 1; border: none; background: transparent; height: 64rpx; }
.spec-stock-wrap { width: 140rpx; }
.spec-actions { display: flex; justify-content: flex-end; }
.spec-delete { padding: 8rpx 16rpx; font-size: 24rpx; color: #FF5252; }
.add-spec-btn { display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 20rpx; border: 2rpx dashed #E0E0E0; border-radius: 12rpx; }
.add-spec-btn .iconfont { font-size: 32rpx; color: #4F9A42; }
.add-spec-btn text { font-size: 26rpx; color: #4F9A42; }

.form-textarea { flex: 1; font-size: 28rpx; min-height: 120rpx; padding: 12rpx; background: #F9F9F9; border-radius: 8rpx; border: none; resize: none; }

.form-actions { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 20rpx; padding: 20rpx 32rpx; background: #FFF; box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.06); }
.btn { flex: 1; height: 88rpx; border-radius: 44rpx; display: flex; align-items: center; justify-content: center; }
.btn text { font-size: 30rpx; font-weight: 600; }
.btn.cancel { background: #F5F5F5; }
.btn.cancel text { color: #666; }
.btn.confirm { background: #4F9A42; }
.btn.confirm text { color: #FFF; }
</style>