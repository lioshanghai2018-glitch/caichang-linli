<template>
  <view class="page">
    <view class="header">
      <text class="title">轮播图管理</text>
      <view class="add-btn" @tap="goAdd">
        <text>+ 添加</text>
      </view>
    </view>

    <scroll-view class="list" scroll-y>
      <view class="banner-card" v-for="(item, idx) in bannerList" :key="idx">
        <image class="banner-image" :src="item.image" mode="aspectFill"></image>
        <view class="banner-info">
          <text class="banner-title">{{item.title || '未命名'}}</text>
          <text class="banner-sort">排序：{{item.sort || 0}}</text>
          <text class="banner-status" :class="item.active !== false ? 'active' : 'inactive'">
            {{item.active !== false ? '已启用' : '已禁用'}}
          </text>
        </view>
        <view class="banner-actions">
          <view class="action-btn" @tap="toggleActive(item)">
            <text>{{item.active !== false ? '禁用' : '启用'}}</text>
          </view>
          <view class="action-btn danger" @tap="deleteBanner(item)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <view class="empty" v-if="bannerList.length === 0 && !loading">
        <text>暂无轮播图，点击右上角添加</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { API_BASE, STORAGE_KEYS } from '@/utils/config.js'

export default {
  data() {
    return {
      bannerList: [],
      loading: false
    }
  },
  onLoad() {
    this.loadBanners()
  },
  onShow() {
    this.loadBanners()
  },
  methods: {
    async loadBanners() {
      this.loading = true
      try {
        const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
        const res = await uni.request({
          url: API_BASE + '/getBanners',
          method: 'POST',
          header: { 'Authorization': 'Bearer ' + token },
          data: { method: 'getBanners', params: { all: true } }
        })
        if (res.data && res.data.code === 0) {
          this.bannerList = res.data.data || []
        }
      } catch (e) {
        console.error('加载轮播图失败:', e)
      }
      this.loading = false
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/banner/add' })
    },
    async toggleActive(item) {
      try {
        const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
        const res = await uni.request({
          url: API_BASE + '/updateBanner',
          method: 'POST',
          header: { 'Authorization': 'Bearer ' + token },
          data: { method: 'updateBanner', params: { id: item._id, active: item.active === false ? true : false } }
        })
        if (res.data && res.data.code === 0) {
          uni.showToast({ title: '操作成功', icon: 'success' })
          this.loadBanners()
        }
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    async deleteBanner(item) {
      const [err, res] = await uni.showModal({
        title: '确认删除',
        content: '删除后不可恢复，确定吗？'
      })
      if (!res || !res.confirm) return
      try {
        const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
        const result = await uni.request({
          url: API_BASE + '/deleteBanner',
          method: 'POST',
          header: { 'Authorization': 'Bearer ' + token },
          data: { method: 'deleteBanner', params: { id: item._id } }
        })
        if (result.data && result.data.code === 0) {
          uni.showToast({ title: '已删除', icon: 'success' })
          this.loadBanners()
        }
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #F5F1EB; }

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #FFFFFF;
}

.title { font-size: 32rpx; font-weight: 600; color: #333; }

.add-btn {
  background-color: #4CAF50;
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 600;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
}

.list { padding: 20rpx; height: calc(100vh - 100rpx); }

.banner-card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}

.banner-image {
  width: 160rpx;
  height: 100rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background-color: #F5F5F5;
}

.banner-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}

.banner-title { font-size: 28rpx; color: #333; font-weight: 500; }
.banner-sort { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.banner-status { font-size: 22rpx; margin-top: 4rpx; }
.banner-status.active { color: #4CAF50; }
.banner-status.inactive { color: #FF6B00; }

.banner-actions { display: flex; flex-direction: column; gap: 8rpx; margin-left: 16rpx; }

.action-btn {
  background-color: #F5F5F5;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #333;
}

.action-btn.danger { color: #FF3333; background-color: #FFF0F0; }

.empty { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
</style>
