<template>
<view class="page">
  <!-- 分类标签栏 -->
  <view class="category-tabs">
    <view
      v-for="cat in visibleCategories"
      :key="cat.key"
      class="cat-tab"
      :class="{active: currentCat === cat.key}"
      @tap="switchCat(cat.key)"
    >
      <text>{{cat.label}}</text>
    </view>
  </view>

  <!-- 搜索和排序 -->
  <view class="search-sort-bar">
    <view class="search-bar">
      <input class="search-input" placeholder="搜索商品" v-model="searchKeyword" />
      <text class="search-icon">🔍</text>
    </view>
    <view class="sort-btn" @tap="showSortOptions">
      <text class="sort-icon">⇅</text>
      <text class="sort-text">{{sortLabel}}</text>
    </view>
  </view>

  <!-- 商品列表 -->
  <scroll-view class="goods-list" scroll-y>
    <view class="goods-item" v-for="(item, idx) in goodsList" :key="idx" @tap="goEdit(item.id)">
      <view class="goods-img">
        <image :src="item.image" mode="aspectFill" v-if="item.image && !item.imageErr" @error="onImgErr(item)" />
        <text v-else class="img-placeholder">🥬</text>
      </view>
      <view class="goods-info">
        <text class="goods-name">{{item.name}}</text>
        <text class="goods-spec">{{item.spec}}</text>
        <view class="goods-tags" v-if="item.tags && item.tags.length">
          <text class="tag" v-for="(tag, ti) in item.tags" :key="ti">{{tag}}</text>
        </view>
      </view>
      <view class="goods-right">
        <text class="goods-price">¥{{item.price}}</text>
        <text class="goods-stock">库存{{item.stock}}</text>
        <view class="switch-wrap" @tap.stop="toggleStatus(item.id)">
          <view class="switch" :class="{on: item.status === 'online'}">
            <view class="switch-dot"></view>
          </view>
        </view>
        <text class="del-btn" @tap.stop="delProduct(item.id, item.name)">删除</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="goodsList.length === 0">
      <text class="empty-icon">🥬</text>
      <text class="empty-text">暂无商品</text>
      <view class="empty-btn" @tap="goAdd">
        <text>添加商品</text>
      </view>
    </view>
  </scroll-view>

  <!-- 底部批量操作栏 -->
  <view class="bottom-bar" v-if="goodsList.length > 0">
    <view class="bar-item" @tap="selectAll">
      <view class="check-box" :class="{checked: selectedAll}">
        <text v-if="selectedAll">✓</text>
      </view>
      <text class="bar-text">全选</text>
    </view>
    <view class="bar-item" @tap="batchOnline" v-if="selectedCount > 0">
      <text class="bar-text primary">上架({{selectedCount}})</text>
    </view>
    <view class="bar-item" @tap="batchOffline" v-if="selectedCount > 0">
      <text class="bar-text danger">下架({{selectedCount}})</text>
    </view>
  </view>

  <!-- 右下角添加按钮 -->
  <view class="add-btn" @tap="goAdd">
    <text class="add-icon">+</text>
  </view>

  <view class="bottom-placeholder"></view>

  <merchant-tabbar current="product" />
</view>
</template>

