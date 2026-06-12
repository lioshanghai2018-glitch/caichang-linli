<template>
	<view class="page">
		<!-- 未登录：全页 CTA -->
		<view v-if="!isLogin" class="login-cta">
			<text class="login-icon">🔒</text>
			<text class="login-title">查看订单需要登录</text>
			<text class="login-sub">订单信息包含收货地址、电话等隐私</text>
			<view class="login-btn" @tap="goLogin"><text>微信一键登录</text></view>
		</view>
		<block v-else>
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

		<!-- 历史订单计数（仅在历史 tab 且有订单时显示） -->
		<view class="history-toolbar" v-if="currentTab === 1 && historyOrders.length > 0">
			<text class="history-count">共 {{ historyOrders.length }} 单</text>
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
					<view class="order-id-wrap">
						<text class="order-id" @tap.stop="copyOrderNo(order.id || order.orderNo)">订单号：{{getOrderIdTail(order)}}</text>
						<text v-if="order.status === 'refunding'" class="refund-pending-label">商家审核中</text>
					</view>
					<view class="order-status-tag">
						<text>{{getStepLabel(order)}}</text>
					</view>
				</view>

				<!-- 配送/自提进度条（自提单第 3 步显示"待自提"） -->
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
						<view class="iconfont" :class="isSelfPickup(order) ? 'icon-dingwei' : 'icon-peisong'"></view>
						<text class="step-label">{{isSelfPickup(order) ? '待自提' : '配送中'}}</text>
					</view>
					<view class="step-line" :class="{ active: getStepIndex(order) >= 3 }"></view>
					<view class="step-item" :class="{ active: getStepIndex(order) >= 3, current: getStepIndex(order) === 3 }">
						<view class="iconfont icon-yiwancheng"></view>
						<text class="step-label">已完成</text>
					</view>
				</view>

				<!-- 商品列表 -->
				<view class="product-row" v-for="(product, pIdx) in (order.items || order.products || [])" :key="pIdx">
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
					<view class="product-summary">
						<text class="summary-text">共 {{ totalQtyOf(order) }} 件商品</text>
					</view>
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
							<text class="info-value">{{order.orderNo || order.id}}</text>
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
					<view class="footer-btns" v-if="isPendingStatus(order)">
						<view class="action-btn" @tap="goPay(order)"><text>去付款</text></view>
						<view class="action-btn cancel" @tap="cancelOrder(order)"><text>取消订单</text></view>
					</view>
					<view class="footer-btns" v-else>
						<view v-if="isReadyForPickup(order)"
							class="action-btn primary" @tap="confirmPickup(order)"><text>我已自提</text></view>
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
						<text class="order-id" @tap.stop="copyOrderNo(order.id || order.orderNo)">订单号：{{getOrderIdTail(order)}}</text>
						<view class="order-status" :class="getHistoryStatusClass(order)">
							<text>{{getHistoryStatusLabel(order)}}</text>
						</view>
					</view>
					<view class="delete-btn" @tap.stop="deleteOrder(order)">
						<view class="iconfont icon-shezhi"></view>
					</view>
				</view>

				<!-- 商品列表 -->
				<view class="product-row" v-for="(product, pIdx) in (order.items || order.products || [])" :key="pIdx">
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
					<view class="product-summary">
						<text class="summary-text">共 {{ totalQtyOf(order) }} 件商品</text>
					</view>
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
							<text class="info-value">{{order.orderNo || order.id}}</text>
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

				<!-- 商家拒绝原因 -->
				<view class="refund-reject-reason" v-if="order.refundStatus === 'rejected' && order.rejectReason">
					<text class="reject-reason-label">拒绝原因：</text>
					<text class="reject-reason-text">{{order.rejectReason}}</text>
				</view>

				<!-- 底部：售后提示 + 按钮 -->
				<view class="order-footer">
					<text class="service-tip-text">{{ isRefundLocked(order) ? '退款问题请联系客服' : '如有售后服务请联系门店' }}</text>
					<view class="footer-btns">
						<view v-if="isRefundLocked(order)" class="btn-outline" @tap.stop="contactService">
							<text>联系客服</text>
						</view>
						<view v-else class="btn-outline" @tap.stop="afterSale(order)">
							<text>申请售后</text>
						</view>
						<view class="btn-solid" @tap.stop="reOrder(order)">
							<text>再来一单</text>
						</view>
					</view>
					</view>
			</view>
		</scroll-view>
		<custom-tabbar :current="2" />
		</block>
	</view>
