<template>
  <view class="checkout-page">
    <!-- 顶部地址+配送方式 -->
    <view class="header">
      <view class="header-row">
        <view class="back-btn" @tap="goBack">
          <text class="back-arrow">‹</text>
        </view>
        <view class="address-input" @tap="selectAddress">
          <text class="addr-icon iconfont icon-dingwei"></text>
          <text class="addr-text">{{ selectedAddress ? selectedAddress.address + selectedAddress.doorNo : "点击选择收货地址" }}</text>
        </view>
        <view class="delivery-switch">
          <view class="switch-item" :class="{ active: deliveryType === 'self' }" @tap="switchDelivery('self')">
            <text>自提</text>
          </view>
          <view class="switch-item" :class="{ active: deliveryType === 'delivery' }" @tap="switchDelivery('delivery')">
            <text>配送</text>
          </view>
        </view>
      </view>
      <view class="time-tabs">
        <!-- 暂时隐藏今日选项，后期需要再打开 -->
        <view class="time-tab" :class="{ active: timeType === 'tomorrow' }" @tap="switchTime('tomorrow')">
          <text class="tab-check">✓</text>
          <text>{{ deliveryType === 'self' ? '明日自提' : '明日配送' }}</text>
        </view>
      </view>
      <view class="time-info" @tap="pickTime">
        <text class="time-label">{{ deliveryType === 'self' ? '自提时间' : '配送时间' }}</text>
        <text class="time-link">{{ selectedTime }} ›</text>
      </view>
    </view>

    <!-- 已选商品 -->
    <view class="card">
      <view class="product-row" v-for="(item, index) in selectedProducts" :key="index">
        <image class="product-img" :src="item.image" mode="aspectFill" />
        <view class="product-detail">
          <view class="product-text">
            <text class="product-name">{{ item.name }}</text>
            <text class="product-spec">{{ item.spec }}</text>
          </view>
          <view class="product-bottom">
            <view class="product-prices">
              <text class="price-old">¥{{ item.originalPrice }}</text>
              <text class="price-now">¥{{ item.currentPrice }}</text>
            </view>
            <text class="product-qty">x{{ item.qty }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 超值加购优惠 -->
    <view class="card">
      <view class="addon-header">
        <text class="addon-title">超值加购优惠</text>
        <text class="addon-sub">随单带走</text>
      </view>
      <scroll-view class="addon-scroll" scroll-x>
        <view class="addon-list">
          <view class="addon-item" v-for="(item, index) in addOnProducts" :key="index" @tap="toggleAddOn(index)">
            <image class="addon-img" :src="item.image" mode="aspectFill" />
            <text class="addon-name">{{ item.name }}</text>
            <text class="addon-spec">{{ item.spec }}</text>
            <view class="addon-price-row">
              <text class="addon-price-old">¥{{ item.originalPrice }}</text>
              <text class="addon-price-now">¥{{ item.currentPrice }}</text>
            </view>
            <view class="addon-radio" :class="{ checked: item.checked }">
              <text v-if="item.checked" class="radio-dot">✓</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 优惠券 -->
    <view class="card">
      <view class="info-row" @tap="showCoupon">
        <view class="info-left">
          <text class="info-icon iconfont icon-youhuiquan"></text>
          <text class="info-title">优惠券</text>
        </view>
        <text class="info-right">暂无可用</text>
      </view>
      <view class="info-notice">
        <text class="notice-text">优惠券不与满减、满赠、商品优惠等活动共享</text>
      </view>
    </view>

    <!-- 礼品卡 -->
    <view class="card">
      <view class="info-row">
        <view class="info-left">
          <text class="info-icon iconfont icon-yaoqinghaoyou"></text>
          <text class="info-title">礼品卡</text>
        </view>
        <text class="info-right">暂无可用礼品卡</text>
      </view>
    </view>

    <!-- 配送费 -->
    <view class="card">
      <view class="info-row" @tap="toggleFeeInfo">
        <view class="info-left">
          <text class="info-icon iconfont icon-peisong"></text>
          <text class="info-title">{{ deliveryType === 'self' ? '自提费' : '配送费' }}</text>
        </view>
        <view class="info-right-with-arrow">
          <text class="info-right">¥{{ computedDeliveryFee }}</text>
          <text class="info-arrow">{{ showFeeInfo ? '∧' : '∨' }}</text>
        </view>
      </view>
      <view class="fee-rules" v-if="showFeeInfo">
        <view class="fee-rule-item"><text class="fee-rule-dot">•</text><text class="fee-rule-text">明日自提：免配送费</text></view>
        <view class="fee-rule-item"><text class="fee-rule-dot">•</text><text class="fee-rule-text">明日配送：免配送费</text></view>
      </view>
    </view>

    <!-- 已优惠/应付 -->
    <view class="card">
      <view class="summary-row">
        <text class="summary-discount">已优惠 ¥{{ discount }}</text>
        <text class="summary-payable">应付 ¥<text class="summary-amount">{{ totalPayable }}</text></text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="card" @tap="showRemark">
      <view class="info-row">
        <view class="info-left">
          <text class="info-icon">📝</text>
          <text class="info-title">备注</text>
        </view>
        <text class="info-link">{{ remark || '点击填写' }} ›</text>
      </view>
    </view>

    <!-- 底部结算栏 -->
    <view class="bottom-bar">
      <view class="bottom-left">
        <text class="bottom-label">待支付 </text>
        <text class="bottom-price">¥{{ totalPayable }}</text>
      </view>
      <view class="pay-btn" @tap="handlePay">
        <text class="pay-text">付款</text>
      </view>
    </view>
  </view>
</template>

<script>
import { addOrder } from '@/utils/order.js'
export default {
  data() {
    return {
      deliveryType: 'self',
      selectedAddress: null,
      timeType: 'tomorrow',
      selectedTime: '09:00',
      discount: 0,
      deliveryFee: '0.00',
      remark: '',
      showFeeInfo: false,
      selectedProducts: [],
      addOnProducts: [
        { name: '有机西红柿', spec: '500g/份', originalPrice: '12.8', currentPrice: '8.8', checked: false, image: '/static/images/有机西红柿.png' },
        { name: '新鲜鸡蛋', spec: '10枚/盒', originalPrice: '15.0', currentPrice: '9.9', checked: false, image: '/static/images/新鲜鸡蛋.png' },
        { name: '有机青菜', spec: '300g/份', originalPrice: '6.0', currentPrice: '3.8', checked: false, image: '/static/images/有机青菜.png' },
        { name: '胡萝卜', spec: '400g/份', originalPrice: '5.0', currentPrice: '2.9', checked: false, image: '/static/images/胡萝卜.png' }
      ]
    }
  },
  computed: {
    totalPayable() {
      let total = 0
      this.selectedProducts.forEach(p => {
        total += parseFloat(p.currentPrice) * p.qty
      })
      this.addOnProducts.forEach(p => {
        if (p.checked) total += parseFloat(p.currentPrice)
      })
      total += parseFloat(this.computedDeliveryFee)
      return total.toFixed(1)
    },
    computedDeliveryFee() {
      if (this.deliveryType === 'self') return '0.00'
      if (this.timeType === 'today' && this.deliveryType === 'delivery') {
        const goodsTotal = this.selectedProducts.reduce((sum, p) => sum + parseFloat(p.currentPrice) * p.qty, 0)
        return goodsTotal >= 20 ? '0.00' : '2.00'
      }
      return '0.00'
    }
  },
  onLoad() {
    const raw = uni.getStorageSync("checkoutItems");
    const arr = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(p => {
          const orig = p.originalPrice ? String(p.originalPrice).replace("¥", "") : null;
          const curr = String(p.currentPrice || p.originalPrice || "0").replace("¥", "");
          arr.push({
            name: p.name || "未知商品",
            spec: p.spec || p.desc || "",
            image: p.image || "",
            originalPrice: (orig && orig !== "null" && orig !== "") ? orig : curr,
            currentPrice: curr,
            qty: p.quantity || p.qty || 1,
          });
        });
      }
    }
    this.selectedProducts = arr;
  },
  onShow() {
    const raw = uni.getStorageSync("checkoutItems");
    const arr = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(p => {
          const orig = p.originalPrice ? String(p.originalPrice).replace("¥", "") : null;
          const curr = String(p.currentPrice || p.originalPrice || "0").replace("¥", "");
          arr.push({
            name: p.name || "未知商品",
            spec: p.spec || p.desc || "",
            image: p.image || "",
            originalPrice: (orig && orig !== "null" && orig !== "") ? orig : curr,
            currentPrice: curr,
            qty: p.quantity || p.qty || 1,
          });
        });
      }
    }
    this.selectedProducts = arr;
  },
  methods: {
    goBack() { uni.navigateBack() },
    selectAddress() { uni.navigateTo({ url: '/pages/address/index' }) },
    switchDelivery(type) { this.deliveryType = type },
    switchTime(time) { this.timeType = time },
    toggleFeeInfo() { this.showFeeInfo = !this.showFeeInfo },
    pickTime() {
      uni.showActionSheet({
        itemList: ['上午 9:00-12:00', '下午 14:00-18:00'],
        success: (res) => {
          if (res.tapIndex === 0) {
            uni.showActionSheet({
              itemList: ['09:00', '10:00', '11:00', '12:00'],
              success: (r) => {
                this.selectedTime = ['09:00', '10:00', '11:00', '12:00'][r.tapIndex];
              }
            });
          } else {
            uni.showActionSheet({
              itemList: ['14:00', '15:00', '16:00', '17:00', '18:00'],
              success: (r) => {
                this.selectedTime = ['14:00', '15:00', '16:00', '17:00', '18:00'][r.tapIndex];
              }
            });
          }
        }
      });
    },
    toggleAddOn(index) { this.addOnProducts[index].checked = !this.addOnProducts[index].checked },
    showCoupon() {},
    showRemark() {
      uni.showModal({
        title: '填写备注',
        editable: true,
        placeholderText: '请输入备注',
        success: (res) => {
          if (res.confirm && res.content) {
            this.remark = res.content
          }
        }
      });
    },
    handlePay() {
      if (this.selectedProducts.length === 0) {
        uni.showToast({ title: '请选择商品', icon: 'none' })
        return
      }
      if (!this.selectedAddress || !this.selectedAddress.address) {
        uni.showToast({ title: '请选择收货地址', icon: 'none' })
        return
      }
      uni.showModal({
        title: '选择付款结果',
        content: '请选择模拟付款状态',
        cancelText: '付款成功',
        confirmText: '付款失败',
        success: (res) => {
          if (res.cancel) {
            // 配送订单付款成功后直接设为待分拣（已接单），触发云函数自动分配骑手
            // 自提订单保持待分拣（无需骑手）
            this.doPaySuccess('pending_sorting')
          } else if (res.confirm) {
            // 模拟付款失败 - 状态变为待付款
            this.doPaySuccess('pending_payment')
          }
        }
      })
    },
    callAPI(method, params) {
      return new Promise((resolve, reject) => {
        uni.request({
          url: `https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/${method}`,
          method: 'POST',
          data: { method, params },
          success: (res) => {
            if (res.data && res.data.code === 0) {
              resolve(res.data)
            } else {
              reject(res.data || { error: '请求失败' })
            }
          },
          fail: (err) => reject(err)
        })
      })
    },
    async doPaySuccess(orderStatus) {
      orderStatus = orderStatus || 'delivering'
      const userId = 'user_' + (uni.getStorageSync('userId') || Date.now())

      // 生成完整订单号
      // 格式：A1 + 年月日时分(10位) + 手机尾号(4位) + 随机码(4位) = 20位
      const now = new Date()
      const y = String(now.getFullYear()).slice(-2)
      const mo = String(now.getMonth() + 1).padStart(2, '0')
      const da = String(now.getDate()).padStart(2, '0')
      const h = now.getHours()
      const mi = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      const timeStr = `${y}${mo}${da}${h}${mi}${s}` // 10位时间
      const phone = this.selectedAddress?.phone || ''
      const phoneTail = phone.slice(-4) || '0000' // 手机尾号4位
      const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0') // 随机4位
      const fullOrderNo = `A1${timeStr}${phoneTail}${random}` // 20位完整订单号
      // 简化订单号用于显示（去掉A1和手机尾号）
      const shortOrderNo = `${timeStr}${random}`

      // 构建云端订单数据
      const cloudOrderData = {
        orderNo: fullOrderNo,
        shortOrderNo: shortOrderNo,
        // 从商品上拿 merchantId（多商家场景下取第一个）
        merchantId: (this.selectedProducts[0] && this.selectedProducts[0].merchantId) || 'm_test_001',
        userId: userId,
        userPhone: phone,
        products: this.selectedProducts.map(p => ({
          name: p.name,
          spec: p.spec,
          price: parseFloat(p.currentPrice) || 0,
          qty: p.qty || 1,
          image: p.image || ''
        })).concat(
          this.addOnProducts.filter(a => a.checked).map(a => ({
            name: a.name,
            spec: a.spec,
            price: parseFloat(a.currentPrice) || 0,
            qty: 1,
            image: a.image || ''
          }))
        ),
        totalAmount: parseFloat(this.totalPayable) || 0,
        status: orderStatus,
        remark: this.remark || '',
        deliveryTime: this.selectedTime,
        deliveryType: this.deliveryType,
        timeType: this.timeType,
        payMethod: '微信支付',
        packFee: '¥0',
        deliveryFee: this.deliveryType === 'self' ? '¥0' : ('¥' + this.computedDeliveryFee),
        coupon: '¥0',
        orderTime: (() => {
          const amp = h < 12 ? '上午' : '下午'
          const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h)
          return `${y}.${mo}.${da}${amp}${h12}:${mi}`
        })(),
        address: {
          name: this.selectedAddress ? (this.selectedAddress.name || '邻居') : '邻居',
          phone: this.selectedAddress ? (this.selectedAddress.phone || '') : '',
          address: this.selectedAddress ? (this.selectedAddress.address || '') : '',
          doorNo: this.selectedAddress ? (this.selectedAddress.doorNo || '') : ''
        }
      }

      // 保存云端订单ID
      let cloudOrderId = null
      try {
        // 调用云端API创建订单
        const res = await this.callAPI('createOrder', cloudOrderData)
        console.log('云端订单创建成功:', res)
        if (res && res.data && res.data.id) {
          cloudOrderId = res.data.id
        }
      } catch (e) {
        console.error('云端订单创建失败，使用本地存储:', e)
      }

      // 继续本地流程
      const newOrder = {
        id: fullOrderNo,
        shortId: shortOrderNo,
        fullId: cloudOrderId || fullOrderNo,
        _id: cloudOrderId,
        status: orderStatus,
        deliveryTime: this.selectedTime,
        deliveryType: this.deliveryType,
        timeType: this.timeType,
        payMethod: '微信支付',
        packFee: '¥0.00',
        deliveryFee: this.deliveryType === 'self' ? '¥0.00' : ('¥' + this.computedDeliveryFee),
        coupon: '¥0',
        orderTime: (() => {
          const amp = h < 12 ? '上午' : '下午'
          const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h)
          return `${y}.${mo}.${da}${amp}${h12}:${mi}`
        })(),
        address: this.selectedAddress ? {
          name: this.selectedAddress.name || '邻居',
          phone: this.selectedAddress.phone || '',
          address: this.selectedAddress.address || '',
          doorNo: this.selectedAddress.doorNo || ''
        } : { name: '邻居', phone: '', address: '', doorNo: '' },
        remark: this.remark || '',
        total: this.totalPayable,
        actionBtn: '查看详情',
        expanded: false,
        products: this.selectedProducts.map(p => ({
          name: p.name,
          spec: p.spec,
          price: p.currentPrice,
          qty: p.qty,
          image: p.image,
          originalPrice: p.originalPrice !== p.currentPrice ? p.originalPrice : undefined
        })).concat(
          this.addOnProducts.filter(a => a.checked).map(a => ({
            name: a.name,
            spec: a.spec,
            price: a.currentPrice,
            qty: 1,
            image: a.image,
            originalPrice: a.originalPrice !== a.currentPrice ? a.originalPrice : undefined
          }))
        )
      }
      addOrder(newOrder)
      // 清空购物车和结算项
      uni.removeStorageSync('cartItems')
      uni.removeStorageSync('checkoutItems')
      const successMsg = orderStatus === '待支付' ? '订单待支付' : '付款成功'
      uni.showToast({ title: successMsg, icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/order/index' })
      }, 1500)
    }
  }
}
</script>

