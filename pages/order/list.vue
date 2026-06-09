<template>
<view class="page">
  <!-- 状态标签栏 -->
  <view class="status-tabs">
    <view
      v-for="tab in statusTabs"
      :key="tab.key"
      class="status-tab"
      :class="{active: currentStatus === tab.key}"
      @tap="switchTab(tab.key)"
    >
      <text class="tab-text">{{tab.label}}</text>
      <view class="tab-badge" v-if="tab.count > 0"><text>{{tab.count > 99 ? '99+' : tab.count}}</text></view>
    </view>
  </view>

  <!-- 搜索栏 -->
  <view class="search-bar">
    <input
      class="search-input"
      placeholder="搜索订单号/手机号/姓名"
      v-model="searchKeyword"
      confirm-type="search"
      @confirm="onSearch"
      @input="onSearchInput"
    />
    <text class="search-icon" @tap="onSearch">🔍</text>
    <text v-if="searchKeyword" class="search-clear" @tap="onSearchClear">✕</text>
  </view>

  <!-- 订单列表 -->
  <scroll-view class="order-list" scroll-y @scrolltolower="loadMore">
    <view class="order-card" v-for="(item, idx) in orderList" :key="idx" @tap="goDetail(item)">
      <view class="card-header">
        <text class="order-no">订单号：{{item.orderNo}}</text>
        <view class="header-right">
          <view class="delivery-type-tag" :class="item.deliveryType">
            <text>{{item.deliveryType === 'delivery' ? '配送' : '自提'}}</text>
          </view>
          <view class="order-status" :style="{background: item.statusBg, color: item.statusColor}">
            <text>{{item.statusText}}</text>
          </view>
        </view>
      </view>
      <view class="card-body">
        <view class="goods-list">
          <view class="goods-item" v-for="(goods, gi) in item.goods" :key="gi">
            <text class="goods-name">{{goods.name}}</text>
            <text class="goods-qty">x{{goods.qty}}</text>
          </view>
        </view>
      </view>
      <view class="card-footer">
        <view class="customer-info">
          <text class="customer-name">{{item.customerName}}</text>
          <text class="customer-phone">{{item.customerPhone}}</text>
          <text class="customer-address" v-if="item.customerAddress">{{item.customerAddress}}</text>
        </view>
        <view class="order-amount">
          <text class="amount-label">实付</text>
          <text class="amount-value">¥{{item.payAmount}}</text>
        </view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="load-more" v-if="orderList.length > 0">
      <text v-if="loading">加载中...</text>
      <text v-else-if="noMore">没有更多了</text>
      <text v-else @tap="loadMore">加载更多</text>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="orderList.length === 0 && !loading">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无订单</text>
    </view>
  </scroll-view>

  <!-- 底部占位 -->
  <view class="bottom-placeholder"></view>

  <merchant-tabbar current="order" />
</view>
</template>

<script>
import merchantTabbar from '@/components/merchant-tabbar/merchant-tabbar.vue'
import { getOrders } from '@/utils/api.js'
import { ORDER_STATUS_TEXT } from '@/utils/config.js'

const STATUS_STYLE = {
  pending_payment: { color: '#FF6B00', bg: '#FFF3E0' },
  paid: { color: '#FF6B00', bg: '#FFF3E0' },
  pending_sorting: { color: '#FF6B00', bg: '#FFF3E0' },
  sorting: { color: '#FF6B00', bg: '#FFF3E0' },
  delivering: { color: '#4CAF50', bg: '#E8F5E9' },
  completed: { color: '#999999', bg: '#F5F5F5' },
  cancelled: { color: '#999999', bg: '#F5F5F5' },
  refunding: { color: '#FF6B00', bg: '#FFF3E0' },
  refunded: { color: '#999999', bg: '#F5F5F5' }
}

function getStatusStyle(status) {
  return STATUS_STYLE[status] || { color: '#666666', bg: '#F5F5F5' }
}

