<template>
	<view class="page">
		<!-- 顶部搜索栏 -->
		<view class="header">
			<view class="header-row">



				<view class="search-box">
				<view class="search-icon-line"></view>
				<input class="search-input" type="text" placeholder="搜索商品" placeholder-class="search-placeholder" />
			</view>
				<view class="cart-wrap" @tap="goCart">
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
				<image class="promo-image" src="https://mp-ae9bd108-da40-4ae6-923b-c3007dedec12.cdn.bspapp.com/shucailan.jpg" mode="aspectFill"></image>
			</swiper-item>
			<swiper-item>
				<image class="promo-image" src="https://mp-ae9bd108-da40-4ae6-923b-c3007dedec12.cdn.bspapp.com/shucailan.jpg" mode="aspectFill"></image>
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
			<scroll-view class="product-area" :style="{ paddingBottom: selectedCount > 0 ? '220rpx' : '120rpx' }" scroll-y="true" :scroll-into-view="scrollIntoViewId" @scroll="onScroll">
				<!-- 商品列表（含分类标题） -->
				<view v-for="(item, index) in productsWithHeader" :key="index">
					<view v-if="item.isHeader" class="category-header" :id="'cat-header-' + index">
						<text>{{item.categoryName}}</text>
					</view>
					<view v-else class="product-item">
						<image class="product-img" :src="item.image" mode="aspectFill"></image>
						<view class="product-detail">
							<text class="product-name">{{item.name}}</text>
							<text class="product-desc">{{item.desc}}</text>
							<view class="tag-row">
								<view class="product-service-tag">
									<text>{{item.service}}</text>
								</view>
								<view class="product-stock-tag" :class="{ low: item.stock > 0 && item.stock <= 5, out: item.stock <= 0 }">
									<text>{{item.stock > 0 ? '库存 ' + item.stock : '暂时缺货'}}</text>
								</view>
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
								<view class="btn-plus" :class="{ disabled: item.stock <= 0 }" @tap="increase(item)">
									<view class="add-icon"></view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 底部结算栏 -->
		<view class="checkout-bar" v-if="selectedCount > 0">
			<view class="checkout-left" @tap="goCart">
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
	import { getLocalCart, addToCart as cartAdd, decreaseFromCart as cartDecrease, calcCartSummary } from '@/utils/cart.js'

	export default {
		data: function() {
			return {
				currentCategory: 0,
				currentPromo: 0,
				cartCount: 0,
				selectedCount: 0,
				selectedTotal: '0.00',
				categories: [],
				productsLoading: false,
				products: [],
				flashSaleProducts: [],
				scrollIntoViewId: ''
			};
		},
		computed: {
			productsWithHeader: function() {
				var result = [];
				result.push({ isHeader: true, categoryName: '团购特惠' });
				this.flashSaleProducts.forEach(function(p) { result.push(p); });
				var byId = {}, byName = {};
				this.categories.forEach(function(c) {
					if (c.isFixed) return;
					if (c._id) byId[String(c._id)] = c;
					if (c.name) byName[c.name] = c;
				});
				var groups = {};
				this.products.forEach(function(p) {
					var cat = byId[String(p.categoryId)] || byName[p.categoryName] || null;
					if (!cat) return;
					var key = 'cat_' + (cat._id || cat.name);
					if (!groups[key]) groups[key] = { cat: cat, products: [] };
					groups[key].products.push(p);
				});
				this.categories.forEach(function(c) {
					if (c.isFixed) return;
					var key = 'cat_' + (c._id || c.name);
					var group = groups[key];
					var list = group ? group.products : [];
					result.push({ isHeader: true, categoryName: c.name });
					list.forEach(function(p) { result.push(p); });
				});
				return result;
			}
		},
		onLoad: function() {
			this.loadCategories();
			this.loadFlashSaleProducts();
		},
		onShow: function() {
			this.syncCart();
		},
		methods: {
			loadCategories: function() {
				var self = this;
				uni.request({
					url: 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/getCategories',
					method: 'POST',
					data: { method: 'getCategories', params: {} },
					success: function(res) {
						if (res.data && res.data.code === 0 && res.data.data && res.data.data.length > 0) {
							self.categories = [{ name: '团购特惠', _id: '__fixed_flash_sale__', isFixed: true }].concat(res.data.data);
						} else {
							self.categories = [{ name: '团购特惠', _id: '__fixed_flash_sale__', isFixed: true }];
						}
						self.loadAllProducts();
					},
					fail: function(e) {
						console.error('获取分类失败:', e);
						self.categories = [{ name: '团购特惠', _id: '__fixed_flash_sale__', isFixed: true }];
					}
				});
			},
			onScroll: function(e) {
				if (this._skipScrollHighlight) return;
				var self = this;
				uni.createSelectorQuery()
					.in(self)
					.selectAll('.category-header')
					.boundingClientRect(function(rects) {
						if (!rects || rects.length === 0) return;
						var curCatName = null;
						for (var i = 0; i < rects.length; i++) {
							if (rects[i].top >= 0) {
								curCatName = self.categories[i]?.name;
								break;
							}
						}
						if (!curCatName) {
							curCatName = self.categories[rects.length - 1]?.name;
						}
						if (curCatName) {
							var catIndex = self.categories.findIndex(function(c) { return c.name === curCatName; });
							if (catIndex !== -1 && catIndex !== self.currentCategory) {
								self.currentCategory = catIndex;
							}
						}
					})
					.exec();
			},
			selectCategory: function(index) {
				this.currentCategory = index;
				this._skipScrollHighlight = true;
				var self = this;
				setTimeout(function() { self._skipScrollHighlight = false; }, 2000);
				var catName = this.categories[index] ? this.categories[index].name : null;
				var items = this.productsWithHeader;
				var headerIndex = -1;
				for (var i = 0; i < items.length; i++) {
					if (items[i].isHeader && items[i].categoryName === catName) {
						headerIndex = i;
						break;
					}
				}
				if (headerIndex >= 0) {
					var targetId = 'cat-header-' + headerIndex;
					this.scrollIntoViewId = '';
					var self2 = this;
					setTimeout(function() {
						self2.scrollIntoViewId = targetId;
					}, 50);
				}
			},
			loadAllProducts: function() {
				var self = this;
				this.productsLoading = true;
				uni.request({
					url: 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/getProducts',
					method: 'POST',
					data: {
						method: 'getProducts',
						params: { status: true }
					},
					success: function(res) {
						if (res.data && res.data.code === 0) {
							self.products = res.data.data.map(function(item) {
								var spec = (item.specs && item.specs[0]) ? item.specs[0] : null
								var price = spec ? Number(spec.price) : (Number(item.price) || 0)
								var originalPrice = spec ? Number(spec.originalPrice || 0) : (Number(item.originalPrice) || 0)
								if (!originalPrice) originalPrice = price * 1.5
								var stock = spec ? Number(spec.stock || 0) : (Number(item.stock) || 0)
								return {
									id: item._id,
									name: item.name,
									categoryId: String(item.categoryId || ''),
									categoryName: item.categoryName || '',
									desc: item.description || '新鲜直采·产地直发',
									service: '当日下单·次日取货',
									originalPrice: '\u00A5' + originalPrice.toFixed(1),
									currentPrice: '\u00A5' + price.toFixed(1),
									image: (item.images && item.images[0]) ? item.images[0] : '/static/images/placeholder.png',
									stock: stock,
									quantity: 0
								};
							});
							var categoryOrder = self.categories.map(function(c) { return c.name; });
							self.products.sort(function(a, b) {
								var aIndex = categoryOrder.indexOf(a.categoryName);
								var bIndex = categoryOrder.indexOf(b.categoryName);
								if (aIndex === -1 && bIndex === -1) return 0;
								if (aIndex === -1) return 1;
								if (bIndex === -1) return -1;
								return aIndex - bIndex;
							});
							self.syncCart();
						}
					},
					fail: function(e) {
						console.error('加载商品失败:', e);
					},
					complete: function() {
						self.productsLoading = false;
					}
				});
			},
			loadFlashSaleProducts: function() {
				var self = this;
				uni.request({
					url: 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/getFlashSale',
					method: 'POST',
					data: { method: 'getFlashSale', params: {} },
					success: function(saleRes) {
						if (!(saleRes.data && saleRes.data.code === 0 && saleRes.data.data)) {
							self.flashSaleProducts = [];
							return;
						}
						var saleList = Array.isArray(saleRes.data.data) ? saleRes.data.data : [saleRes.data.data];
						var now = Date.now();
						var today0 = new Date(); today0.setHours(0, 0, 0, 0);
						var today0ms = today0.getTime();
						var windowOf = function(s) {
							if ((s.type || 'fixed') === 'daily' && s.dailyStart && s.dailyEnd) {
								var dp = s.dailyStart.split(':'), ep = s.dailyEnd.split(':');
								var sh = Number(dp[0]) || 0, sm = Number(dp[1]) || 0;
								var eh = Number(ep[0]) || 0, em = Number(ep[1]) || 0;
								return {
									start: today0ms + sh * 3600000 + sm * 60000,
									end:   today0ms + eh * 3600000 + em * 60000
								};
							}
							return { start: s.startTime, end: s.endTime };
						};
						var enriched = saleList.map(function(s) { return Object.assign({}, s, windowOf(s)); });
						var activeSale = enriched.find(function(s) { return s.status === true && s.start <= now && s.end > now; })
							|| enriched.find(function(s) { return s.status === true && s.end > now; })
							|| null;
						if (!activeSale) {
							self.flashSaleProducts = [];
							return;
						}
						uni.request({
							url: 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/getFlashSaleProducts',
							method: 'POST',
							data: { method: 'getFlashSaleProducts', params: { flashSaleId: activeSale._id } },
							success: function(productRes) {
								if (productRes.data && productRes.data.code === 0) {
									self.flashSaleProducts = (productRes.data.data || []).map(function(item) {
										var firstSpec = (item.specs && item.specs[0]) ? item.specs[0] : null;
										return {
											id: item._id,
											name: item.name,
											image: item.image || '/static/images/placeholder.png',
											desc: '新鲜直采·产地直发',
											service: '当日下单·次日自提',
										spec: firstSpec ? (firstSpec.name || '') : '',
											originalPrice: '\u00A5' + (item.originalPrice || 0),
											currentPrice: '\u00A5' + (item.flashPrice || 0),
											stock: firstSpec ? (firstSpec.stock || 0) : 0,
											quantity: 0
										};
									});
									self.syncCart();
								} else {
									self.flashSaleProducts = [];
								}
							},
							fail: function() { self.flashSaleProducts = []; }
						});
					},
					fail: function() { self.flashSaleProducts = []; }
				});
			},
			onPromoChange: function(e) {
				this.currentPromo = e.detail.current;
			},
			increase: function(item) {
				if (item.stock !== undefined && item.stock !== null && item.stock <= 0) {
					uni.showToast({ title: '已售罄', icon: 'none' });
					return;
				}
				if (item.quantity + 1 > (item.stock || 0)) {
					uni.showToast({ title: '已达库存上限', icon: 'none' });
					return;
				}
				var price = parseFloat(item.currentPrice.replace(/\u00A5/, ''));
				cartAdd({ id: item.id, product: { name: item.name, price: price, image: item.image, spec: item.spec || item.desc, originalPrice: item.originalPrice }});
				item.quantity++;
				this.updateCart();
			},
			decrease: function(item) {
				if (item.quantity > 0) {
					cartDecrease(item.id);
					item.quantity--;
					this.updateCart();
				}
			},
			updateCart: function() {
				var cart = getLocalCart();
				var summary = calcCartSummary(cart);
				this.selectedCount = summary.count;
				this.selectedTotal = summary.total;
				this.cartCount = summary.count;
			},
			syncCart: function() {
				var cart = getLocalCart();
				this.products.forEach(function(p) {
					var cartItem = null;
					for (var i = 0; i < cart.length; i++) {
						if (cart[i].id === p.id) { cartItem = cart[i]; break; }
					}
					p.quantity = cartItem ? (cartItem.quantity || 0) : 0;
				});
				this.flashSaleProducts.forEach(function(p) {
					var cartItem = null;
					for (var i = 0; i < cart.length; i++) {
						if (cart[i].id === p.id) { cartItem = cart[i]; break; }
					}
					p.quantity = cartItem ? (cartItem.quantity || 0) : 0;
				});
				this.updateCart();
			},
			goCart: function() {
				uni.navigateTo({ url: "/pages/cart/index" });
			},
			goCheckout: function() {
				var cart = getLocalCart();
				if (cart.length === 0) { return; }
				var items = cart.map(function(c) {
					var p = c.product || {};
					return {
						id: c.id,
						name: p.name || "",
						image: p.image || p.coverImage || "",
						spec: (p.specs && p.specs[0] && p.specs[0].name) || "",
						originalPrice: p.originalPrice || "",
						currentPrice: p.price || p.flashPrice || "",
						quantity: c.quantity,
						qty: c.quantity
					};
				});
				uni.setStorageSync("checkoutItems", JSON.stringify(items));
				uni.navigateTo({ url: "/pages/checkout/index" });
			}
		}
	};

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
	box-sizing: border-box;
}

.category-header {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
	padding: 20rpx 0 16rpx;
	border-bottom: 1rpx solid #f0f0f0;
	margin-bottom: 16rpx;
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

.tag-row {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-top: 8rpx;
	flex-wrap: wrap;
}

.product-stock-tag {
	display: inline-flex;
	background-color: #FFF7E8;
	border-radius: 4rpx;
	padding: 2rpx 8rpx;
}

.product-stock-tag text {
	font-size: 18rpx;
	font-weight: 500;
	color: #C77A1E;
}

.product-stock-tag.low {
	background-color: #FFEBE5;
}

.product-stock-tag.low text {
	color: #FF6B35;
}

.product-stock-tag.out {
	background-color: #F0F0F0;
}

.product-stock-tag.out text {
	color: #999999;
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

.btn-plus.disabled {
	background-color: #CCCCCC;
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
