<template>
<view class="merchant-tabbar">
  <view
    v-for="(item, idx) in tabList"
    :key="idx"
    class="tab-item"
    :class="{active: current === item.key}"
    @tap="onTap(item)"
  >
    <view class="iconfont tab-icon" :class="item.icon"></view>
    <text class="tab-text">{{item.text}}</text>
  </view>
</view>
</template>

<script>
export default {
  name: 'merchant-tabbar',
  props: {
    current: {
      type: String,
      default: 'index'
    }
  },
  data() {
    return {
      tabList: [
        { key: 'index', text: '首页', icon: 'icon-shouye', path: '/pages/index/index' },
        { key: 'order', text: '订单', icon: 'icon-jinridingdan', path: '/pages/order/list' },
        { key: 'product', text: '商品', icon: 'icon-shangpin', path: '/pages/product/list' },
        { key: 'mine', text: '我的', icon: 'icon-wode', path: '/pages/mine/index' }
      ]
    }
  },
  methods: {
    onTap(item) {
      if (item.key === this.current) return
      uni.reLaunch({ url: item.path })
    }
  }
}
</script>

<style>
.merchant-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 110rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E8E8;
  display: flex;
  z-index: 999;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0;
}
.tab-icon {
  font-size: 48rpx;
  color: #666666;
  line-height: 1;
  margin-bottom: 4rpx;
}
.tab-text {
  font-size: 22rpx;
  color: #666666;
  line-height: 1.2;
}
.tab-item.active .tab-icon {
  color: #528A59;
}
.tab-item.active .tab-text {
  color: #528A59;
}
</style>