<style>
page {
  background-color: #F5F1EB;
}

.checkout-page {
  min-height: 100vh;
  background-color: #F5F1EB;
  padding-bottom: 120rpx;
}

/* ===== 顶部区域 ===== */
.header {
  background-color: #FFFFFF;
  padding: 20rpx 24rpx 24rpx;
  border-radius: 0 0 16rpx 16rpx;
}

.header-row {
  display: flex;
  align-items: center;
}

.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-arrow {
  font-size: 44rpx;
  color: #000;
  font-weight: 300;
}

.address-input {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #F5F5F5;
  border-radius: 36rpx;
  height: 64rpx;
  padding: 0 20rpx;
  margin: 0 16rpx;
}

.addr-icon {
  font-size: 44rpx;
  margin-right: 8rpx;
  color: #4F9A42;
}

.addr-text {
  font-size: 26rpx;
  color: #333;
}

.delivery-switch {
  display: flex;
  flex-shrink: 0;
}

.switch-item {
  padding: 0 24rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #666;
  background-color: #F0F0F0;
  border-radius: 8rpx;
  margin-left: 8rpx;
}

.switch-item.active {
  background-color: #4F9A42;
  color: #FFFFFF;
}

.time-tabs {
  display: flex;
  justify-content: center;
  margin-top: 20rpx;
  gap: 20rpx;
}