export default {
  components: { merchantTabbar },
  data() {
    return {
      currentStatus: 'all',
      searchKeyword: '',
      loading: false,
      noMore: false,
      page: 1,
      pageSize: 10,
      statusTabs: [
        { key: 'all', label: '全部', count: 0 },
        { key: 'pending_payment', label: '待付款', count: 0 },
        { key: 'pending_sorting', label: '待分拣', count: 0 },
        { key: 'sorting', label: '待配送', count: 0 },
        { key: 'ready_for_pickup', label: '待自提', count: 0 },
        { key: 'delivering', label: '配送中', count: 0 },
        { key: 'completed', label: '已完成', count: 0 }
      ],
      orderList: []
    }
  },
  onLoad(options) {
    if (options && options.status) {
      this.currentStatus = options.status
    }
    this.loadOrders()
  },
  onShow() {
    this.page = 1
    this.noMore = false
    this.orderList = []
    this.loadOrders()
  },
  async onPullDownRefresh() {
    this.page = 1
    this.noMore = false
    this.orderList = []
    try {
      await this.loadOrders()
    } finally {
      uni.stopPullDownRefresh()
    }
  },
  methods: {
    async loadOrders() {
      if (this.loading) return
      this.loading = true
      try {
        const params = {
          status: this.currentStatus,
          page: this.page,
          pageSize: this.pageSize,
          keyword: this.searchKeyword
        }
        const res = await getOrders(params)
        const list = (Array.isArray(res.data) ? res.data : (res.data?.list || [])).map(o => {
          const style = getStatusStyle(o.status)
          return {
            orderNo: o.orderNo ? String(o.orderNo).slice(-5) : '',
            fullOrderNo: o.orderNo,
            status: o.status,
            statusText: ORDER_STATUS_TEXT[o.status] || o.status || '',
            statusColor: style.color,
            statusBg: style.bg,
            deliveryType: o.deliveryType || 'self',
            goods: (o.items || []).map(it => ({ name: it.productName || it.name, qty: it.quantity || it.qty || 1 })),
            customerName: o.address?.name || o.customerName || '',
            customerPhone: o.address?.phone || o.customerPhone || '',
            customerAddress: [o.address?.address, o.address?.doorNo].filter(Boolean).join(' '),
            payAmount: (o.payAmount != null ? o.payAmount : o.totalAmount != null ? o.totalAmount : 0).toFixed(2)
          }
        })
        if (this.page === 1) {
          this.orderList = list
        } else {
          this.orderList = this.orderList.concat(list)
        }
        if (list.length < this.pageSize) this.noMore = true
        this.page++
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    switchTab(key) {
      this.currentStatus = key
      this.page = 1
      this.noMore = false
      this.orderList = []
      this.loadOrders()
    },
    loadMore() {
      if (this.noMore || this.loading) return
      this.loadOrders()
    },
    onSearch() {
      this.page = 1
      this.noMore = false
      this.orderList = []
      this.loadOrders()
    },
    onSearchInput() {
      if (this._searchTimer) clearTimeout(this._searchTimer)
      this._searchTimer = setTimeout(() => this.onSearch(), 400)
    },
    onSearchClear() {
      this.searchKeyword = ''
      this.onSearch()
    },
    goDetail(item) {
      uni.navigateTo({ url: `/pages/order/detail?id=${item.fullOrderNo || item.orderNo}` })
    }
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 0 20rpx 120rpx;
}

/* 状态标签栏 */
.status-tabs {
  display: flex;
  background: #FFFFFF;
  padding: 16rpx 0;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
}
.status-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
  position: relative;
}
.tab-text {
  font-size: 26rpx;
  color: #666666;
}
.status-tab.active .tab-text {
  color: #4CAF50;
  font-weight: 600;
}
.tab-badge {
  min-width: 32rpx;
  height: 32rpx;
  background: #FF6B00;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
}
.tab-badge text {
  font-size: 20rpx;
  color: #FFFFFF;
}
.status-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background: #4CAF50;
  border-radius: 2rpx;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 20rpx;
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
.search-clear {
  font-size: 28rpx;
  color: #999999;
  margin-left: 12rpx;
  padding: 0 8rpx;
}

/* 订单列表 */
.order-list {
  height: calc(100vh - 300rpx);
}
.order-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.delivery-type-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.delivery-type-tag text {
  font-size: 22rpx;
  font-weight: 500;
}
.delivery-type-tag.delivery {
  background: #E3F2FD;
}
.delivery-type-tag.delivery text {
  color: #1976D2;
}
.delivery-type-tag.self {
  background: #FFF3E0;
}
.delivery-type-tag.self text {
  color: #FF6B00;
}
.order-no {
  font-size: 26rpx;
  color: #666666;
}
.order-status {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}
.order-status text {
  font-size: 24rpx;
  font-weight: 500;
}
.card-body {
  border-bottom: 1rpx solid #F5F5F5;
  padding-bottom: 16rpx;
  margin-bottom: 16rpx;
}
.goods-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.goods-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.goods-name {
  font-size: 28rpx;
  color: #333333;
  flex: 1;
}
.goods-qty {
  font-size: 26rpx;
  color: #999999;
  margin-left: 16rpx;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.customer-info {
  display: flex;
  flex-direction: column;
}
.customer-name {
  font-size: 28rpx;
  color: #000000;
  font-weight: 500;
}
.customer-phone {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.customer-address {
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}
.order-amount {
  display: flex;
  align-items: baseline;
}
.amount-label {
  font-size: 24rpx;
  color: #999999;
  margin-right: 8rpx;
}
.amount-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #000000;
}

/* 加载状态 */
.load-more {
  text-align: center;
  padding: 32rpx 0;
}
.load-more text {
  font-size: 26rpx;
  color: #999999;
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
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>