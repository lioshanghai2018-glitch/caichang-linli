<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack" v-if="showForm">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">{{ showForm ? (isEdit ? '编辑商品' : '添加商品') : '商品管理' }}</text>
      <view class="right-btn" v-if="!showForm" @tap="refresh">
        <text>刷新</text>
      </view>
    </view>

    <!-- 搜索筛选 -->
    <view class="search-bar" v-if="!showForm">
      <input class="search-input" v-model="keyword" placeholder="搜索商品名称" @confirm="search" />
      <view class="filter-btn" @tap="showCategoryFilter = !showCategoryFilter">
        <text>{{ selectedCategory || '全部分类' }}</text>
        <text class="arrow">▼</text>
      </view>
    </view>

    <!-- 分类筛选弹窗 -->
    <view class="filter-popup" v-if="showCategoryFilter">
      <view class="filter-item" :class="{ active: !selectedCategory }" @tap="selectCategory('')">
        <text>全部分类</text>
      </view>
      <view class="filter-item" v-for="cat in categories" :key="cat._id || cat.id" :class="{ active: selectedCategory === cat.name }" @tap="selectCategory(cat.name)">
        <text>{{ cat.name }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="product-list" v-if="!showForm">
      <scroll-view class="scroll-list" scroll-y="true" @scrolltolower="loadMore">
        <view class="product-card" v-for="product in filteredProducts" :key="product._id || product.id" @tap="editProduct(product)">
          <image class="product-image" :src="(product.images && product.images[0]) || product.image || '/static/images/default.png'" mode="aspectFill"></image>
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-category">{{ product.categoryName }}</text>
            <view class="product-price-row">
              <text class="product-price">¥{{ getMinPrice(product) }}</text>
              <text class="product-stock">库存: {{ getTotalStock(product) }}</text>
            </view>
            <view class="product-specs" v-if="product.specs?.length">
              <text class="spec-tag" v-for="(spec, idx) in product.specs.slice(0, 2)" :key="idx">{{ spec.name }}</text>
              <text class="spec-more" v-if="product.specs.length > 2">+{{ product.specs.length - 2 }}</text>
            </view>
          </view>
          <view class="product-actions">
            <view class="action-icon" @tap.stop="toggleStatus(product)">
              <text :class="product.status !== false ? 'iconfont icon-aihao' : 'iconfont icon-guanyuwomen'" :style="{ color: product.status !== false ? '#4F9A42' : '#999' }"></text>
            </view>
            <view class="action-icon delete" @tap.stop="confirmDelete(product)">
              <text class="iconfont icon-fenjian" style="color: #FF5252;"></text>
            </view>
          </view>
        </view>

        <view class="empty-hint" v-if="filteredProducts.length === 0 && !loading">
          <text>暂无商品</text>
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
          <view class="form-item">
            <text class="form-label">分类</text>
            <picker :value="categoryIndex" :range="categories" range-key="name" @change="onCategoryChange">
              <view class="picker-value">{{ form.categoryName || '请选择分类' }}</view>
            </picker>
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
                  <input class="spec-input price" type="digit" v-model="spec.price" placeholder="价格" />
                </view>
                <view class="spec-stock-wrap">
                  <input class="spec-input stock" type="number" v-model="spec.stock" placeholder="库存" />
                </view>
              </view>
              <view class="spec-actions">
                <view class="spec-delete" @tap="removeSpec(idx)" v-if="form.specs.length > 1">
                  <text>删除</text>
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
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, uploadImage } from '@/api'

