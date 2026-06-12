// 四端统一baseURL
const BASE_URL = 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com'
const CLOUD_OBJECT = '/merchant-api'
const API_BASE = BASE_URL + CLOUD_OBJECT

const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment', PAID: 'paid', PENDING_SORTING: 'pending_sorting',
  SORTING: 'sorting', DELIVERING: 'delivering', COMPLETED: 'completed',
  CANCELLED: 'cancelled', REFUNDING: 'refunding', REFUNDED: 'refunded'
}
const DELIVERY_STATUS = { ACCEPTED: 'accepted', PICKED_UP: 'picked_up', DELIVERING: 'delivering', COMPLETED: 'completed' }
const RIDER_STATUS = { OFFLINE: 'offline', IDLE: 'idle', DELIVERING: 'delivering' }

const ORDER_STATUS_TEXT = {
  pending_payment: '待付款', paid: '已付款', pending_sorting: '待分拣', sorting: '分拣中',
  delivering: '配送中', completed: '已完成', cancelled: '已取消', refunding: '退款中', refunded: '已退款'
}
const DELIVERY_STATUS_TEXT = { accepted: '已接单', picked_up: '已取货', delivering: '配送中', completed: '已送达' }
const RIDER_STATUS_TEXT = { offline: '离线', idle: '空闲', delivering: '配送中' }

const POLL_INTERVAL = { ORDER_DETAIL: 8000, RIDER_TASK: 5000, RIDER_DASHBOARD: 8000 }
const STORAGE_KEYS = {
  TOKEN: 'uni_id_token', TOKEN_EXPIRED: 'uni_id_token_expired',
  RIDER_ID: 'rider_id', RIDER_INFO: 'rider_info', USER_ID: 'user_id'
}

export { BASE_URL, CLOUD_OBJECT, API_BASE, ORDER_STATUS, DELIVERY_STATUS, RIDER_STATUS, ORDER_STATUS_TEXT, DELIVERY_STATUS_TEXT, RIDER_STATUS_TEXT, POLL_INTERVAL, STORAGE_KEYS }
