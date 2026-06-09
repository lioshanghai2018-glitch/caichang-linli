// 4端统一 baseURL（基线云对象已在阿里云部署）
// 不要在此文件硬编码业务参数（如 merchantId），必须从登录态注入
const BASE_URL = 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com'

// 云对象入口
const CLOUD_OBJECT = '/merchant-api'

// 接口完整 URL
const API_BASE = BASE_URL + CLOUD_OBJECT

// 状态枚举（订单）
const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PENDING_SORTING: 'pending_sorting',
  SORTING: 'sorting',
  DELIVERING: 'delivering',
  READY_FOR_PICKUP: 'ready_for_pickup',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded'
}

// 状态枚举（商品）
const PRODUCT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SOLD_OUT: 'sold_out'
}

// 状态枚举（骑手）
const RIDER_STATUS = {
  OFFLINE: 'offline',
  IDLE: 'idle',
  DELIVERING: 'delivering'
}

// 状态枚举（帖子）
const POST_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  DELETED: 'deleted'
}

// 状态枚举（认证）
const CERT_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  CERTIFIED: 'certified',
  REJECTED: 'rejected'
}

// 状态文案映射（前端展示用）
const ORDER_STATUS_TEXT = {
  pending_payment: '待付款',
  paid: '已付款',
  pending_sorting: '待分拣',
  sorting: '待配送',
  delivering: '配送中',
  ready_for_pickup: '待自提',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
}

const PRODUCT_STATUS_TEXT = {
  online: '在售',
  offline: '已下架',
  sold_out: '已售罄'
}

const RIDER_STATUS_TEXT = {
  offline: '离线',
  idle: '空闲',
  delivering: '配送中'
}

const POST_STATUS_TEXT = {
  active: '正常',
  closed: '已关闭',
  deleted: '已删除'
}

const CERT_STATUS_TEXT = {
  none: '未认证',
  pending: '审核中',
  certified: '已认证',
  rejected: '已拒绝'
}

// 轮询间隔（毫秒）
const POLL_INTERVAL = {
  ORDER_DETAIL: 8000,
  RIDER_TASK: 5000,
  MERCHANT_DASHBOARD: 8000
}

// token storage key
const STORAGE_KEYS = {
  TOKEN: 'uni_id_token',
  TOKEN_EXPIRED: 'uni_id_token_expired',
  USER_INFO: 'user_info',
  MERCHANT_ID: 'merchant_id',
  RIDER_ID: 'rider_id',
  USER_ID: 'user_id'
}

export {
  BASE_URL,
  CLOUD_OBJECT,
  API_BASE,
  ORDER_STATUS,
  PRODUCT_STATUS,
  RIDER_STATUS,
  POST_STATUS,
  CERT_STATUS,
  ORDER_STATUS_TEXT,
  PRODUCT_STATUS_TEXT,
  RIDER_STATUS_TEXT,
  POST_STATUS_TEXT,
  CERT_STATUS_TEXT,
  POLL_INTERVAL,
  STORAGE_KEYS
}
