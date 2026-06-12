// 四端统一baseURL
const BASE_URL = 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com'
const CLOUD_OBJECT = '/merchant-api'
const API_BASE = BASE_URL + CLOUD_OBJECT

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

const ORDER_STATUS_TEXT = {
  pending_payment: '待付款',
  paid: '已付款',
  pending_sorting: '待分拣',
  sorting: '分拣中',
  delivering: '配送中',
  ready_for_pickup: '待自提',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
}

const STORAGE_KEYS = {
  TOKEN: 'uni_id_token',
  TOKEN_EXPIRED: 'uni_id_token_expired',
  USER_INFO: 'user_info',
  USER_ID: 'user_id',
  USER_PHONE: 'user_phone',
  CART: 'cart_items',
  ADDRESS_SELECTED: 'selected_address_id'
}

export { BASE_URL, API_BASE, ORDER_STATUS, ORDER_STATUS_TEXT, STORAGE_KEYS }
