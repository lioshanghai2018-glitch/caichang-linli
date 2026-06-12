<template>
<view class="page">
  <!-- 返回按钮 -->
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">数据报表</text>
  </view>

  <!-- 时间筛选 -->
  <view class="time-filter">
    <view class="filter-tabs">
      <view
        v-for="tab in timeTabs"
        :key="tab.key"
        class="filter-tab"
        :class="{active: currentTime === tab.key}"
        @tap="switchTime(tab.key)"
      >
        <text>{{tab.label}}</text>
      </view>
    </view>
  </view>

  <!-- 核心数据4卡片 (2x2 网格) -->
  <view class="dashboard-grid">
    <view class="dash-card" v-for="(item, idx) in dashboardCards" :key="idx">
      <view class="dash-icon-wrap" :style="{background: item.iconBg}">
        <text class="dash-icon">{{item.icon}}</text>
      </view>
      <text class="dash-label">{{item.label}}</text>
      <text class="dash-value">{{item.value}}</text>
      <view class="dash-trend" :class="item.trendUp ? 'up' : 'down'">
        <text>{{item.trendUp ? '↑' : '↓'}}{{item.trend}}</text>
      </view>
    </view>
  </view>

  <!-- 销售趋势图 -->
  <view class="card chart-card">
    <view class="card-header">
      <text class="card-title">销售趋势</text>
      <text class="period-text">{{currentTimeText}}</text>
    </view>
    <view class="line-chart" v-if="chartPoints.length > 0">
      <view class="chart-canvas">
        <view class="chart-grid">
          <view class="grid-line" v-for="n in 4" :key="n"></view>
        </view>
        <view class="chart-line">
          <view
            class="chart-point"
            v-for="(point, idx) in chartPoints"
            :key="idx"
            :style="{left: point.x + '%', bottom: point.y + '%'}"
          >
            <view class="point-dot"></view>
            <view class="point-tooltip">
              <text>{{point.value}}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="chart-labels">
        <text v-for="(label, idx) in chartLabels" :key="idx">{{label}}</text>
      </view>
    </view>
    <view class="empty-tip" v-else>
      <text>暂无销售数据</text>
    </view>
  </view>

  <!-- 商品销售排行 -->
  <view class="card ranking-card">
    <text class="card-title">商品销售排行</text>
    <view class="ranking-list" v-if="rankingList.length > 0">
      <view class="ranking-item" v-for="(item, idx) in rankingList" :key="idx">
        <view class="rank-num" :class="{top: idx < 3}">
          <text>{{idx + 1}}</text>
        </view>
        <view class="rank-info">
          <text class="rank-name">{{item.name}}</text>
          <text class="rank-sales">销量 {{item.qty}}件</text>
        </view>
        <text class="rank-amount">¥{{item.amount}}</text>
      </view>
    </view>
    <view class="empty-tip" v-else>
      <text>暂无销售排行</text>
    </view>
  </view>

  <!-- 分类占比 -->
  <view class="card category-card">
    <text class="card-title">分类销售占比</text>
    <view class="category-chart" v-if="categoryData.length > 0">
      <view class="pie-chart" :style="{background: pieGradient}"></view>
      <view class="category-legend">
        <view class="legend-item" v-for="(item, idx) in categoryData" :key="idx">
          <view class="legend-dot" :style="{background: item.color}"></view>
          <text class="legend-name">{{item.name}}</text>
          <text class="legend-percent">{{item.percent}}%</text>
        </view>
      </view>
    </view>
    <view class="empty-tip" v-else>
      <text>暂无分类销售</text>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { getDashboard, getReportData } from '@/utils/api.js'
import { getMerchantId } from '@/utils/auth.js'