<script>
import merchantTabbar from '@/components/merchant-tabbar/merchant-tabbar.vue'
import { getProducts, toggleProductStatus, updateProduct, deleteProduct, getCategories } from '@/utils/api.js'
export default {
  components: { merchantTabbar },
  data() {
    return {
      currentCat: 'all',
      searchKeyword: '',
      sortKey: 'default',
      sortLabel: '默认排序',
      selectedAll: false,
      selectedCount: 0,
      loading: false,
      categories: [{ key: 'all', label: '全部', name: '' }],
      goodsList: []
    }
  },
  computed: {
    // 把"全部"放在最前面，其余按 sort 升序排
    visibleCategories() {
      const real = (this.categories || []).filter(c => c.key !== 'all')
      return [{ key: 'all', label: '全部', name: '' }].concat(real)
    }
  },
  onLoad() {
    this.fetchCategories()
    this.fetchProducts()
  },
  onShow() {
    this.fetchCategories()
    this.fetchProducts()
    this.startPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    startPolling() {
      this.stopPolling()
      this._pollTimer = setInterval(() => this.fetchProducts(), 10000)
    },
    stopPolling() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer)
        this._pollTimer = null
      }
    },
    async fetchCategories() {
      try {
        const res = await getCategories()
        const list = Array.isArray(res.data) ? res.data : (res.data?.list || [])
        // 映射成 { key, label, name }，只保留启用的
        const enabled = list.filter(c => c.status !== false)
        this.categories = enabled.map(c => ({ key: c.key || c._id, label: c.name, name: c.name }))
      } catch (e) {
        // 静默失败：分类拉不到就用默认的"全部"
        console.warn('分类加载失败', e)
      }
    },
    async fetchProducts() {
      this.loading = true
      try {
        const cat = this.categories.find(c => c.key === this.currentCat) || {}
        // 'all' 时不传 category，让云端返回全部
        const params = { keyword: this.searchKeyword }
        if (this.currentCat !== 'all') {
          params.category = this.currentCat
          params.categoryName = cat.name || ''
        }
        const res = await getProducts(params)
        // 注意：request 现在直接 resolve body，所以 res 是 {code,data:list}，商品数组在 res.data
        const list = Array.isArray(res.data) ? res.data : (res.data?.list || [])
        this.goodsList = list.map(p => ({
          id: p._id,
          name: p.name || '',
          spec: p.spec || (p.specs && p.specs[0] ? p.specs[0].name : ''),
          price: (p.price != null ? Number(p.price).toFixed(2) : (p.specs && p.specs[0] ? Number(p.specs[0].price).toFixed(2) : '0.00')),
          stock: p.stock != null ? p.stock : (p.specs && p.specs[0] ? (p.specs[0].stock || 0) : 0),
          status: (p.status === true || p.status === 'online' || p.status === 1) ? 'online' : 'offline',
          image: p.coverImage || p.image || (p.images && p.images[0]) || '',
          tags: p.tags || []
        }))
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    switchCat(key) {
      this.currentCat = key
      this.fetchProducts()
    },
    onImgErr(item) {
      // 标记当前 item 图片加载失败，下一次渲染会切换到占位符
      item.imageErr = true
    },
    showSortOptions() {
      uni.showActionSheet({
        itemList: ['默认排序', '价格升序', '价格降序', '库存升序', '库存降序'],
        success: (res) => {
          const options = ['default', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc']
          this.sortKey = options[res.tapIndex]
          this.sortLabel = ['默认排序', '价格升序', '价格降序', '库存升序', '库存降序'][res.tapIndex]
        }
      })
    },
    goEdit(id) {
      uni.navigateTo({ url: `/pages/product/add?id=${id}` })
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/product/add' })
    },
    async toggleStatus(id) {
      const item = this.goodsList.find(g => g.id === id)
      if (!item) return
      const nextStatus = item.status === 'online' ? 'offline' : 'online'
      try {
        await updateProduct(id, { status: nextStatus })
        item.status = nextStatus
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      }
    },
    delProduct(id, name) {
      uni.showModal({
        title: '删除商品',
        content: `确定删除「${name}」？删除后无法恢复。`,
        confirmColor: '#FF0000',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteProduct(id)
            uni.showToast({ title: '已删除', icon: 'success' })
            this.fetchProducts()
          } catch (e) {
            uni.showToast({ title: e.msg || '删除失败', icon: 'none' })
          }
        }
      })
    },
    selectAll() {
      this.selectedAll = !this.selectedAll
    },
    batchOnline() {
      uni.showToast({ title: '批量上架成功', icon: 'success' })
    },
    batchOffline() {
      uni.showToast({ title: '批量下架成功', icon: 'success' })
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

/* 分类标签栏 */
.category-tabs {
  display: flex;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 16rpx;
  overflow-x: auto;
}
.cat-tab {
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}
.cat-tab text {
  font-size: 26rpx;
  color: #666666;
}
.cat-tab.active {
  background: #4CAF50;
}
.cat-tab.active text {
  color: #FFFFFF;
  font-weight: 500;
}

/* 搜索和排序 */
.search-sort-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}
.search-input::placeholder {
  color: #999999;
}
.search-icon {
  font-size: 32rpx;
  margin-left: 12rpx;
}
.sort-btn {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
}
.sort-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}
.sort-text {
  font-size: 26rpx;
  color: #666666;
}

/* 商品列表 */
.goods-list {
  height: calc(100vh - 300rpx);
}
.goods-item {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}
.goods-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #F5F5F5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.goods-img image {
  width: 100%;
  height: 100%;
}
.img-placeholder {
  font-size: 60rpx;
}
.goods-info {
  flex: 1;
  min-width: 0;
}
.goods-name {
  font-size: 28rpx;
  color: #000000;
  font-weight: 500;
  display: block;
  margin-bottom: 4rpx;
}
.goods-spec {
  font-size: 24rpx;
  color: #999999;
  display: block;
  margin-bottom: 8rpx;
}
.goods-tags {
  display: flex;
  gap: 8rpx;
}
.tag {
  padding: 2rpx 12rpx;
  background: #FFF3E0;
  color: #FF6B00;
  font-size: 20rpx;
  border-radius: 4rpx;
}
.goods-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex-shrink: 0;
}
.goods-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #FF6B00;
}
.goods-stock {
  font-size: 24rpx;
  color: #999999;
}
.switch-wrap {
  margin-top: 8rpx;
}
.del-btn {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #FF0000;
  padding: 4rpx 12rpx;
  border: 1rpx solid #FF0000;
  border-radius: 6rpx;
  line-height: 1.4;
}
.switch {
  width: 80rpx;
  height: 44rpx;
  background: #E8E8E8;
  border-radius: 22rpx;
  padding: 4rpx;
  transition: all 0.3s;
}
.switch.on {
  background: #4CAF50;
}
.switch-dot {
  width: 36rpx;
  height: 36rpx;
  background: #FFFFFF;
  border-radius: 50%;
  transition: all 0.3s;
}
.switch.on .switch-dot {
  transform: translateX(36rpx);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 32rpx;
}
.empty-btn {
  padding: 16rpx 48rpx;
  background: #4CAF50;
  border-radius: 40rpx;
}
.empty-btn text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

/* 底部批量操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 120rpx;
  left: 20rpx;
  right: 20rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}
.bar-item {
  display: flex;
  align-items: center;
}
.check-box {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #E8E8E8;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
}
.check-box.checked {
  background: #4CAF50;
  border-color: #4CAF50;
}
.check-box text {
  font-size: 24rpx;
  color: #FFFFFF;
}
.bar-text {
  font-size: 28rpx;
  color: #666666;
}
.bar-text.primary {
  color: #4CAF50;
}
.bar-text.danger {
  color: #FF6B00;
}

/* 右下角添加按钮 */
.add-btn {
  position: fixed;
  bottom: 260rpx;
  right: 24rpx;
  width: 96rpx;
  height: 96rpx;
  background: #4CAF50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(76,175,80,0.4);
}
.add-icon {
  font-size: 60rpx;
  color: #FFFFFF;
  font-weight: 300;
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>