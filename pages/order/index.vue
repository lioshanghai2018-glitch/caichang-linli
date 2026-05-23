<template>
	<view class="page">
		<!-- 顶部Tab切换 -->
		<view class="tab-bar">
			<view
				class="tab-item"
				:class="{ active: currentTab === 0 }"
				@tap="switchTab(0)"
			>
				<text>当前订单</text>
			</view>
			<view
				class="tab-item"
				:class="{ active: currentTab === 1 }"
				@tap="switchTab(1)"
			>
				<text>历史订单</text>
			</view>
		</view>

		<!-- 当前订单列表 -->
		<scroll-view class="order-list" scroll-y="true" v-if="currentTab === 0">
			<view class="order-card" v-for="order in currentOrders" :key="order.id" @tap="toggleDetail(order)">
				<!-- 卡片头部 -->
				<view class="order-header">
					<text class="order-id">订单号：{{order.shortId}}</text>
					<view class="order-status ongoing">
						<text>{{order.status}}</text>
					</view>
				</view>

				<!-- 商品列表 -->
				<view class="product-row" v-for="(product, pIdx) in order.products" :key="pIdx">
					<image class="product-thumb" :src="product.image" mode="aspectFill"></image>
					<view class="product-info">
						<text class="product-name">{{product.name}}</text>
						<text class="product-spec">{{product.spec}}</text>
					</view>
					<view class="product-price-wrap">
						<text class="product-price">¥{{product.price}}</text>
						<text class="product-qty">x{{product.qty}}</text>
					</view>
				</view>

				<!-- 展开详情 -->
				<view class="order-detail" v-if="order.expanded">
					<view class="divider"></view>
					<view class="detail-section">
						<view class="info-row">
							<text class="info-label">预计送达</text>
							<text class="info-value">{{order.deliveryTime}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">支付方式</text>
							<text class="info-value">{{order.payMethod}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">打包费</text>
							<text class="info-value">{{order.packFee}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">配送费</text>
							<text class="info-value">{{order.deliveryFee}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">优惠券</text>
							<text class="info-value coupon">{{order.coupon}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">下单时间</text>
							<text class="info-value time">{{order.orderTime}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">收货地址</text>
							<text class="info-value address">{{order.address}}</text>
						</view>
						<view class="info-row" v-if="order.remark">
							<text class="info-label">备注</text>
							<text class="info-value">{{order.remark}}</text>
						</view>
					</view>
				</view>

				<!-- 底部：总价 + 按钮 -->
				<view class="order-footer">
					<text class="total-text">实付 <text class="total-price">¥{{order.total}}</text></text>
					<view class="action-btn">
						<text>{{order.actionBtn}}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 历史订单列表 -->
		<scroll-view class="order-list" scroll-y="true" v-if="currentTab === 1">
			<view class="order-card" v-for="order in historyOrders" :key="order.id" @tap="toggleDetail(order)">
				<!-- 卡片头部 -->
				<view class="order-header">
					<view class="order-header-left">
						<text class="order-id">订单号：{{order.shortId}}</text>
						<view class="order-status done">
							<text>{{order.status}}</text>
						</view>
					</view>
				</view>

				<!-- 门店信息 -->
				<view class="store-row">
					<text class="store-name">{{order.store}}</text>
					<view class="call-btn" @tap.stop="makeCall">
						<text>一键拨号</text>
					</view>
				</view>

				<!-- 商品列表 -->
				<view class="product-row" v-for="(product, pIdx) in order.products" :key="pIdx">
					<image class="product-thumb" :src="product.image" mode="aspectFill"></image>
					<view class="product-info">
						<text class="product-name">{{product.name}}</text>
						<text class="product-spec">{{product.spec}}</text>
					</view>
					<view class="product-price-wrap">
						<text class="product-original">¥{{product.originalPrice}}</text>
						<text class="product-price">¥{{product.price}}</text>
						<text class="product-qty">x{{product.qty}}</text>
					</view>
				</view>

				<!-- 展开详情 -->
				<view class="order-detail" v-if="order.expanded">
					<view class="divider"></view>
					<view class="detail-section">
						<view class="fee-row">
							<text class="fee-label">支付方式</text>
							<text class="fee-value">{{order.payMethod}}</text>
						</view>
						<view class="fee-row">
							<text class="fee-label">打包费</text>
							<text class="fee-value">{{order.packFee}}</text>
						</view>
						<view class="fee-row">
							<text class="fee-label">配送费</text>
							<text class="fee-value">{{order.deliveryFee}}</text>
						</view>
						<view class="fee-row total-fee-row">
							<text class="fee-label">实付</text>
							<text class="total-price">¥{{order.total}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">下单时间</text>
							<text class="info-value time">{{order.orderTime}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">送达时间</text>
							<text class="info-value time">{{order.deliveryTime}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">订单号</text>
							<view class="order-no-wrap">
								<text class="info-value">{{order.fullId}}</text>
								<view class="copy-btn" @tap.stop="copyOrderNo(order.fullId)">
									<text>复制</text>
								</view>
							</view>
						</view>
						<view class="info-row">
							<text class="info-label">收货地址</text>
							<text class="info-value address">{{order.address}}</text>
						</view>
					</view>
				</view>

				<!-- 底部：售后提示 + 按钮 -->
				<view class="order-footer">
					<text class="service-tip-text">如有售后服务请联系门店</text>
					<view class="footer-btns">
						<view class="btn-outline" @tap.stop="afterSale">
							<text>申请售后</text>
						</view>
						<view class="btn-solid" @tap.stop="reOrder">
							<text>再来一单</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
		<custom-tabbar :current="2" />
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentTab: 0,
				currentOrders: [
					{
						id: 1,
						shortId: '1023',
						status: '配送中',
						deliveryTime: '18:30',
						payMethod: '微信支付',
						packFee: '¥0.50',
						deliveryFee: '¥5.00',
						coupon: '-¥2',
						orderTime: '2026.05.12 10:58',
						address: '丽江市古城区大研街道XX小区3栋101室',
						remark: '请轻敲门',
						total: '25.50',
						actionBtn: '微信支付',
						expanded: false,
						products: [
							{
								name: '有机西红柿',
								spec: '约500g/份',
								price: '15.80',
								qty: 2,
								image: '/static/images/有机西红柿.png'
							},
							{
								name: '小青菜',
								spec: '约300g/份',
								price: '6.50',
								qty: 1,
								image: '/static/images/有机青菜.png'
							}
						]
					}
				],
				historyOrders: [
					{
						id: 2,
						shortId: '1019',
						fullId: '1725056890123456789',
						status: '已完成',
						store: '和业柏华店',
						payMethod: '微信支付',
						packFee: '¥0.50',
						deliveryFee: '¥5.00',
						total: '68.50',
						orderTime: '2026.05.10 12:30',
						deliveryTime: '2026.05.10 13:15',
						address: '丽江市古城区大研街道XX小区3栋101室',
						expanded: false,
						products: [
							{
								name: '有机西红柿',
								spec: '约500g/份',
								originalPrice: '20.00',
								price: '15.80',
								qty: 2,
								image: '/static/images/有机西红柿.png'
							},
							{
								name: '小青菜',
								spec: '约300g/份',
								originalPrice: '9.00',
								price: '6.50',
								qty: 1,
								image: '/static/images/有机青菜.png'
							}
						]
					}
				]
			}
		},
		methods: {
			switchTab(index) {
				this.currentTab = index
			},
			toggleDetail(order) {
				order.expanded = !order.expanded
			},
			copyOrderNo(fullId) {
				uni.setClipboardData({
					data: fullId,
					success: () => {
						uni.showToast({ title: '已复制', icon: 'success' })
					}
				})
			},
			makeCall() {
				uni.makePhoneCall({ phoneNumber: '10086' })
			},
			afterSale() {
				uni.showToast({ title: '申请售后', icon: 'none' })
			},
			reOrder() {
				uni.showToast({ title: '再来一单', icon: 'none' })
			}
		}
	}
</script>

<style>
.page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #FFFFFF;
}

/* Tab切换栏 */
.tab-bar {
	display: flex;
	height: 88rpx;
	background-color: #FFFFFF;
	border-bottom: 1rpx solid #EEEEEE;
}

.tab-item {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.tab-item text {
	font-size: 28rpx;
	font-weight: 400;
	color: #666666;
}

.tab-item.active text {
	font-weight: 600;
	color: #4f9a42;
}

.tab-item.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 60rpx;
	height: 4rpx;
	background-color: #4f9a42;
	border-radius: 2rpx;
}

/* 订单列表 */
.order-list {
	flex: 1;
	padding: 20rpx 24rpx;
}

/* 订单卡片 */
.order-card {
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 20rpx;
	border: 1rpx solid #F0F0F0;
}

.order-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.order-header-left {
	display: flex;
	align-items: center;
}

.order-id {
	font-size: 36rpx;
	font-weight: 700;
	color: #333333;
}

.order-status {
	padding: 6rpx 16rpx;
	border-radius: 8rpx;
	margin-left: 16rpx;
}

.order-status.ongoing {
	background-color: #4f9a42;
}

.order-status.ongoing text {
	font-size: 24rpx;
	font-weight: 600;
	color: #FFFFFF;
}

.order-status.done {
	background-color: #E8F5E9;
}

.order-status.done text {
	font-size: 24rpx;
	font-weight: 600;
	color: #4f9a42;
}

/* 门店行 */
.store-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 20rpx;
}

.store-name {
	font-size: 28rpx;
	color: #333333;
}

.call-btn {
	border: 2rpx solid #4f9a42;
	border-radius: 40rpx;
	padding: 8rpx 24rpx;
}

.call-btn text {
	font-size: 28rpx;
	font-weight: 600;
	color: #4f9a42;
}

/* 商品行 */
.product-row {
	display: flex;
	align-items: center;
	margin-top: 20rpx;
}

.product-thumb {
	width: 120rpx;
	height: 120rpx;
	border-radius: 8rpx;
	background-color: #F5F5F5;
	flex-shrink: 0;
}

.product-info {
	flex: 1;
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
}

.product-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #333333;
}

.product-spec {
	font-size: 28rpx;
	color: #666666;
	margin-top: 4rpx;
}

.product-price-wrap {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
	margin-left: 16rpx;
}

.product-original {
	font-size: 28rpx;
	color: #999999;
	text-decoration: line-through;
}

.product-price {
	font-size: 32rpx;
	font-weight: 700;
	color: #4f9a42;
	margin-top: 4rpx;
}

.product-qty {
	font-size: 28rpx;
	color: #666666;
	margin-top: 4rpx;
}

/* 展开详情 */
.order-detail {
	margin-top: 16rpx;
}

.divider {
	height: 1rpx;
	background-color: #E0E0E0;
	margin: 16rpx 0;
}

.detail-section {
	padding: 4rpx 0;
}

/* 信息行 */
.info-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 12rpx;
}

.info-label {
	font-size: 28rpx;
	color: #666666;
	flex-shrink: 0;
}

.info-value {
	font-size: 28rpx;
	color: #333333;
	text-align: right;
	margin-left: 24rpx;
}

.info-value.time {
	color: #999999;
}

.info-value.address {
	color: #333333;
}

/* 费用行 */
.fee-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
}

.fee-label {
	font-size: 28rpx;
	color: #666666;
}

.fee-value {
	font-size: 28rpx;
	color: #333333;
}

.total-fee-row {
	margin-top: 16rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid #E0E0E0;
}

.total-fee-row .fee-label {
	font-weight: 600;
	color: #333333;
	font-size: 32rpx;
}

.total-price {
	font-size: 32rpx;
	font-weight: 700;
	color: #4f9a42;
}

/* 订单号复制 */
.order-no-wrap {
	display: flex;
	align-items: center;
}

.order-no-wrap .info-value {
	margin-left: 0;
	margin-right: 12rpx;
}

.copy-btn {
	background-color: #F5F5F5;
	border-radius: 8rpx;
	padding: 6rpx 16rpx;
}

.copy-btn text {
	font-size: 24rpx;
	color: #4f9a42;
}

/* 底部 */
.order-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 16rpx;
}

.total-text {
	font-size: 28rpx;
	color: #333333;
}

.service-tip-text {
	font-size: 28rpx;
	color: #666666;
	flex: 1;
}

.footer-btns {
	display: flex;
	align-items: center;
}

.btn-outline {
	border: 2rpx solid #4f9a42;
	border-radius: 16rpx;
	padding: 14rpx 28rpx;
	margin-right: 16rpx;
}

.btn-outline text {
	font-size: 28rpx;
	font-weight: 600;
	color: #4f9a42;
}

.btn-solid {
	background-color: #4f9a42;
	border-radius: 16rpx;
	padding: 14rpx 28rpx;
}

.btn-solid text {
	font-size: 28rpx;
	font-weight: 600;
	color: #FFFFFF;
}

.action-btn {
	background-color: #4f9a42;
	padding: 14rpx 36rpx;
	border-radius: 16rpx;
}

.action-btn text {
	font-size: 28rpx;
	font-weight: 600;
	color: #FFFFFF;
}

.info-value.coupon {
	color: #FF3333;
	font-weight: 600;
}
</style>