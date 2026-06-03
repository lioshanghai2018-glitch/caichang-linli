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

  <!-- 核心数据4卡片 -->
  <view class="dashboard-grid">
    <view class="dash-card" v-for="(item, idx) in dashboardData" :key="idx">
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
    <view class="line-chart">
      <view class="chart-canvas">
        <view class="chart-grid">
          <view class="grid-line" v-for="n in 4" :key="n"></view>
        </view>
        <view class="chart-line">
          <view
            class="chart-point"
            v-for="(point, idx) in chartData"
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
  </view>

  <!-- 商品销售排行 -->
  <view class="card ranking-card">
    <text class="card-title">商品销售排行</text>
    <view class="ranking-list">
      <view class="ranking-item" v-for="(item, idx) in rankingList" :key="idx">
        <view class="rank-num" :class="{top: idx < 3}">
          <text>{{idx + 1}}</text>
        </view>
        <view class="rank-info">
          <text class="rank-name">{{item.name}}</text>
          <text class="rank-sales">销量 {{item.sales}}件</text>
        </view>
        <text class="rank-amount">¥{{item.amount}}</text>
      </view>
    </view>
  </view>

  <!-- 分类占比 -->
  <view class="card category-card">
    <text class="card-title">分类销售占比</text>
    <view class="category-chart">
      <view class="pie-chart">
        <view
          class="pie-slice"
          v-for="(slice, idx) in categoryData"
          :key="idx"
          :style="{background: slice.color, transform: 'rotate(' + slice.rotate + 'deg)'}"
        ></view>
      </view>
      <view class="category-legend">
        <view class="legend-item" v-for="(item, idx) in categoryData" :key="idx">
          <view class="legend-dot" :style="{background: item.color}"></view>
          <text class="legend-name">{{item.name}}</text>
          <text class="legend-percent">{{item.percent}}%</text>
        </view>
      </view>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
export default {
  data() {
    return {
      currentTime: 'today',
      currentTimeText: '今日',
      timeTabs: [
        { key: 'today', label: '今日' },
        { key: 'week', label: '本周' },
        { key: 'month', label: '本月' }
      ],
      dashboardData: [
        { label: '总订单', value: '128单', trend: '12%', trendUp: true, icon: '📋', iconBg: '#E8F5E9' },
        { label: '总销售额', value: '¥3,580', trend: '8%', trendUp: true, icon: '💰', iconBg: '#E8F5E9' },
        { label: '总访客', value: '456人', trend: '15%', trendUp: true, icon: '👥', iconBg: '#E3F2FD' },
        { label: '转化率', value: '28%', trend: '3%', trendUp: false, icon: '📈', iconBg: '#FFF3E0' }
      ],
      chartData: [
        { x: 10, y: 40, value: '¥320' },
        { x: 25, y: 55, value: '¥450' },
        { x: 40, y: 35, value: '¥280' },
        { x: 55, y: 70, value: '¥580' },
        { x: 70, y: 50, value: '¥420' },
        { x: 85, y: 80, value: '¥680' }
      ],
      chartLabels: ['6:00', '9:00', '12:00', '15:00', '18:00', '21:00'],
      rankingList: [
        { name: '新鲜土猪肉 500g', sales: 86, amount: '3010.00' },
        { name: '有机青菜 300g', sales: 65, amount: '578.50' },
        { name: '野生菌汤包 200g', sales: 42, amount: '2856.00' },
        { name: '新鲜鸡蛋 10枚', sales: 38, amount: '532.00' },
        { name: '农家大米 5kg', sales: 25, amount: '800.00' }
      ],
      categoryData: [
        { name: '蔬菜', percent: 35, color: '#4CAF50', rotate: 0 },
        { name: '肉类', percent: 28, color: '#FF6B00', rotate: 126 },
        { name: '水产', percent: 18, color: '#2196F3', rotate: 234 },
        { name: '蛋奶', percent: 12, color: '#9C27B0', rotate: 295 },
        { name: '其他', percent: 7, color: '#607D8B', rotate: 323 }
      ]
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    switchTime(key) {
      this.currentTime = key
      const texts = { today: '今日', week: '本周', month: '本月' }
      this.currentTimeText = texts[key]
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

/* 核心数据4卡片 */
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
  display: flex;
  align-items: flex-end;
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
  background: conic-gradient(
    #4CAF50 0deg 126deg,
    #FF6B00 126deg 230.4deg,
    #2196F3 230.4deg 295.2deg,
    #9C27B0 295.2deg 320.4deg,
    #607D8B 320.4deg 360deg
  );
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