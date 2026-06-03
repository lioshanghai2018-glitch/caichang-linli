<template>
<view class="page">
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">团购特惠</text>
  </view>

  <!-- 活动设置卡 -->
  <view class="card">
    <view class="card-header">
      <text class="card-title">活动设置</text>
      <view class="status-badge" :class="statusClass">
        <text>{{ saleStatus }}</text>
      </view>
    </view>

    <view class="form-row">
      <text class="form-label">活动名称</text>
      <input class="form-input" v-model="saleForm.name" placeholder="请输入活动名称" />
    </view>

    <view class="form-row">
      <text class="form-label">开始时间</text>
      <picker mode="datetime" :value="formatPicker(saleForm.startTime)" @change="(e) => saleForm.startTime = parsePicker(e.detail.value)">
        <view class="form-picker">{{ formatDisplay(saleForm.startTime) || '请选择' }}</view>
      </picker>
    </view>

    <view class="form-row">
      <text class="form-label">结束时间</text>
      <picker mode="datetime" :value="formatPicker(saleForm.endTime)" @change="(e) => saleForm.endTime = parsePicker(e.detail.value)">
        <view class="form-picker">{{ formatDisplay(saleForm.endTime) || '请选择' }}</view>
      </picker>
    </view>

    <view class="form-row">
      <text class="form-label">启用活动</text>
      <switch :checked="saleForm.status" @change="(e) => saleForm.status = e.detail.value" color="#4CAF50" />
    </view>

    <button class="primary-btn" @tap="saveSale">保存活动设置</button>
  </view>

  <!-- 商品列表 -->
  <view class="card">
    <view class="card-header">
      <text class="card-title">特惠商品 ({{ products.length }})</text>
      <view class="header-btns">
        <view class="ghost-btn" @tap="openLib">
          <text>从商品库选</text>
        </view>
        <view class="ghost-btn primary" @tap="goAddProduct">
          <text>+ 新增商品</text>
        </view>
      </view>
    </view>

    <view v-if="products.length === 0 && !loading" class="empty-block">
      <text class="empty-icon">🎁</text>
      <text class="empty-text">暂无特惠商品</text>
    </view>

    <view v-for="item in products" :key="item._id" class="product-card">
      <view class="product-main">
        <view class="product-img">
          <image v-if="item.image" :src="item.image" mode="aspectFill" class="img-fill" />
          <text v-else class="img-placeholder">🎁</text>
        </view>
        <view class="product-info">
          <text class="product-name">{{ item.name }}</text>
          <view class="product-price-row">
            <text class="price-now">¥{{ item.flashPrice }}</text>
            <text class="price-original">¥{{ item.originalPrice }}</text>
          </view>
          <text class="product-stock">库存 {{ item.stock }} | {{ (item.specs || []).length }} 个规格</text>
        </view>
      </view>
      <view class="product-actions">
        <view class="action-btn" @tap="goEditProduct(item)"><text>编辑</text></view>
        <view class="action-btn danger" @tap="delProduct(item)"><text>删除</text></view>
      </view>
    </view>
  </view>

  <!-- 从商品库选底部弹窗 -->
  <view v-if="libVisible" class="lib-mask" @tap="libVisible = false">
    <view class="lib-sheet" @tap.stop>
      <view class="sheet-header">
        <text class="sheet-title">从商品库选 ({{ selectedIds.length }})</text>
        <text class="sheet-close" @tap="libVisible = false">✕</text>
      </view>
      <scroll-view class="lib-list" scroll-y>
        <view v-if="productLib.length === 0" class="empty-block">
          <text class="empty-text">商品库为空</text>
        </view>
        <view
          v-for="p in productLib"
          :key="p._id"
          class="lib-item"
          :class="{ selected: selectedIds.includes(p._id) }"
          @tap="toggleSelect(p._id)"
        >
          <view class="lib-check">
            <text v-if="selectedIds.includes(p._id)">✓</text>
          </view>
          <view class="lib-info">
            <text class="lib-name">{{ p.name }}</text>
            <text class="lib-price">¥{{ p.specs?.[0]?.price || 0 }} | 库存 {{ p.specs?.[0]?.stock || 0 }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="sheet-footer">
        <button class="primary-btn" @tap="addFromLib">添加选中 ({{ selectedIds.length }})</button>
      </view>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { getFlashSale, saveFlashSale, getFlashSaleProducts, addFlashSaleProduct, deleteFlashSaleProduct, getProducts } from '@/utils/api.js'

export default {
  data() {
    return {
      loading: false,
      flashSale: null,
      saleForm: { id: null, name: '限时特惠活动', startTime: '', endTime: '', status: true },
      products: [],
      libVisible: false,
      productLib: [],
      selectedIds: []
    }
  },
  computed: {
    saleStatus() {
      if (!this.flashSale) return '未设置'
      const now = Date.now()
      if (!this.flashSale.status) return '已禁用'
      if (now < this.flashSale.startTime) return '未开始'
      if (now > this.flashSale.endTime) return '已结束'
      return '进行中'
    },
    statusClass() {
      const s = this.saleStatus
      if (s === '进行中') return 'active'
      if (s === '已结束' || s === '已禁用') return 'ended'
      return 'pending'
    }
  },
  onShow() {
    this.fetchAll()
  },
  methods: {
    goBack() { uni.navigateBack() },

    // 时间格式：ms ↔ picker 'YYYY-MM-DD HH:mm'
    formatPicker(ms) {
      if (!ms) return ''
      const d = new Date(Number(ms))
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    parsePicker(str) {
      if (!str) return ''
      return new Date(str.replace(/-/g, '/')).getTime()
    },
    formatDisplay(ms) { return this.formatPicker(ms) },

    async fetchAll() {
      this.loading = true
      try {
        const saleRes = await getFlashSale()
        console.log('[groupbuy] getFlashSale 响应:', JSON.stringify(saleRes))
        const list = (saleRes.data || [])
        const saleArr = Array.isArray(list) ? list : (list ? [list] : [])
        const now = Date.now()
        const first = saleArr.find(s => (s.products || []).length > 0)
          || saleArr.find(s => s.status === true && s.startTime <= now && s.endTime > now)
          || saleArr[0]
          || null
        console.log('[groupbuy] 选中活动:', first && first._id, 'products=', (first && first.products || []).length)
        if (first) {
          this.flashSale = first
          this.saleForm = { id: first._id, name: first.name || '限时特惠活动', startTime: first.startTime, endTime: first.endTime, status: !!first.status }
          const pRes = await getFlashSaleProducts({ flashSaleId: first._id })
          console.log('[groupbuy] getFlashSaleProducts 响应:', JSON.stringify(pRes))
          this.products = (pRes.data || [])
          console.log('[groupbuy] this.products 长度:', this.products.length)
        } else {
          this.flashSale = null
          this.saleForm = { id: null, name: '限时特惠活动', startTime: Date.now(), endTime: Date.now() + 7 * 86400000, status: true }
          this.products = []
        }
      } catch (e) {
        console.error('[groupbuy] 加载失败', e)
      } finally {
        this.loading = false
      }
    },

    async saveSale() {
      if (!this.saleForm.name) return uni.showToast({ title: '请输入活动名', icon: 'none' })
      if (!this.saleForm.startTime || !this.saleForm.endTime) return uni.showToast({ title: '请选时间', icon: 'none' })
      uni.showLoading({ title: '保存中...' })
      try {
        const res = await saveFlashSale({
          id: this.saleForm.id,
          name: this.saleForm.name,
          startTime: Number(this.saleForm.startTime),
          endTime: Number(this.saleForm.endTime),
          status: this.saleForm.status
        })
        if (res && res.code === 0) {
          uni.showToast({ title: '已保存', icon: 'success' })
          this.fetchAll()
        } else {
          uni.showToast({ title: (res && res.msg) || '保存失败', icon: 'none' })
        }
      } finally { uni.hideLoading() }
    },

    goAddProduct() {
      if (!this.flashSale) return uni.showToast({ title: '请先保存活动', icon: 'none' })
      uni.navigateTo({ url: `/pages/groupbuy/addProduct?flashSaleId=${this.flashSale._id}` })
    },
    goEditProduct(item) {
      uni.navigateTo({ url: `/pages/groupbuy/addProduct?flashSaleId=${this.flashSale._id}&id=${item._id}` })
    },

    async delProduct(item) {
      const r = await uni.showModal({ title: '删除商品', content: `确定删除「${item.name}」？` })
      if (!r.confirm) return
      uni.showLoading({ title: '删除中...' })
      try {
        const res = await deleteFlashSaleProduct(item._id)
        if (res && res.code === 0) {
          uni.showToast({ title: '已删除', icon: 'success' })
          this.fetchAll()
        } else {
          uni.showToast({ title: (res && res.msg) || '删除失败', icon: 'none' })
        }
      } finally { uni.hideLoading() }
    },

    async openLib() {
      if (!this.flashSale) return uni.showToast({ title: '请先保存活动', icon: 'none' })
      this.libVisible = true
      this.selectedIds = []
      try {
        const res = await getProducts()
        this.productLib = (res.data || [])
      } catch (e) {
        uni.showToast({ title: '商品库加载失败', icon: 'none' })
      }
    },
    toggleSelect(id) {
      const i = this.selectedIds.indexOf(id)
      if (i >= 0) this.selectedIds.splice(i, 1)
      else this.selectedIds.push(id)
    },
    async addFromLib() {
      if (this.selectedIds.length === 0) return uni.showToast({ title: '请先选商品', icon: 'none' })
      uni.showLoading({ title: '添加中...' })
      let ok = 0, fail = 0
      for (const pid of this.selectedIds) {
        const p = this.productLib.find(x => x._id === pid)
        if (!p) continue
        try {
          const r = await addFlashSaleProduct({
            flashSaleId: this.flashSale._id,
            name: p.name,
            image: p.images?.[0] || '',
            originalPrice: p.specs?.[0]?.price || 0,
            flashPrice: p.specs?.[0]?.price || 0,
            stock: p.specs?.[0]?.stock || 99,
            specs: (p.specs || []).map(s => ({ ...s, originalPrice: s.originalPrice || s.price || 0 }))
          })
          if (r && r.code === 0) ok++; else fail++
        } catch (e) { fail++ }
      }
      uni.hideLoading()
      uni.showToast({ title: fail ? `成功 ${ok} 失败 ${fail}` : `已添加 ${ok}`, icon: 'none' })
      this.libVisible = false
      this.fetchAll()
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
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #000; }
.header-btns { display: flex; gap: 12rpx; }

.status-badge { padding: 4rpx 16rpx; border-radius: 8rpx; }
.status-badge text { font-size: 22rpx; font-weight: 500; }
.status-badge.active { background: #E8F5E9; }
.status-badge.active text { color: #4CAF50; }
.status-badge.pending { background: #FFF3E0; }
.status-badge.pending text { color: #FF6B00; }
.status-badge.ended { background: #F5F5F5; }
.status-badge.ended text { color: #999; }

.form-row { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.form-row:last-of-type { border-bottom: none; }
.form-label { width: 160rpx; font-size: 28rpx; color: #333; }
.form-input { flex: 1; font-size: 28rpx; color: #000; }
.form-picker { flex: 1; font-size: 28rpx; color: #000; }

.primary-btn { background: #4CAF50; color: #FFF; border-radius: 12rpx; font-size: 30rpx; margin-top: 24rpx; }
.primary-btn::after { border: none; }

.ghost-btn { padding: 8rpx 20rpx; border: 1rpx solid #DDD; border-radius: 8rpx; }
.ghost-btn text { font-size: 24rpx; color: #666; }
.ghost-btn.primary { background: #E8F5E9; border-color: #4CAF50; }
.ghost-btn.primary text { color: #4CAF50; font-weight: 500; }

.empty-block { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; color: #999; }

.product-card { background: #FAFAFA; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.product-main { display: flex; align-items: center; }
.product-img { width: 120rpx; height: 120rpx; background: #FFF3E0; border-radius: 12rpx; margin-right: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.img-fill { width: 100%; height: 100%; }
.img-placeholder { font-size: 60rpx; }
.product-info { flex: 1; min-width: 0; }
.product-name { font-size: 28rpx; font-weight: 600; color: #000; display: block; margin-bottom: 8rpx; }
.product-price-row { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 6rpx; }
.price-now { font-size: 32rpx; font-weight: 700; color: #FF6B00; }
.price-original { font-size: 22rpx; color: #999; text-decoration: line-through; }
.product-stock { font-size: 22rpx; color: #999; }

.product-actions { display: flex; gap: 16rpx; padding-top: 16rpx; margin-top: 12rpx; border-top: 1rpx solid #EFEFEF; }
.action-btn { flex: 1; padding: 10rpx 0; background: #F5F5F5; border-radius: 8rpx; text-align: center; }
.action-btn text { font-size: 24rpx; color: #666; }
.action-btn.danger { background: #FFEBEE; }
.action-btn.danger text { color: #F44336; }

/* 商品库底部弹窗 */
.lib-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: flex-end; }
.lib-sheet { background: #FFF; width: 100%; height: 80vh; border-radius: 24rpx 24rpx 0 0; display: flex; flex-direction: column; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-bottom: 1rpx solid #EEE; }
.sheet-title { font-size: 30rpx; font-weight: 600; color: #000; }
.sheet-close { font-size: 36rpx; color: #999; padding: 0 12rpx; }
.lib-list { flex: 1; padding: 16rpx 0; }
.lib-item { display: flex; align-items: center; padding: 20rpx 24rpx; border-bottom: 1rpx solid #F5F5F5; }
.lib-item.selected { background: #F1F8E9; }
.lib-check { width: 40rpx; height: 40rpx; border: 2rpx solid #DDD; border-radius: 50%; margin-right: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #4CAF50; }
.lib-item.selected .lib-check { background: #4CAF50; color: #FFF; border-color: #4CAF50; }
.lib-info { flex: 1; }
.lib-name { font-size: 28rpx; color: #000; display: block; margin-bottom: 4rpx; }
.lib-price { font-size: 24rpx; color: #999; }
.sheet-footer { padding: 20rpx 24rpx; border-top: 1rpx solid #EEE; }

.bottom-placeholder { height: 120rpx; }
</style>