.time-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #666666;
  background-color: #FFFFFF;
  border: 2rpx solid #CCCCCC;
  position: relative;
}

.time-tab.active {
  color: #4F9A42;
  border-color: #4F9A42;
}

.time-tab.active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 32rpx 32rpx;
  border-color: transparent transparent #4F9A42 transparent;
}

.tab-check {
  font-size: 20rpx;
  color: #FFFFFF;
  position: absolute;
  right: 4rpx;
  bottom: 2rpx;
}

.time-tab.active .tab-check {
  display: block;
}

.time-tab .tab-check {
  display: none;
}

.time-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
}

.time-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #999;
}

.time-link {
  font-size: 28rpx;
  color: #999;
}

/* ===== 通用卡片 ===== */
.card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  margin: 16rpx 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}

/* ===== 已选商品 ===== */
.product-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.product-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.product-img {
  width: 128rpx;
  height: 128rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.product-detail {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-text {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 30rpx;
  color: #000;
  font-weight: 500;
}

.product-spec {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.product-prices {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.price-old {
  font-size: 22rpx;
  color: #FF6B00;
  text-decoration: line-through;
}

.price-now {
  font-size: 30rpx;
  color: #4F9A42;
  font-weight: 700;
}

.product-qty {
  font-size: 24rpx;
  color: #999;
}

/* ===== 超值加购 ===== */
.addon-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.addon-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #000;
  margin-right: 16rpx;
}

.addon-sub {
  font-size: 24rpx;
  color: #999;
}

.addon-scroll {
  white-space: nowrap;
  width: 100%;
}

.addon-list {
  display: flex;
  gap: 16rpx;
}

.addon-item {
  width: 168rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #FAFAFA;
  border-radius: 12rpx;
  padding: 12rpx;
}

.addon-img {
  width: 144rpx;
  height: 100rpx;
  border-radius: 8rpx;
}

.addon-name {
  font-size: 24rpx;
  color: #000;
  margin-top: 8rpx;
  white-space: normal;
  line-height: 1.2;
}

.addon-spec {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}

.addon-price-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  margin-top: 6rpx;
}

.addon-price-old {
  font-size: 20rpx;
  color: #999;
  text-decoration: line-through;
}

.addon-price-now {
  font-size: 24rpx;
  color: #4F9A42;
  font-weight: 700;
}

.addon-radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #CCC;
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.addon-radio.checked {
  background-color: #4F9A42;
  border-color: #4F9A42;
}

.radio-dot {
  font-size: 18rpx;
  color: #FFF;
}

/* ===== 信息行通用 ===== */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-left {
  display: flex;
  align-items: center;
}

.info-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
  color: #4F9A42;
}

.info-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #000;
}

