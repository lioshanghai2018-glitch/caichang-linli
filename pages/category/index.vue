<template>
	<view class="page">
		<!-- 顶部搜索栏 -->
		<view class="header">
			<view class="header-row">
				<view class="back-btn">
					<text class="back-arrow">‹</text>
				</view>
				<view class="search-box">
				<view class="search-icon-line"></view>
				<input class="search-input" type="text" placeholder="搜索商品" placeholder-class="search-placeholder" />
			</view>
				<view class="cart-wrap">
					<view class="iconfont icon-gouwuche cart-icon"></view>
					<view class="cart-badge" v-if="cartCount > 0">
						<text>{{cartCount}}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 优惠插图轮播 -->
		<swiper class="promo-swiper" circular="true" @change="onPromoChange">
			<swiper-item>
				<image class="promo-image" src="/static/images/shucailan.png" mode="aspectFill"></image>
			</swiper-item>
			<swiper-item>
				<image class="promo-image" src="/static/images/shucailan.png" mode="aspectFill"></image>
			</swiper-item>
		</swiper>
		<view class="promo-indicators">
			<view class="indicator" :class="{ active: currentPromo === 0 }"></view>
			<view class="indicator" :class="{ active: currentPromo === 1 }"></view>
		</view>

		<!-- 左右分栏 -->
		<view class="content">
			<!-- 左侧分类栏 -->
			<scroll-view class="category-sidebar" scroll-y="true">
				<view
					class="category-item"
					:class="{ active: currentCategory === index }"
					v-for="(item, index) in categories"
					:key="index"
					@tap="selectCategory(index)"
				>
					<text>{{item.name}}</text>
				</view>
			</scroll-view>

			<!-- 右侧商品列表 -->
			<scroll-view class="product-area" scroll-y="true">
				<view class="product-item" v-for="item in products" :key="item.id">
					<image class="product-img" :src="item.image" mode="aspectFill"></image>
					<view class="product-detail">
						<text class="product-name">{{item.name}}</text>
						<text class="product-desc">{{item.desc}}</text>
						<view class="product-service-tag">
							<text>{{item.service}}</text>
						</view>
						<view class="price-row">
							<text class="original-price">{{item.originalPrice}}</text>
							<text class="current-price">{{item.currentPrice}}</text>
						</view>
						<view class="quantity-control">
							<view class="btn-minus" v-if="item.quantity > 0" @tap="decrease(item)">
								<view class="minus-icon"></view>
							</view>
							<text class="quantity-num" v-if="item.quantity > 0">{{item.quantity}}</text>
							<view class="btn-plus" @tap="increase(item)">
								<view class="add-icon"></view>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 底部结算栏 -->
		<view class="checkout-bar" v-if="selectedCount > 0">
			<view class="checkout-left">
				<view class="checkout-cart-wrap">
					<image class="checkout-cart-icon" src="/static/images/gouwuche.png" mode="aspectFit"></image>
					<view class="checkout-cart-badge">
						<text>{{selectedCount}}</text>
					</view>
				</view>
				<view class="checkout-info">
					<text class="checkout-count">已选{{selectedCount}}件商品</text>
					<text class="checkout-total">合计：<text class="checkout-price">¥{{selectedTotal}}</text></text>
				</view>
			</view>
			<view class="checkout-btn" @tap="goCheckout">
				<text>去结算</text>
			</view>
		</view>
		<custom-tabbar :current="1" />
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentCategory: 0,
				currentPromo: 0,
				cartCount: 3,
				selectedCount: 3,
				selectedTotal: '12.16',
				categories: [
					{ name: '叶菜类' },
					{ name: '茄果类' },
					{ name: '瓜果类' },
					{ name: '菌菇类' },
					{ name: '根茎类' },
					{ name: '豆制品' },
					{ name: '肉禽蛋' }
				],
				products: [
					{
						id: 1,
						name: '上海青 约500g',
						desc: '新鲜直采·产地直发',
						service: '当日下单·次日自提',
						originalPrice: '¥2.99',
						currentPrice: '¥2.19',
						image: '/static/images/胡萝卜.png',
						quantity: 1
					},
					{
						id: 2,
						name: '西红柿 约500g',
						desc: '自然成熟·酸甜可口',
						service: '当日下单·次日自提',
						originalPrice: '¥3.99',
						currentPrice: '¥2.99',
						image: '/static/images/有机西红柿.png',
						quantity: 0
					},
					{
						id: 3,
						name: '土鸡蛋 10枚',
						desc: '农家散养·营养健康',
						service: '当日下单·次日自提',
						originalPrice: '¥8.90',
						currentPrice: '¥6.90',
						image: '/static/images/新鲜鸡蛋.png',
						quantity: 0
					},
					{
						id: 4,
						name: '红富士苹果 约1kg',
						desc: '脆甜多汁·新鲜采摘',
						service: '当日下单·次日自提',
						originalPrice: '¥6.98',
						currentPrice: '¥4.98',
						image: '/static/images/有机青菜.png',
						quantity: 0
					}
				]
			}
		},
		methods: {
			selectCategory(index) {
				this.currentCategory = index
			},
			onPromoChange(e) {
				this.currentPromo = e.detail.current
			},
			increase(item) {
				item.quantity++
				this.updateCart()
			},
			decrease(item) {
				if (item.quantity > 0) item.quantity--
				this.updateCart()
			},
			updateCart() {
				let count = 0;
				let total = 0;
				this.products.forEach(p => {
					if (p.quantity > 0) {
						count += p.quantity;
						total += p.quantity * parseFloat(p.currentPrice.replace('¥', ''));
					}
				});
				this.selectedCount = count;
				this.selectedTotal = total.toFixed(2);
				this.cartCount = count;
			},
			goCheckout() {
				// 保存已选商品到 localStorage，供购物车页面使用
				const selectedProducts = this.products.filter(p => p.quantity > 0).map(p => ({
					name: p.name,
					spec: p.desc,
					image: p.image,
					currentPrice: p.currentPrice,
					originalPrice: p.originalPrice,
					quantity: p.quantity,
					selected: true
				}))
				if (selectedProducts.length > 0) {
					uni.setStorageSync('cartItems', JSON.stringify(selectedProducts))
				}
				uni.navigateTo({ url: "/pages/cart/index" })
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

/* 顶部搜索栏 */
.header {
	background-color: #FFFFFF;
	padding: 16rpx 24rpx;
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
	margin-right: 12rpx;
}

.back-arrow {
	font-size: 44rpx;
	color: #333333;
}

.search-box {
	flex: 1;
	height: 68rpx;
	background-color: #F5F5F5;
	border-radius: 34rpx;
	display: flex;
	align-items: center;
	padding: 0 24rpx;
}

.search-icon-line {
	width: 24rpx;
	height: 24rpx;
	border: 3rpx solid #999999;
	border-radius: 50%;
	position: relative;
	margin-right: 12rpx;
}

.search-icon-line::after {
	content: '';
	position: absolute;
	right: -4rpx;
	bottom: -4rpx;
	width: 12rpx;
	height: 3rpx;
	background-color: #999999;
	transform: rotate(45deg);
	border-radius: 2rpx;
}

.search-input {
	flex: 1;
	font-size: 26rpx;
	color: #333333;
	height: 100%;
	background: transparent;
}

.search-placeholder {
	font-size: 26rpx;
	color: #999999;
}

.cart-wrap {
	position: relative;
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: 16rpx;
}

.cart-icon {
	width: 40rpx;
	height: 40rpx;
}

.cart-badge {
	position: absolute;
	top: -4rpx;
	right: -12rpx;
	min-width: 28rpx;
	height: 28rpx;
	background-color: #FF3333;
	border-radius: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 6rpx;
}

.cart-badge text {
	color: #FFFFFF;
	font-size: 18rpx;
}

/* 优惠插图轮播 */
.promo-swiper {
	width: 100%;
	height: 300rpx;
	overflow: hidden;
}

.promo-image {
	width: 100%;
	height: 100%;
}

.promo-indicators {
	display: flex;
	justify-content: center;
	margin-top: 12rpx;
}

.indicator {
	width: 12rpx;
	height: 12rpx;
	background-color: #CCCCCC;
	border-radius: 50%;
	margin: 0 8rpx;
}

.indicator.active {
	background-color: #2D5A27;
}

/* 左右分栏 */
.content {
	flex: 1;
	display: flex;
	overflow: hidden;
	padding-top: 24rpx;
}

/* 左侧分类栏 */
.category-sidebar {
	width: 170rpx;
	height: 100%;
	background-color: #F7F7F7;
}

.category-item {
	height: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 26rpx;
	font-weight: 400;
	color: #666666;
	position: relative;
	background-color: #F7F7F7;
}

.category-item.active {
	color: #2D5A27;
	font-weight: 600;
	background-color: #FFFFFF;
}

.category-item.active::before {
	content: '';
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 6rpx;
	height: 36rpx;
	background-color: #2D5A27;
	border-radius: 3rpx;
}

/* 右侧商品区 */
.product-area {
	flex: 1;
	height: 100%;
	padding: 16rpx 24rpx;
}

.product-item {
	display: flex;
	margin-bottom: 24rpx;
	align-items: flex-start;
}

.product-img {
	width: 180rpx;
	height: 180rpx;
	border-radius: 12rpx;
	background-color: #f5f5f5;
	flex-shrink: 0;
}

.product-detail {
	flex: 1;
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
	position: relative;
}

.product-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #333333;
	line-height: 40rpx;
}

.product-desc {
	font-size: 20rpx;
	font-weight: 400;
	color: #666666;
	margin-top: 6rpx;
}

.product-service-tag {
	display: inline-flex;
	background-color: #E8F5E9;
	border-radius: 4rpx;
	padding: 2rpx 8rpx;
	margin-top: 8rpx;
	align-self: flex-start;
}

.product-service-tag text {
	font-size: 18rpx;
	font-weight: 600;
	color: #4F9A42;
}

.price-row {
	display: flex;
	align-items: center;
	margin-top: 12rpx;
}

.original-price {
	font-size: 22rpx;
	font-weight: 400;
	color: #999999;
	text-decoration: line-through;
	margin-left: 8rpx;
}

.current-price {
	font-size: 28rpx;
	font-weight: 700;
	color: #FF3333;
}

.quantity-control {
	display: flex;
	align-items: center;
	position: absolute;
	right: 0;
	bottom: 0;
}

.btn-minus,
.btn-plus {
	width: 44rpx;
	height: 44rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.minus-icon {
	width: 20rpx;
	height: 4rpx;
	background-color: #999999;
	border-radius: 2rpx;
}

.btn-minus {
	width: 44rpx;
	height: 44rpx;
	border: 2rpx solid #E0E0E0;
	border-radius: 50%;
	background-color: #FFFFFF;
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-plus {
	background-color: #4F9A42;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.add-icon {
	width: 20rpx;
	height: 4rpx;
	background-color: #FFFFFF;
	border-radius: 2rpx;
	position: relative;
}
.add-icon::after {
	content: '';
	position: absolute;
	width: 4rpx;
	height: 20rpx;
	background-color: #FFFFFF;
	border-radius: 2rpx;
	top: -8rpx;
	left: 8rpx;
}

.cart-icon {
	font-size: 50rpx;
	color: #333333;
}

.quantity-num {
	font-size: 26rpx;
	color: #333333;
	width: 40rpx;
	text-align: center;
}

/* 底部结算栏 */
.checkout-bar {
	position: fixed;
	bottom: 100rpx;
	left: 0;
	right: 0;
	height: 100rpx;
	background-color: #FFFFFF;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 24rpx;
	box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
	z-index: 100;
}

.checkout-left {
	display: flex;
	align-items: center;
}

.checkout-cart-wrap {
	position: relative;
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 16rpx;
}

.checkout-cart-icon {
	width: 75rpx;
	height: 75rpx;
}

.checkout-cart-badge {
	position: absolute;
	top: -4rpx;
	right: -8rpx;
	min-width: 28rpx;
	height: 28rpx;
	background-color: #FF3333;
	border-radius: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 6rpx;
}

.checkout-cart-badge text {
	color: #FFFFFF;
	font-size: 18rpx;
}

.checkout-info {
	display: flex;
	flex-direction: column;
}

.checkout-count {
	font-size: 22rpx;
	color: #999999;
}

.checkout-total {
	font-size: 22rpx;
	color: #333333;
	margin-top: 4rpx;
}

.checkout-price {
	font-size: 28rpx;
	font-weight: 700;
	color: #4CAF50;
}

.checkout-btn {
	background-color: #4f9a42;
	color: #FFFFFF;
	font-size: 28rpx;
	font-weight: 600;
	padding: 16rpx 48rpx;
	border-radius: 40rpx;
}
</style>