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
		<scroll-view
			class="order-list"
			scroll-y="true"
			refresher-enabled="true"
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
			refresher-default-style="none"
			v-if="currentTab === 0"
		>
			<view class="order-card" v-for="order in currentOrders" :key="order._id || order.id" @tap="toggleDetail(order)">
				<!-- 卡片头部 -->
				<view class="order-header">
					<text class="order-id">订单号：{{(order.orderNo || order.shortOrderNo || order.shortId || order.id).slice(-5)}}</text>
					<view class="order-status-tag">
						<text>{{getStepLabel(order)}}</text>
					</view>
				</view>

				<!-- 配送进度条 -->
				<view class="step-progress">
					<view class="step-item" :class="{ active: true, current: getStepIndex(order) === 0 }">
						<view class="iconfont icon-daifukuan" v-if="isPendingStatus(order)"></view>
						<view class="iconfont icon-yixiadan" v-else></view>
						<text class="step-label">{{isPendingStatus(order) ? '待付款' : '已下单'}}</text>
					</view>
					<view class="step-line" :class="{ active: getStepIndex(order) >= 1 }"></view>
					<view class="step-item" :class="{ active: getStepIndex(order) >= 1, current: getStepIndex(order) === 1 }">
						<view class="iconfont icon-fenjian"></view>
						<text class="step-label">分拣中</text>
					</view>
					<view class="step-line" :class="{ active: getStepIndex(order) >= 2 }"></view>
					<view class="step-item" :class="{ active: getStepIndex(order) >= 2, current: getStepIndex(order) === 2 }">
						<view class="iconfont icon-peisong"></view>
						<text class="step-label">配送中</text>
					</view>
					<view class="step-line" :class="{ active: getStepIndex(order) >= 3 }"></view>
					<view class="step-item" :class="{ active: getStepIndex(order) >= 3, current: getStepIndex(order) === 3 }">
						<view class="iconfont icon-yiwancheng"></view>
						<text class="step-label">已完成</text>
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
							<text class="info-label">配送费</text>
							<text class="info-value">{{order.deliveryFee}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">优惠券</text>
							<text class="info-value coupon">{{order.coupon}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">订单号</text>
							<text class="info-value">{{order.orderNo}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">下单时间</text>
							<text class="info-value time">{{order.orderTime}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">收货地址</text>
							<text class="info-value address">{{order.address.phone}} {{order.address.address}}{{order.address.doorNo}}</text>
						</view>
						<view class="info-row" v-if="order.remark">
							<text class="info-label">备注</text>
							<text class="info-value">{{order.remark}}</text>
						</view>
					</view>
				</view>

				<!-- 底部：总价 + 按钮 -->
				<view class="order-footer">
					<text class="total-text">实付 <text class="total-price">¥{{order.total || order.totalAmount}}</text></text>
					<view class="footer-btns" v-if="order.status === '待支付' || order.status === 'pending'">
						<view class="action-btn" @tap="goPay(order)"><text>去付款</text></view>
						<view class="action-btn cancel" @tap="cancelOrder(order)"><text>取消订单</text></view>
					</view>
					<view class="footer-btns" v-else>
						<view class="action-btn cancel" @tap="cancelOrder(order)"><text>取消订单</text></view>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 历史订单列表 -->
		<scroll-view class="order-list" scroll-y="true" v-if="currentTab === 1">
			<view class="order-card" v-for="order in historyOrders" :key="order._id || order.id" @tap="toggleDetail(order)">
				<!-- 卡片头部 -->
				<view class="order-header">
					<view class="order-header-left">
						<text class="order-id">订单号：{{(order.orderNo || order.shortOrderNo || order.shortId || order.id).slice(-5)}}</text>
						<view class="order-status" :class="getHistoryStatusClass(order)">
							<text>{{getHistoryStatusLabel(order)}}</text>
						</view>
					</view>
					<view class="delete-btn" @tap.stop="deleteOrder(order)">
						<view class="iconfont icon-shezhi"></view>
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
						<view class="fee-row">
							<text class="fee-label">支付方式</text>
							<text class="fee-value">{{order.payMethod}}</text>
						</view>
						<view class="fee-row">
							<text class="fee-label">配送费</text>
							<text class="fee-value">{{order.deliveryFee || '¥0.00'}}</text>
						</view>
						<view class="fee-row total-fee-row">
							<text class="fee-label">实付</text>
							<text class="total-price">¥{{order.total || order.totalAmount}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">订单号</text>
							<text class="info-value">{{order.orderNo}}</text>
						</view>
						<view class="info-row">
							<text class="info-label">下单时间</text>
							<text class="info-value time">{{order.orderTime}}</text>
						</view>
						<view class="info-row" v-if="order.deliveryTime">
							<text class="info-label">送达时间</text>
							<text class="info-value time">{{order.deliveryTime}}</text>
						</view>
						<view class="info-row" v-if="order.address">
							<text class="info-label">收货地址</text>
							<text class="info-value address">{{order.address.phone}} {{order.address.address}}{{order.address.doorNo}}</text>
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
			currentOrders: [],
			historyOrders: [],
			userId: 'user_' + (uni.getStorageSync('userId') || Date.now()),
			loading: false,
			refreshing: false,
			isRefreshing: false // 防重标志
		}
	},
	onShow() {
		// 生成用户ID并存储
		if (!uni.getStorageSync('userId')) {
			uni.setStorageSync('userId', this.userId.replace('user_', ''))
		}
		this.syncOrders()
	},
	methods: {
		// 调用云端API
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
		async syncOrders() {
			this.loading = true
			try {
				const res = await this.callAPI('getOrders', { userId: this.userId })
				const list = res.data || []
				console.log('订单列表:', list)
				// 按状态分类（包含 deliveryStatus 判断）
				this.currentOrders = list.filter(o => {
					// 使用 deliveryStatus 判断
					if (['accepted', 'delivering'].includes(o.deliveryStatus)) return true
					// 兼容原有 status
					return ['pending', 'confirmed', 'delivering', '待支付', '已接单', '配送中'].includes(o.status)
				})
				this.historyOrders = list.filter(o => ['completed', 'cancelled', 'refunded', '已完成', '已取消', '已退款'].includes(o.status))
			} catch (e) {
				console.error('获取订单失败:', e)
				// 失败时尝试从本地存储读取
				this.loadLocalOrders()
			}
			this.loading = false
		},
		async onRefresh() {
			// 防重：如果正在刷新中，直接返回
			if (this.isRefreshing) {
				this.refreshing = false
				return
			}
			this.isRefreshing = true
			this.refreshing = true
			await this.syncOrders()
			this.refreshing = false
			// 延迟解除防重，避免快速连续触发
			setTimeout(() => {
				this.isRefreshing = false
			}, 1000)
		},
		loadLocalOrders() {
			try {
				const data = uni.getStorageSync('order_list')
				if (data) {
					const list = JSON.parse(data)
					if (Array.isArray(list) && list.length > 0) {
						this.currentOrders = list.filter(o => o.status === '配送中' || o.status === '待支付' || o.status === 'pending')
						this.historyOrders = list.filter(o => o.status === '已完成' || o.status === '已取消')
					}
				}
			} catch (e) {}
		},
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
		goPay(order) {
			uni.showToast({ title: '去付款功能开发中', icon: 'none' })
		},
		async cancelOrder(order) {
			uni.showModal({
				title: '确认取消',
				content: '确定要取消该订单吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							// 调用云端API取消订单
							await this.callAPI('updateOrderStatus', { id: order._id, status: 'cancelled' })
							uni.showToast({ title: '订单已取消', icon: 'success' })
						} catch (e) {
							console.error('云端取消失败:', e)
						}
						// 更新本地
						order.status = 'cancelled'
						this.syncOrders()
					}
				}
			})
		},
		async afterSale(order) {
			uni.showModal({
				title: '申请售后',
				content: '请输入退款原因',
				editable: true,
				placeholderText: '商品损坏/不想买了等',
				success: async (res) => {
					if (res.confirm) {
						try {
							const reason = res.content || '用户申请退款'
							await this.callAPI('applyRefund', { id: order._id, reason })
							uni.showToast({ title: '退款申请已提交', icon: 'success' })
							this.syncOrders()
						} catch (e) {
							console.error('申请售后失败:', e)
							uni.showToast({ title: '申请失败', icon: 'none' })
						}
					}
				}
			})
		},
		reOrder() {
			uni.showToast({ title: '再来一单功能开发中', icon: 'none' })
		},
		isPendingStatus(order) {
			return ['pending', '待支付'].includes(order.status)
		},
		getStepIndex(order) {
			// 优先使用 deliveryStatus（骑手端配送状态）
			if (order.deliveryStatus === 'accepted') return 1 // 待取货 → 分拣中
			if (order.deliveryStatus === 'delivering') return 2 // 配送中
			if (order.deliveryStatus === 'completed') return 3 // 已完成

			// 兼容原有 status 逻辑
			const map = {
				'pending': 0, '待支付': 0,
				'confirmed': 1, '已接单': 1,
				'delivering': 2, '配送中': 2,
				'completed': 3, '已完成': 3,
				'cancelled': -1, '已取消': -1
			}
			return map[order.status] ?? 0
		},
		getStepLabel(order) {
			// 优先使用 deliveryStatus
			if (order.deliveryStatus === 'accepted') return '分拣中'
			if (order.deliveryStatus === 'delivering') return '配送中'
			if (order.deliveryStatus === 'completed') return '已完成'

			// 兼容原有 status
			const map = {
				'pending': '待付款', '待支付': '待付款',
				'confirmed': '分拣中', '已接单': '分拣中',
				'delivering': '配送中', '配送中': '配送中',
				'completed': '已完成', '已完成': '已完成',
				'cancelled': '已取消', '已取消': '已取消'
			}
			return map[order.status] || '处理中'
		},
		// 判断第一步是否active（待付款或已下单都算）
		isFirstStepActive(order) {
			return true // 第一步永远绿色
		},
		getHistoryStatusLabel(order) {
			const map = {
				'completed': '已完成', '已完成': '已完成',
				'cancelled': '已取消', '已取消': '已取消',
				'refunded': '已退款', '已退款': '已退款'
			}
			return map[order.status] || order.status
		},
		getHistoryStatusClass(order) {
			if (['completed', '已完成'].includes(order.status)) {
				return 'done'
			}
			return 'cancelled'
		},
		deleteOrder(order) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除该订单吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							await this.callAPI('deleteOrder', { id: order._id })
						} catch (e) {
							console.error('删除失败:', e)
						}
						this.syncOrders()
						uni.showToast({ title: '已删除', icon: 'success' })
					}
				}
			})
		}
	}
}
</script>