</template>

<script>
import { ORDER_STATUS, ORDER_STATUS_TEXT, STORAGE_KEYS } from '@/utils/config.js'
import { requireLogin, isLoggedIn } from '@/utils/auth.js'

// 旧数据兼容：把历史写入的中文/旧英文 status 归一为新枚举
const LEGACY_TO_CANONICAL = {
  'pending': ORDER_STATUS.PENDING_PAYMENT,
  '待支付': ORDER_STATUS.PENDING_PAYMENT,
  'confirmed': ORDER_STATUS.PAID,
  '已接单': ORDER_STATUS.PAID,
  'sorting': ORDER_STATUS.SORTING,
  '配送中': ORDER_STATUS.DELIVERING,
  '已完成': ORDER_STATUS.COMPLETED,
  '已取消': ORDER_STATUS.CANCELLED,
  '已退款': ORDER_STATUS.REFUNDED
}

// 进行中：配送中(未完成)的订单
const ACTIVE_STATUSES = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.PENDING_SORTING,
  ORDER_STATUS.SORTING,
  ORDER_STATUS.READY_FOR_PICKUP,
  ORDER_STATUS.DELIVERING,
  'pending', 'confirmed', '待支付', '已接单', '配送中'
]

// 已结束:已完成 / 退款中 / 已退款 / 已取消
const HISTORY_STATUSES = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDING,
  ORDER_STATUS.REFUNDED,
  '已完成', '已取消', '已退款', '退款中'
]

// deliveryStatus 进行中子集
const ACTIVE_DELIVERY = ['accepted', 'picked_up', 'delivering']