export default {
  data() {
    return {
      products: [],
      filteredProducts: [],
      categories: [],
      keyword: '',
      selectedCategory: '',
      showCategoryFilter: false,
      categoryIndex: 0,
      loading: false,
      hasMore: false,

      showForm: false,
      isEdit: false,
      currentProductId: null,
      form: {
        name: '',
        categoryId: '',
        categoryName: '',
        images: [],
        specs: [{ name: '', price: '', stock: '' }],
        description: ''
      }
    }
  },
  onLoad() {
    this.loadCategories()
    this.loadProducts()
  },
  methods: {
    goBack() {
      this.showForm = false
    },
    refresh() {
      this.loadProducts()
    },
    async loadCategories() {
      try {
        const res = await getCategories()
        this.categories = res.data || []
      } catch (e) {
        console.error('加载分类失败', e)
      }
    },
    async loadProducts() {
      if (this.loading) return
      this.loading = true

      try {
        const res = await getProducts({})
        this.products = res.data || []
        this.applyFilter()
      } catch (e) {
        console.error('加载商品失败', e)
      }

      this.loading = false
    },
    selectCategory(catName) {
      this.selectedCategory = catName
      this.showCategoryFilter = false
      this.applyFilter()
    },
    search() {
      this.applyFilter()
    },
    applyFilter() {
      let result = this.products

      if (this.selectedCategory) {
        result = result.filter(p => p.categoryName === this.selectedCategory)
      }

      if (this.keyword) {
        result = result.filter(p => p.name.includes(this.keyword))
      }

      this.filteredProducts = result
    },
    loadMore() {
      // 分页加载
    },
    addProduct() {
      this.isEdit = false
      this.currentProductId = null
      this.form = {
        name: '',
        categoryId: '',
        categoryName: '',
        images: [],
        specs: [{ name: '', price: '', stock: '' }],
        description: ''
      }
      this.showForm = true
    },
    editProduct(product) {
      this.isEdit = true
      this.currentProductId = product._id || product.id
      this.form = {
        name: product.name || '',
        categoryId: product.categoryId || '',
        categoryName: product.categoryName || '',
        images: product.images || [],
        specs: product.specs?.length ? product.specs.map(s => ({
          name: s.name || '',
          price: s.price || '',
          stock: s.stock ?? ''
        })) : [{ name: '', price: '', stock: '' }],
        description: product.description || ''
      }
      // 设置分类索引
      const idx = this.categories.findIndex(c => c._id === product.categoryId || c.id === product.categoryId)
      if (idx >= 0) this.categoryIndex = idx
      this.showForm = true
    },
    addSpec() {
      this.form.specs.push({ name: '', price: '', stock: '' })
    },
    removeSpec(idx) {
      if (this.form.specs.length > 1) {
        this.form.specs.splice(idx, 1)
      }
    },
    onCategoryChange(e) {
      const idx = e.detail.value
      this.categoryIndex = idx
      if (this.categories[idx]) {
        this.form.categoryId = this.categories[idx]._id || this.categories[idx].id
        this.form.categoryName = this.categories[idx].name
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
            // 获取云存储的URL
            const imageUrl = uploadRes.fileID
            this.form.images.push(imageUrl)
            uni.hideLoading()
            uni.showToast({ title: '上传成功', icon: 'success' })
          } catch (e) {
            console.error('上传失败', e)
            uni.hideLoading()
            uni.showToast({ title: '上传失败', icon: 'none' })
          }
        },
        fail: () => {
          // 用户取消选择
        }
      })
    },
    removeImage(idx) {
      this.form.images.splice(idx, 1)
    },
    getMinPrice(product) {
      if (product.specs?.length) {
        const prices = product.specs.filter(s => s.price).map(s => Number(s.price))
        return prices.length ? Math.min(...prices).toFixed(2) : '0.00'
      }
      return product.price || '0.00'
    },
    getTotalStock(product) {
      if (product.specs?.length) {
        return product.specs.reduce((sum, s) => sum + (Number(s.stock) || 0), 0)
      }
      return product.stock || 0
    },
    cancelForm() {
      this.showForm = false
    },
    async submitForm() {
      if (!this.form.name) {
        uni.showToast({ title: '请输入商品名称', icon: 'none' })
        return
      }
      // 过滤有效的规格
      const validSpecs = this.form.specs.filter(s => s.name && s.price)
      if (validSpecs.length === 0) {
        uni.showToast({ title: '请至少添加一个有效规格', icon: 'none' })
        return
      }

      const submitData = {
        ...this.form,
        specs: validSpecs.map(s => ({
          name: s.name,
          price: Number(s.price),
          stock: Number(s.stock) || 0
        }))
      }

      try {
        if (this.isEdit) {
          await updateProduct(this.currentProductId, submitData)
          uni.showToast({ title: '修改成功', icon: 'success' })
        } else {
          await addProduct(submitData)
          uni.showToast({ title: '添加成功', icon: 'success' })
        }
        this.showForm = false
        this.loadProducts()
      } catch (e) {
        console.error('操作失败', e)
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    async toggleStatus(product) {
      const id = product._id || product.id
      const newStatus = product.status === false ? true : false
      try {
        await updateProduct(id, { status: newStatus })
        product.status = newStatus
        uni.showToast({ title: newStatus ? '已上架' : '已下架', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    confirmDelete(product) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该商品吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteProduct(product._id || product.id)
              this.products = this.products.filter(p => (p._id || p.id) !== (product._id || product.id))
              this.applyFilter()
              uni.showToast({ title: '已删除', icon: 'success' })
            } catch (e) {
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
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
.right-btn text {
  font-size: 28rpx;
  color: #4F9A42;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  padding: 20rpx;
  gap: 16rpx;
  background-color: #FFFFFF;
  position: fixed;
  top: 88rpx;
  left: 0;
  right: 0;
  z-index: 99;
}
.search-input {
  flex: 1;
  height: 72rpx;
  background-color: #F5F5F5;
  border-radius: 36rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
}
.filter-btn {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  background-color: #F5F5F5;
  border-radius: 36rpx;
  height: 72rpx;
}
.filter-btn text {
  font-size: 26rpx;
  color: #666;
}
.arrow {
  margin-left: 8rpx;
  font-size: 20rpx;
}

/* 分类筛选 */
.filter-popup {
  position: fixed;
  top: 180rpx;
  left: 20rpx;
  right: 20rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 16rpx;
  z-index: 98;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}
.filter-item {
  padding: 20rpx;
  border-radius: 8rpx;
}
.filter-item.active {
  background-color: #E8F5E9;
}
.filter-item.active text {
  color: #4F9A42;
}

/* 商品列表 */
.scroll-list {
  height: calc(100vh - 160rpx);
  padding: 20rpx;
  padding-top: 180rpx;
}
.product-card {
  display: flex;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background-color: #F5F5F5;
}
.product-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.product-category {
  font-size: 24rpx;
  color: #999;
}
.product-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.product-price {
  font-size: 32rpx;
  color: #FF6B6B;
  font-weight: 600;
}
.product-stock {
  font-size: 24rpx;
  color: #999;
}
.product-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  justify-content: center;
}
.action-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F5F5F5;
  border-radius: 50%;
}
.action-icon .iconfont {
  font-size: 32rpx;
}

/* 悬浮添加按钮 */
.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 150rpx;
  width: 112rpx;
  height: 112rpx;
  background-color: #4F9A42;
  border-radius: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(79, 154, 66, 0.3);
  z-index: 101;
}
.fab-btn text {
  font-size: 48rpx;
  color: #FFFFFF;
  font-weight: 300;
}

/* 商品表单 */
.form-scroll {
  height: calc(100vh - 88rpx);
  padding-top: 108rpx;
}
.form-section {
  background-color: #FFFFFF;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}
.form-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}
.form-item:last-child {
  border-bottom: none;
}
.form-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #333;
}
.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
}
.picker-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}
.image-list {
  display: flex;
  flex-wrap: wrap;
}
.image-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  margin-right: 16rpx;
  margin-bottom: 16rpx;
}
.image-item image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}
.delete-icon {
  position: absolute;
  top: -16rpx;
  right: -16rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: #FF5252;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #FFFFFF;
}
.add-image {
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
.add-image .iconfont {
  font-size: 48rpx;
  color: #999;
}
.add-image text:last-child {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
.upload-tip {
  font-size: 22rpx;
  color: #999;
  margin-top: 12rpx;
}

/* 规格样式 */
.spec-list {
  background-color: #FAFAFA;
  border-radius: 12rpx;
  padding: 16rpx;
}
.spec-item {
  background-color: #FFFFFF;
  border-radius: 8rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #F0F0F0;
}
.spec-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.spec-input {
  flex: 1;
  height: 64rpx;
  background-color: #F5F5F5;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
}
.spec-price-wrap, .spec-stock-wrap {
  display: flex;
  align-items: center;
  background-color: #F5F5F5;
  border-radius: 8rpx;
  padding-left: 16rpx;
}
.spec-price-wrap {
  width: 180rpx;
}
.spec-stock-wrap {
  width: 140rpx;
}
.price-prefix {
  font-size: 26rpx;
  color: #666;
}
.spec-input.price, .spec-input.stock {
  flex: 1;
  background: transparent;
  padding: 0;
}
.spec-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
}
.spec-delete {
  padding: 8rpx 16rpx;
  background-color: #FFEBEE;
  border-radius: 8rpx;
}
.spec-delete text {
  font-size: 24rpx;
  color: #FF5252;
}
.add-spec-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  border: 2rpx dashed #DDD;
  border-radius: 8rpx;
  margin-top: 8rpx;
}
.add-spec-btn .iconfont {
  font-size: 32rpx;
  color: #4F9A42;
  margin-right: 8rpx;
}
.add-spec-btn text {
  font-size: 26rpx;
  color: #4F9A42;
}

/* 商品卡片规格标签 */
.product-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
}
.spec-tag {
  font-size: 22rpx;
  color: #666;
  background-color: #F5F5F5;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}
.spec-more {
  font-size: 22rpx;
  color: #999;
}

.form-textarea {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  min-height: 160rpx;
  text-align: left;
}
.form-actions {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  margin-top: 40rpx;
}
.btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn text {
  font-size: 32rpx;
}
.btn.cancel {
  background-color: #F5F5F5;
}
.btn.cancel text {
  color: #666;
}
.btn.confirm {
  background-color: #4F9A42;
}
.btn.confirm text {
  color: #FFFFFF;
}

.empty-hint {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
.load-more {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
  font-size: 24rpx;
}
</style>