.info-right {
  font-size: 26rpx;
  color: #999;
}

.info-right-with-arrow {
  display: flex;
  align-items: center;
}

.info-arrow {
  font-size: 24rpx;
  color: #999;
  margin-left: 8rpx;
}

.fee-rules {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F0F0F0;
}

.fee-rule-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10rpx;
}

.fee-rule-dot {
  color: #4F9A42;
  margin-right: 8rpx;
  font-size: 26rpx;
}

.fee-rule-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
}

.info-link {
  font-size: 26rpx;
  color: #4F9A42;
}

.info-notice {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F0F0F0;
}

.notice-icon {
  font-size: 22rpx;
  margin-right: 6rpx;
}

.notice-text {
  font-size: 22rpx;
  color: #999;
}

/* ===== 已优惠/应付 ===== */
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-discount {
  font-size: 26rpx;
  color: #999;
}

.summary-payable {
  font-size: 26rpx;
  color: #000;
}

.summary-amount {
  font-size: 34rpx;
  font-weight: 700;
  color: #000;
}

/* ===== 底部结算栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: #FFFFFF;
  border-top: 1rpx solid #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 24rpx;
  z-index: 100;
}

.bottom-left {
  display: flex;
  align-items: baseline;
}

.bottom-label {
  font-size: 28rpx;
  color: #000;
}

.bottom-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #000;
}

.pay-btn {
  width: 50%;
  height: 100rpx;
  background-color: #4F9A42;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
}

.pay-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #FFFFFF;
}
</style>