export default {
	data() {
		return {
			currentTab: 0,
			currentOrders: [],
			historyOrders: [],
			userId: 'user_' + (uni.getStorageSync('userId') || Date.now()),
			loading: false,
			refreshing: false,
			isRefreshing: false, // 防重标志
			isLogin: false // 订单页强制登录
		}
	},
	onShow() {
		this.isLogin = isLoggedIn()
		// 生成用户ID并存储
		if (!uni.getStorageSync('userId')) {
			uni.setStorageSync('userId', this.userId.replace('user_', ''))
		}
		// 一次性迁移：从老本地订单里取一次 phone（仅升级期有效）
		if (!uni.getStorageSync(STORAGE_KEYS.USER_PHONE)) {
			const legacy = uni.getStorageSync('order_list')
			if (legacy) {
				try {
					const list = JSON.parse(legacy)
					const phone = list && list[0] && list[0].address && list[0].address.phone
					if (phone) uni.setStorageSync(STORAGE_KEYS.USER_PHONE, phone)
				} catch (e) {}
			}
		}
		this.loadFromCloud()
		this.startPolling()
	},
	onHide() {
		// 切到其他 tab 时暂停轮询，省电
		this.stopPolling()
	},
	onUnload() {
		this.stopPolling()
	},
	methods: {
		// 模板和方法都要用，必须挂在实例上（不能放文件作用域）
		toCanonical(s) {
			if (!s) return s
			return LEGACY_TO_CANONICAL[s] || s
		},
		startPolling() {
			this.stopPolling()
			this._pollTimer = setInterval(() => this.loadFromCloud(), 8000)
		},
		stopPolling() {
			if (this._pollTimer) {
				clearInterval(this._pollTimer)
				this._pollTimer = null
			}
		},
		// 纯云端拉取：所有订单状态/列表都以云端为唯一权威
		async loadFromCloud() {
			this.loading = true
			try {
				const userPhone = uni.getStorageSync(STORAGE_KEYS.USER_PHONE) || ''
				if (!userPhone) {
					// 首次访问（未下过单），空列表
					this.currentOrders = []
					this.historyOrders = []
					this.loading = false
					return
				}
				const res = await this.callAPI('getOrders', { userPhone })
				const list = (res.data || []).map(o => this.normalizeOrder(o))
				this.currentOrders = list.filter(o =>
					ACTIVE_DELIVERY.includes(o.deliveryStatus) ||
					ACTIVE_STATUSES.includes(this.toCanonical(o.status))
				)
				this.historyOrders = list.filter(o =>
					HISTORY_STATUSES.includes(this.toCanonical(o.status))
				)
			} catch (e) {
				console.error('获取订单失败:', e)
				uni.showToast({ title: '加载失败，下拉重试', icon: 'none' })
				this.currentOrders = []
				this.historyOrders = []
			}
			this.loading = false
		},
		// 归一云端订单为模板需要的字段
		normalizeOrder(o) {
			return {
				orderNo: o.orderNo,
				shortOrderNo: o.shortOrderNo,
				_id: o._id,
				id: o._id,
				status: o.status,
				refundStatus: o.refundStatus,
				rejectReason: o.rejectReason,
				deliveryStatus: o.deliveryStatus,
				deliveryType: o.deliveryType || 'self',
				items: (o.items || []).map(it => ({
					name: it.name || it.productName,
					spec: it.spec,
					qty: it.qty || it.quantity || 1,
					price: Number(it.price || 0).toFixed(2),
					image: it.image || it.coverImage
				})),
				address: o.address || {},
				remark: o.remark,
				totalAmount: o.totalAmount,
				payAmount: o.payAmount,
				deliveryFee: o.deliveryFee,
				deliveryTime: o.deliveryTime,
				orderTime: o.orderTime,
				payMethod: o.payMethod,
				createdAt: o.createdAt
			}
		},
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
		// 业务唯一键：orderNo 优先（用户自定义稳定），id/_id 兜底
		orderKey(o) {
			if (!o) return ''
			return o.orderNo || o.id || o._id || ''
		},
		async onRefresh() {
			// 防重：如果正在刷新中，直接返回
			if (this.isRefreshing) {
				this.refreshing = false
				return
			}
			this.isRefreshing = true
			this.refreshing = true
			await this.loadFromCloud()
			this.refreshing = false
			// 延迟解除防重，避免快速连续触发
			setTimeout(() => {
				this.isRefreshing = false
			}, 1000)
		},
		switchTab(index) {
			this.currentTab = index
		},
		toggleDetail(order) {
			order.expanded = !order.expanded
		},
		// 订单商品总件数:items 数组 qty 求和(不是 SKU 数)
		// 老数据 / 不同写入路径可能只有 products 数组,两个都兜底
		totalQtyOf(order) {
			const list = (order && (order.items || order.products)) || []
			return list.reduce((s, it) => s + (Number(it && it.qty) || 0), 0)
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
		getOrderIdTail(order) {
			const id = order.orderNo || order.shortOrderNo || order.shortId || order.id || order._id || ''
			return String(id).slice(-5) || '-----'
		},
		async cancelOrder(order) {
			if (!await requireLogin()) return
			// 自提单：已分拣 / 待自提阶段，商家已备货，不能直接 cancel，要走退款申请
			const isSelf = this.isSelfPickup(order)
			const s = this.toCanonical(order.status)
			const advanced = s === ORDER_STATUS.SORTING || s === ORDER_STATUS.READY_FOR_PICKUP
			if (isSelf && advanced) {
				return this.afterSale(order)
			}
			uni.showModal({
				title: '确认取消',
				content: '确定要取消该订单吗？',
				success: async (res) => {
					if (res.confirm) {
						const orderId = this.orderKey(order)
						if (!orderId) {
							uni.showToast({ title: '订单号缺失', icon: 'none' })
							return
						}
						try {
							await this.callAPI('updateOrderStatus', { orderNo: orderId, status: 'cancelled' })
							uni.showToast({ title: '订单已取消', icon: 'success' })
							this.loadFromCloud()
						} catch (e) {
							uni.showToast({ title: e.msg || '取消失败', icon: 'none' })
						}
					}
				}
			})
		},
		async afterSale(order) {
			if (!await requireLogin()) return
			const orderId = this.orderKey(order)
			if (!orderId) {
				return uni.showToast({ title: '订单号缺失', icon: 'none' })
			}
			// 把整单塞 storage,新页 onLoad 直接拿,避免再调一次 getOrderDetail
			uni.setStorageSync('refundTargetOrder', order)
			uni.navigateTo({ url: `/pages/refund/apply?orderId=${orderId}` })
		},
		reOrder(order) {
			if (!order || !order.items || order.items.length === 0) {
				uni.showToast({ title: '该订单无可购商品', icon: 'none' })
				return
			}
			// 映射成结算页期望的字段(参考 pages/checkout/index.vue:200-213)
			const checkoutItems = order.items.map(it => ({
				productId: it.productId || it.id || null,
				id: it.id || it.productId || null,
				name: it.name || '未知商品',
				spec: it.spec || '',
				image: it.image || '',
				originalPrice: it.price || '0',
				currentPrice: it.price || '0',
				quantity: Number(it.qty) || 1,
				selected: true
			}))
			uni.setStorageSync('checkoutItems', JSON.stringify(checkoutItems))
			uni.showToast({ title: '已加入结算', icon: 'success' })
			// 等 toast 出现再跳,避免被 navigate 立刻打断看不到
			setTimeout(() => {
				uni.navigateTo({ url: '/pages/checkout/index' })
			}, 300)
		},
		isPendingStatus(order) {
			return this.toCanonical(order.status) === ORDER_STATUS.PENDING_PAYMENT
		},
		// 退款锁定:refunding(审核中) / refunded(已退款) 都不能再申请售后,只能联系客服
		isRefundLocked(order) {
			const s = order && order.status
			return s === 'refunding' || s === 'refunded' || (order && order.refundStatus === 'rejected')
		},
		contactService() {
			uni.navigateTo({ url: '/pages/service/index' })
		},
		getStepIndex(order) {
			const s = this.toCanonical(order.status)
			// 自提单专用映射：已下单(0)→分拣中(1)→待自提(2)→已完成(3)
			if (this.isSelfPickup(order)) {
				const selfMap = {
					[ORDER_STATUS.PAID]: 0,
					[ORDER_STATUS.PENDING_SORTING]: 0,
					[ORDER_STATUS.SORTING]: 1,
					[ORDER_STATUS.READY_FOR_PICKUP]: 2,
					[ORDER_STATUS.COMPLETED]: 3,
					[ORDER_STATUS.CANCELLED]: -1,
					[ORDER_STATUS.REFUNDED]: -1
				}
				return selfMap[s] ?? 0
			}
			// 配送单：原 deliveryStatus 优先
			if (order.deliveryStatus === 'accepted' || order.deliveryStatus === 'picked_up') return 1
			if (order.deliveryStatus === 'delivering') return 2
			if (order.deliveryStatus === 'completed') return 3

			const map = {
				[ORDER_STATUS.PENDING_PAYMENT]: 0,
				[ORDER_STATUS.PAID]: 1,
				[ORDER_STATUS.PENDING_SORTING]: 1,
				[ORDER_STATUS.SORTING]: 1,
				[ORDER_STATUS.DELIVERING]: 2,
				[ORDER_STATUS.COMPLETED]: 3,
				[ORDER_STATUS.CANCELLED]: -1,
				[ORDER_STATUS.REFUNDED]: -1
			}
			return map[s] ?? 0
		},
		getStepLabel(order) {
			if (order.deliveryStatus === 'accepted' || order.deliveryStatus === 'picked_up') return '分拣中'
			if (order.deliveryStatus === 'delivering') return ORDER_STATUS_TEXT.delivering
			if (order.deliveryStatus === 'completed') return ORDER_STATUS_TEXT.completed
			return ORDER_STATUS_TEXT[this.toCanonical(order.status)] || '处理中'
		},
		isSelfPickup(order) {
			return order && order.deliveryType === 'self'
		},
		goLogin() {
			uni.navigateTo({ url: '/pages/login/index' })
		},
		async confirmPickup(order) {
			if (!await requireLogin()) return
			const orderId = this.orderKey(order)
			if (!orderId) {
				uni.showToast({ title: '订单号缺失', icon: 'none' })
				return
			}
			try {
				await this.callAPI('updateOrderStatus', { orderNo: orderId, status: ORDER_STATUS.COMPLETED })
				uni.showToast({ title: '感谢您的自提', icon: 'success' })
				this.loadFromCloud()
			} catch (e) {
				console.error('确认自提失败:', e)
				uni.showToast({ title: '操作失败，请重试', icon: 'none' })
			}
		},
		isFirstStepActive(order) {
			return true
		},
		// 模板里用：自提单 + 已到待自提阶段
		isReadyForPickup(order) {
			return this.isSelfPickup(order) && this.toCanonical(order.status) === ORDER_STATUS.READY_FOR_PICKUP
		},
		getHistoryStatusLabel(order) {
			if (order.refundStatus === 'rejected') return '商家已拒绝'
				return ORDER_STATUS_TEXT[this.toCanonical(order.status)] || order.status
		},
		getHistoryStatusClass(order) {
			if (order.refundStatus === 'rejected') return 'refund-rejected'
				if (this.toCanonical(order.status) === ORDER_STATUS.COMPLETED) return 'done'
			return 'cancelled'
		},
		deleteOrder(order) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除该订单吗？',
				success: async (res) => {
					if (res.confirm) {
						const orderId = this.orderKey(order)
						if (!orderId) {
							uni.showToast({ title: '订单号缺失', icon: 'none' })
							return
						}
						try {
							await this.callAPI('deleteOrder', { orderNo: orderId })
							uni.showToast({ title: '已删除', icon: 'success' })
							this.loadFromCloud()
						} catch (e) {
							uni.showToast({ title: e.msg || '删除失败', icon: 'none' })
						}
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

/* 历史订单工具栏 */
.history-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16rpx 24rpx;
	background-color: #FFFFFF;
	border-bottom: 1rpx solid #F0F0F0;
}

.history-count {
	font-size: 24rpx;
	color: #999999;
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
	padding: 20rpx 24rpx 140rpx;
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

.order-id-wrap {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
}
.refund-pending-label {
	font-size: 22rpx;
	color: #999999;
	margin-left: 12rpx;
	flex-shrink: 0;
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

.order-status.refund-rejected {
	background-color: #FFEEEE;
}

.order-status.refund-rejected text {
	font-size: 24rpx;
	font-weight: 600;
	color: #E63946;
}

/* 商家拒绝原因 */
.refund-reject-reason {
	display: flex;
	align-items: flex-start;
	background: #FFF8F6;
	border-radius: 8rpx;
	padding: 16rpx 20rpx;
	margin-top: 16rpx;
	border-left: 4rpx solid #E63946;
}

.reject-reason-label {
	font-size: 24rpx;
	color: #E63946;
	font-weight: 600;
	flex-shrink: 0;
}

.reject-reason-text {
	font-size: 24rpx;
	color: #666;
	line-height: 1.5;
	flex: 1;
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

/* 商品件数摘要(展开区顶部) */
.product-summary {
	padding: 8rpx 0 16rpx;
	border-bottom: 1rpx solid #F0F0F0;
	margin-bottom: 16rpx;
}
.summary-text {
	font-size: 26rpx;
	font-weight: 600;
	color: #4F9A42;
	text-align: right;
	display: block;
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
.login-cta {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 200rpx 60rpx 60rpx;
}
.login-cta .login-icon {
	font-size: 100rpx;
	margin-bottom: 30rpx;
}
.login-cta .login-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #2D5A27;
	margin-bottom: 12rpx;
}
.login-cta .login-sub {
	font-size: 26rpx;
	color: #888;
	margin-bottom: 60rpx;
}
.login-cta .login-btn {
	width: 80%;
	height: 92rpx;
	background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
	color: #fff;
	border-radius: 46rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	font-weight: 600;
}
.login-cta .login-btn text { color: #fff; }
</style>