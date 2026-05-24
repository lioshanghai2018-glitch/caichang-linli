<template>
	<view class="custom-tabbar">
		<view
			class="tabbar-item"
			v-for="(item, index) in tabList"
			:key="index"
			@tap="switchTab(index)"
		>
			<view class="iconfont" :class="item.icon" :style="{ color: current === index ? selectedColor : color }"></view>
			<text class="tabbar-text" :style="{ color: current === index ? selectedColor : color }">{{item.text}}</text>
		</view>
	</view>
</template>

<script>
	export default {
		props: {
			current: {
				type: Number,
				default: 0
			}
		},
		data() {
			return {
				color: '#666666',
				selectedColor: '#4f9a42',
				tabList: [
					{ text: '首页', pagePath: '/pages/index/index', icon: 'icon-shouye' },
					{ text: '分类', pagePath: '/pages/category/index', icon: 'icon-fenlei' },
					{ text: '订单', pagePath: '/pages/order/index', icon: 'icon-dingdan' },
					{ text: '我的', pagePath: '/pages/mine/index', icon: 'icon-wode' }
				]
			}
		},
		methods: {
			switchTab(index) {
				if (this.current === index) return
				const url = this.tabList[index].pagePath
				uni.switchTab({ url })
			}
		}
	}
</script>

<style>
.custom-tabbar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 100rpx;
	background-color: #FFFFFF;
	display: flex;
	border-top: 1rpx solid #E0E0E0;
	z-index: 999;
}

.tabbar-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.iconfont {
	font-size: 40rpx;
}

.tabbar-text {
	font-size: 22rpx;
	margin-top: 4rpx;
}
</style>