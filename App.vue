<script>
import { isLoggedIn } from './utils/auth.js'
import { initPush, onPushMessage } from './utils/push.js'

// 不需要登录的页面白名单
const WHITE_LIST = [
  'pages/login/index'
]

export default {
  onLaunch: function() {
    console.log('App Launch')
    // 注册推送
    initPush().then(clientId => {
      if (clientId) console.log('Push clientId:', clientId)
    })
    // 监听推送消息
    onPushMessage((res) => {
      console.log('收到推送:', res)
      // 跳转到对应页面
      if (res && res.payload && res.payload.page) {
        uni.reLaunch({ url: res.payload.page })
      }
    })
  },
  onShow: function() {
    console.log('App Show')
    const pages = getCurrentPages()
    if (!pages.length) return
    const current = pages[pages.length - 1]
    const path = current.route || current.$page?.fullPath || ''
    const isWhite = WHITE_LIST.some(p => path.includes(p))
    if (!isLoggedIn() && !isWhite) {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
@import './static/css/iconfont.css';

page {
  background-color: #F5F1EB;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>