<style>
.page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	width: 100%;
	background-color: #FFFFFF;
	overflow-x: hidden;
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
	font-size: 26rpx;
	font-weight: 400;
	color: #666666;
}

.tab-item.active text {
	font-weight: 600;
	color: #4F9A42;
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
	box-sizing: border-box;
	width: 100%;
	overflow-x: hidden;
}

/* 订单卡片 */
.order-card {
	background-color: #FFFFFF;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	border: 1rpx solid #F0F0F0;
	box-sizing: border-box;
	overflow: hidden;
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

.order-status.cancelled {
	background-color: #F5F5F5;
}

.order-status.cancelled text {
	font-size: 24rpx;
	font-weight: 600;
	color: #999;
}

.delete-btn {
	width: 44rpx;
	height: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.delete-btn .iconfont {
	font-size: 40rpx;
	color: #999;
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
	font-size: 26rpx;
	font-weight: 600;
	color: #333333;
}

.product-spec {
	font-size: 20rpx;
	font-weight: 400;
	color: #666666;
	margin-top: 4rpx;
}

.product-price-wrap {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
	margin-left: 12rpx;
	min-width: 100rpx;
}

.product-original {
	font-size: 22rpx;
	font-weight: 400;
	color: #999999;
	text-decoration: line-through;
}

.product-price {
	font-size: 28rpx;
	font-weight: 700;
	color: #4F9A42;
	margin-top: 4rpx;
}

.product-qty {
	font-size: 20rpx;
	font-weight: 400;
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
	font-size: 22rpx;
	color: #999999;
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

.action-btn.cancel {
	background-color: #FFFFFF;
	border: 2rpx solid #999;
}
.action-btn.cancel text {
	color: #666;
}
.footer-btns {
	display: flex;
	gap: 16rpx;
}

/* 步骤进度条 */
.step-progress {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24rpx 16rpx;
	margin-top: 16rpx;
}

.step-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 80rpx;
}

.step-item .iconfont {
	font-size: 80rpx;
}

.step-item.active .iconfont {
	color: #528A59;
}

.step-item:not(.active) .iconfont {
	color: #BEBDBE;
}

.step-item.current .iconfont {
	text-shadow: 0 0 8rpx rgba(82, 138, 89, 0.4);
}

.step-label {
	font-size: 20rpx;
	margin-top: 8rpx;
}

.step-item.active .step-label {
	color: #333;
}

.step-item:not(.active) .step-label {
	color: #BEBDBE;
}

.step-line {
	flex: 1;
	height: 4rpx;
	background: #BEBDBE;
	margin: 0 4rpx;
	margin-bottom: 30rpx;
	min-width: 20rpx;
}

.step-line.active {
	background: #528A59;
}

/* 状态标签 */
.order-status-tag {
	background: #528A59;
	color: #fff;
	font-size: 22rpx;
	padding: 6rpx 20rpx;
	border-radius: 24rpx;
}

.order-status-tag text {
	font-size: 22rpx;
	font-weight: 600;
}

/* 自定义下拉刷新样式 */
.order-list ::v-deep .uni-scroll-refresher {
	background: transparent !important;
}

.order-list ::v-deep . refresher-inner {
	color: #4F9A42;
}
</style>