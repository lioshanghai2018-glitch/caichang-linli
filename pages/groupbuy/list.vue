<template>
<view class="page">
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">团购特惠</text>
  </view>

  <!-- 活动类型切换 -->
  <view class="type-tabs">
    <view class="type-tab" :class="{ active: activeType==='daily' }" @tap="switchType('daily')">
      <text>每日活动</text>
    </view>
    <view class="type-tab" :class="{ active: activeType==='fixed' }" @tap="switchType('fixed')">
      <text>固定活动</text>
    </view>
  </view>

  <!-- 活动设置卡 -->
  <view class="card">
    <view class="card-header">
      <text class="card-title">{{ activeType==='daily' ? '每日活动设置' : '固定活动设置' }}</text>
      <view class="status-badge" :class="statusClass">
        <text>{{ saleStatus }}</text>
      </view>
    </view>

    <view class="form-row">
      <text class="form-label">活动名称</text>
      <input v-if="activeType==='daily'" class="form-input" v-model="dailyForm.name" placeholder="请输入活动名称" />
      <input v-else class="form-input" v-model="fixedForm.name" placeholder="请输入活动名称" />
    </view>

    <!-- daily:两个 time picker -->
    <view v-if="activeType==='daily'">
      <view class="form-row">
        <text class="form-label">每日开始</text>
        <picker mode="time" :value="dailyForm.dailyStart" @change="(e) => dailyForm.dailyStart = e.detail.value">
          <view class="form-picker">{{ dailyForm.dailyStart || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">每日结束</text>
        <picker mode="time" :value="dailyForm.dailyEnd" @change="(e) => dailyForm.dailyEnd = e.detail.value">
          <view class="form-picker">{{ dailyForm.dailyEnd || '请选择' }}</view>
        </picker>
      </view>
      <view class="form-hint">
        <text>每日 {{ dailyForm.dailyStart || '--:--' }} - {{ dailyForm.dailyEnd || '--:--' }} 自动展示商品,过期进入空档,第二天再开</text>
      </view>
    </view>

    <!-- fixed:两个 input 输入时间(避开 mp-weixin picker 在该项目里点击不响应的坑) -->
    <view v-else>
      <view class="form-row">
        <text class="form-label">开始时间</text>
        <input class="form-input" :value="formatDisplay(fixedForm.startTime)" placeholder="格式:2026-06-10 18:00" @blur="(e) => fixedForm.startTime = parsePicker(e.detail.value)" />
      </view>
      <view class="form-row">
        <text class="form-label">结束时间</text>
        <input class="form-input" :value="formatDisplay(fixedForm.endTime)" placeholder="格式:2026-06-17 18:00" @blur="(e) => fixedForm.endTime = parsePicker(e.detail.value)" />
      </view>
      <view class="form-hint">
        <text>在选定日期时间段内展示商品,过期不展示。直接输入「年-月-日 时:分」,失焦自动保存。</text>
      </view>
    </view>

    <view class="form-row">
      <text class="form-label">启用活动</text>
      <switch v-if="activeType==='daily'" :checked="dailyForm.status" @change="(e) => dailyForm.status = e.detail.value" color="#4CAF50" />
      <switch v-else :checked="fixedForm.status" @change="(e) => fixedForm.status = e.detail.value" color="#4CAF50" />
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
    <view v-if="activeType==='daily'" class="card-hint">
      <text v-if="fixedSale">商品统一存在「固定活动」中,此处展示同一份商品。编辑/添加/删除都作用于固定活动。</text>
      <text v-else>请先切到「固定活动」tab 创建并保存活动,商品统一存在固定活动中。</text>
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

const emptyDaily = () => ({ id: null, name: '每日特惠', dailyStart: '09:00', dailyEnd: '18:00', status: true })
// 固定活动默认从「现在」开始、7 天后结束(picker 需要有效初始值才能点开;空串在 mp-weixin 里 picker 不响应)
const emptyFixed = () => ({ id: null, name: '限时特惠活动', startTime: Date.now(), endTime: Date.now() + 7 * 86400000, status: true })

export default {
  data() {
    return {
      loading: false,
      activeType: 'daily',        // 当前 tab
      // daily 活动
      dailySale: null,
      dailyForm: emptyDaily(),
      // fixed 活动
      fixedSale: null,
      fixedForm: emptyFixed(),
      // 商品(对应 activeType 的活动)
      products: [],
      // 商品库弹窗
      libVisible: false,
      productLib: [],
      selectedIds: []
    }
  },
  computed: {
    // 当前 tab 对应的 sale 文档
    currentSale() {
      return this.activeType === 'daily' ? this.dailySale : this.fixedSale
    },
    // 商品源:永远用固定活动(每日活动只是时间窗口,商品统一存在固定活动)
    productSource() {
      return this.fixedSale
    },
    saleStatus() {
      const sale = this.currentSale
      if (!sale) return '未设置'
      const now = Date.now()
      if (!sale.status) return '已禁用'
      if (this.activeType === 'daily') {
        if (!sale.dailyStart || !sale.dailyEnd) return '未设置'
        const w = todayDailyWindow(sale.dailyStart, sale.dailyEnd)
        if (now < w.start) return '未开始(今日)'
        if (now >= w.end) return '已结束(今日)'
        return '今日进行中'
      }
      if (now < sale.startTime) return '未开始'
      if (now > sale.endTime) return '已结束'
      return '进行中'
    },
    statusClass() {
      const s = this.saleStatus
      if (s === '进行中' || s === '今日进行中') return 'active'
      if (s === '已结束' || s === '已结束(今日)' || s === '已禁用' || s === '未设置') return 'ended'
      return 'pending'
    }
  },
  onShow() {
    this.fetchAll()
  },
  methods: {
    goBack() { uni.navigateBack() },
    switchType(t) {
      if (t === this.activeType) return
      this.activeType = t
      this.fetchProducts()
    },

    // 时间格式:ms ↔ picker 'YYYY-MM-DD HH:mm'
    formatPicker(ms) {
      if (!ms) return ''
      const d = new Date(Number(ms))
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    parsePicker(str) {
      if (!str) return ''
      const t = new Date(str.replace(/-/g, '/')).getTime()
      if (isNaN(t)) {
        uni.showToast({ title: '时间格式不对', icon: 'none' })
        return ''
      }
      return t
    },
    formatDisplay(ms) { return this.formatPicker(ms) },

    async fetchAll() {
      this.loading = true
      try {
        const saleRes = await getFlashSale()
        const list = (saleRes.data || [])
        const saleArr = Array.isArray(list) ? list : (list ? [list] : [])
        // 按 type 分桶
        const dailyArr = saleArr.filter(s => (s.type || 'fixed') === 'daily')
        const fixedArr = saleArr.filter(s => (s.type || 'fixed') === 'fixed')
        this.dailySale = dailyArr[0] || null
        this.fixedSale = fixedArr[0] || null
        // 表单回填
        if (this.dailySale) {
          this.dailyForm = {
            id: this.dailySale._id,
            name: this.dailySale.name || '每日特惠',
            dailyStart: this.dailySale.dailyStart || '09:00',
            dailyEnd: this.dailySale.dailyEnd || '18:00',
            status: !!this.dailySale.status
          }
        } else {
          this.dailyForm = emptyDaily()
        }
        if (this.fixedSale) {
          this.fixedForm = {
            id: this.fixedSale._id,
            name: this.fixedSale.name || '限时特惠活动',
            startTime: this.fixedSale.startTime || Date.now(),
            endTime: this.fixedSale.endTime || (Date.now() + 7 * 86400000),
            status: !!this.fixedSale.status
          }
        } else {
          this.fixedForm = emptyFixed()
        }
        await this.fetchProducts()
      } catch (e) {
        console.error('[groupbuy] 加载失败', e)
      } finally {
        this.loading = false
      }
    },

    async fetchProducts() {
      const sale = this.productSource
      if (!sale) {
        this.products = []
        return
      }
      try {
        const pRes = await getFlashSaleProducts({ flashSaleId: sale._id })
        this.products = (pRes.data || [])
      } catch (e) {
        console.error('[groupbuy] 加载商品失败', e)
        this.products = []
      }
    },

    async saveSale() {
      const f = this.activeType === 'daily' ? this.dailyForm : this.fixedForm
      if (!f.name) return uni.showToast({ title: '请输入活动名', icon: 'none' })
      if (this.activeType === 'daily') {
        if (!f.dailyStart || !f.dailyEnd) return uni.showToast({ title: '请选时间', icon: 'none' })
      } else {
        if (!f.startTime || !f.endTime) return uni.showToast({ title: '请选时间', icon: 'none' })
      }
      uni.showLoading({ title: '保存中...' })
      try {
        const res = await saveFlashSale({
          id: f.id,
          name: f.name,
          type: this.activeType,
          startTime: Number(f.startTime) || Date.now(),
          endTime: Number(f.endTime) || (Date.now() + 7 * 86400000),
          dailyStart: f.dailyStart || null,
          dailyEnd: f.dailyEnd || null,
          status: f.status
        })
        if (res && res.code === 0) {
          uni.showToast({ title: '已保存', icon: 'success' })
          await this.fetchAll()
        } else {
          uni.showToast({ title: (res && res.msg) || '保存失败', icon: 'none' })
        }
      } finally { uni.hideLoading() }
    },

    goAddProduct() {
      if (!this.productSource) return uni.showToast({ title: '请先保存固定活动', icon: 'none' })
      uni.navigateTo({ url: `/pages/groupbuy/addProduct?flashSaleId=${this.productSource._id}` })
    },
    goEditProduct(item) {
      if (!this.productSource) return uni.showToast({ title: '请先保存固定活动', icon: 'none' })
      uni.navigateTo({ url: `/pages/groupbuy/addProduct?flashSaleId=${this.productSource._id}&id=${item._id}` })
    },

    async delProduct(item) {
      const r = await uni.showModal({ title: '删除商品', content: `确定删除「${item.name}」?` })
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
      if (!this.productSource) return uni.showToast({ title: '请先保存固定活动', icon: 'none' })
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
            flashSaleId: this.productSource._id,
            name: p.name,
            image: p.images?.[0] || '',
            originalPrice: p.specs?.[0]?.price || 0,
            flashPrice: p.specs?.[0]?.price || 0,
            stock: p.specs?.[0]?.stock || 99,
            specs: (p.specs || []).map(s => ({ ...s, originalPrice: s.originalPrice || s.price || 0 })),
            // 传分类给云端,用于报表「分类销售占比」聚合
            categoryId: p.categoryId || null,
            categoryName: p.categoryName || null
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

// 工具函数:daily 'HH:mm' → 今日 [startMs, endMs)
function todayDailyWindow(startStr, endStr) {
  const today0 = new Date()
  today0.setHours(0, 0, 0, 0)
  const base = today0.getTime()
  const [sh, sm] = (startStr || '0:0').split(':').map(Number)
  const [eh, em] = (endStr || '0:0').split(':').map(Number)
  return {
    start: base + (sh || 0) * 3600000 + (sm || 0) * 60000,
    end:   base + (eh || 0) * 3600000 + (em || 0) * 60000
  }
}
</script>

<style>
.page { background: #F5F1EB; min-height: 100vh; padding: 0 20rpx 200rpx; }

.back-bar { display: flex; align-items: center; height: 88rpx; }
.back-arrow { font-size: 48rpx; color: #000; font-weight: 300; padding: 0 8rpx; }
.page-title { font-size: 32rpx; font-weight: 600; color: #000; }

.type-tabs { display: flex; background: #FFF; border-radius: 16rpx; padding: 8rpx; margin-bottom: 20rpx; }
.type-tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 12rpx; transition: all 0.2s; }
.type-tab text { font-size: 28rpx; color: #666; font-weight: 500; }
.type-tab.active { background: #4CAF50; }
.type-tab.active text { color: #FFF; font-weight: 600; }

.card { background: #FFFFFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #000; }
.header-btns { display: flex; gap: 12rpx; }
.card-hint { background: #FFF8E1; border-left: 6rpx solid #FFB300; padding: 16rpx 20rpx; border-radius: 8rpx; margin-bottom: 20rpx; }
.card-hint text { font-size: 24rpx; color: #8D6E00; line-height: 1.6; }

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
.form-hint { padding: 8rpx 0 16rpx 160rpx; }
.form-hint text { font-size: 22rpx; color: #999; }

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
