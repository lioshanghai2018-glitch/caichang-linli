<script>
	import { isLoggedIn } from './utils/auth.js'
	import { initPush, onPushMessage } from './utils/push.js'

	const WHITE_LIST = ['pages/login/index', 'pages/index/index', 'pages/category/index', 'pages/product/list']

	export default {
		onLaunch: function() {
			console.log('App Launch')
			initPush()
			onPushMessage(() => {})
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
@import '/static/css/iconfont.css';

/*每个页面公共css */
page {
    background-color: #F5F1EB;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
}
</style>