export default {
  data() {
    return {
      currentTime: 'today',
      currentTimeText: '今日',
      loading: false,
      timeTabs: [
        { key: 'today', label: '今日' },
        { key: 'week', label: '本周' },
        { key: 'month', label: '本月' }
      ],
      // 4 卡片：总订单 / 总销售额 / 总访客 / 转化率
      todayOrders: 0,
      totalSales: 0,
      totalVisitors: 0,
      conversionRate: 0,
      // 销售趋势:{label, value}[]
      salesTrend: [],
      // 商品排行:{productId, name, qty, amount}[]
      rankingList: [],
      // 分类占比:{name, amount, qty, percent, color}[]
      categoryData: []
    }
  },
  computed: {
    // 4 卡片数据(2x2:总订单+总销售额 row1,总访客+转化率 row2)
    dashboardCards() {
      return [
        { label: '总订单', value: this.todayOrders + '单', trend: '12%', trendUp: true, icon: '📋', iconBg: '#E8F5E9' },
        { label: '总销售额', value: '¥' + this.formatMoney(this.totalSales), trend: '8%', trendUp: true, icon: '💰', iconBg: '#E8F5E9' },
        { label: '总访客', value: this.totalVisitors + '人', trend: '15%', trendUp: true, icon: '👥', iconBg: '#E3F2FD' },
        { label: '转化率', value: this.conversionRate + '%', trend: '3%', trendUp: false, icon: '📈', iconBg: '#FFF3E0' }
      ]
    },
    // 折线图点位:把 salesTrend 的 value 映射到 0-100% 高度,X 轴均分
    chartPoints() {
      if (!this.salesTrend.length) return []
      const max = Math.max(...this.salesTrend.map(d => Number(d.value) || 0), 1)
      const step = this.salesTrend.length === 1 ? 0 : 100 / (this.salesTrend.length - 1)
      return this.salesTrend.map((d, i) => {
        const v = Number(d.value) || 0
        return {
          x: this.salesTrend.length === 1 ? 50 : (i * step),
          y: Math.max(2, Math.round((v / max) * 95)),
          value: '¥' + this.formatMoney(v)
        }
      })
    },
    // 折线图 X 轴标签(按时段密度智能抽稀,避免 24 个标签挤一起)
    chartLabels() {
      if (!this.salesTrend.length) return []
      const n = this.salesTrend.length
      // 控制显示 ≤ 7 个标签
      if (n <= 7) return this.salesTrend.map(d => d.label)
      const target = 7
      const step = Math.max(1, Math.floor(n / target))
      const labels = []
      for (let i = 0; i < n; i += step) {
        labels.push(this.salesTrend[i].label)
      }
      // 末点补一个
      if (labels[labels.length - 1] !== this.salesTrend[n - 1].label) {
        labels.push(this.salesTrend[n - 1].label)
      }
      return labels
    },
    // 饼图 conic-gradient:把 categoryData 的 percent 串成角度区间
    pieGradient() {
      if (!this.categoryData.length) return '#F5F5F5'
      let acc = 0
      const parts = this.categoryData.map(c => {
        const start = acc
        acc += Number(c.percent) || 0
        return `${c.color} ${start}% ${acc}%`
      })
      return `conic-gradient(${parts.join(', ')})`
    }
  },
  onShow() {
    // 切回本页面时刷新(下单后回到报表要看新数据)
    if (!this.loading) this.loadAll()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    switchTime(key) {
      if (key === this.currentTime) return
      this.currentTime = key
      const texts = { today: '今日', week: '本周', month: '本月' }
      this.currentTimeText = texts[key]
      this.loadAll()
    },
    async loadAll() {
      const merchantId = getMerchantId()
      if (!merchantId) {
        // 单商家自动 bootstrap 会在 request 内完成;这里也容忍空 merchantId 让后端报错
        console.warn('[report] merchantId 为空,数据可能为空')
      }
      this.loading = true
      try {
        const [dashRes, reportRes] = await Promise.all([
          getDashboard(this.currentTime),
          getReportData(this.currentTime)
        ])
        if (dashRes && dashRes.data) {
          this.todayOrders = dashRes.data.todayOrders || 0
          this.totalSales = dashRes.data.totalSales || 0
          this.totalVisitors = dashRes.data.totalVisitors || 0
          this.conversionRate = dashRes.data.conversionRate || 0
        }
        if (reportRes && reportRes.data) {
          this.salesTrend = reportRes.data.salesTrend || []
          this.rankingList = reportRes.data.productRanking || []
          this.categoryData = reportRes.data.categoryShare || []
        }
      } catch (e) {
        uni.showToast({ title: e.msg || '数据加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    formatMoney(n) {
      const v = Number(n) || 0
      // 千位分隔,2 位小数
      return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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

/* 时间筛选 */
.time-filter {
  margin-bottom: 24rpx;
}
.filter-tabs {
  display: flex;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 8rpx;
}
.filter-tab {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  border-radius: 12rpx;
}
.filter-tab text {
  font-size: 28rpx;
  color: #666666;
}
.filter-tab.active {
  background: #4CAF50;
}
.filter-tab.active text {
  color: #FFFFFF;
  font-weight: 600;
}

/* 核心数据4卡片 (2x2) */
.dashboard-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.dash-card {
  width: calc(50% - 8rpx);
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  box-sizing: border-box;
}
.dash-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.dash-icon {
  font-size: 32rpx;
}
.dash-label {
  font-size: 24rpx;
  color: #999999;
  display: block;
  margin-bottom: 4rpx;
}
.dash-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #000000;
  display: block;
  margin-bottom: 8rpx;
}
.dash-trend {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.dash-trend text {
  font-size: 22rpx;
}
.dash-trend.up {
  background: #E8F5E9;
}
.dash-trend.up text {
  color: #4CAF50;
}
.dash-trend.down {
  background: #FFF3E0;
}
.dash-trend.down text {
  color: #FF6B00;
}

/* 通用卡片 */
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
  display: block;
  margin-bottom: 20rpx;
}
.period-text {
  font-size: 24rpx;
  color: #999999;
}

/* 空态 */
.empty-tip {
  padding: 60rpx 0;
  text-align: center;
}
.empty-tip text {
  font-size: 26rpx;
  color: #999999;
}

/* 折线图 */
.line-chart {
  height: 300rpx;
}
.chart-canvas {
  height: 240rpx;
  position: relative;
}
.chart-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.grid-line {
  height: 1rpx;
  background: #F5F5F5;
}
.chart-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40rpx;
}
.chart-point {
  position: absolute;
  transform: translate(-50%, 50%);
}
.point-dot {
  width: 16rpx;
  height: 16rpx;
  background: #4CAF50;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  box-shadow: 0 2rpx 8rpx rgba(76,175,80,0.4);
}
.point-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333333;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  white-space: nowrap;
  opacity: 0;
}
.point-tooltip text {
  font-size: 24rpx;
  color: #FFFFFF;
}
.chart-labels {
  display: flex;
  justify-content: space-between;
  padding-top: 16rpx;
}
.chart-labels text {
  font-size: 22rpx;
  color: #999999;
}

/* 排行榜 */
.ranking-list {
  display: flex;
  flex-direction: column;
}
.ranking-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}
.ranking-item:last-child {
  border-bottom: none;
}
.rank-num {
  width: 48rpx;
  height: 48rpx;
  background: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}
.rank-num.top {
  background: #4CAF50;
}
.rank-num text {
  font-size: 26rpx;
  font-weight: 700;
  color: #666666;
}
.rank-num.top text {
  color: #FFFFFF;
}
.rank-info {
  flex: 1;
}
.rank-name {
  font-size: 28rpx;
  color: #333333;
  display: block;
  margin-bottom: 4rpx;
}
.rank-sales {
  font-size: 24rpx;
  color: #999999;
}
.rank-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #FF6B00;
}

/* 分类饼图 */
.category-chart {
  display: flex;
  align-items: center;
}
.pie-chart {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  margin-right: 24rpx;
  flex-shrink: 0;
}
.category-legend {
  flex: 1;
}
.legend-item {
  display: flex;
  align-items: center;
  padding: 8rpx 0;
}
.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  margin-right: 12rpx;
}
.legend-name {
  flex: 1;
  font-size: 26rpx;
  color: #333333;
}
.legend-percent {
  font-size: 26rpx;
  color: #999999;
}

/* 底部占位 */
.bottom-placeholder {
  height: 120rpx;
}
</style>
