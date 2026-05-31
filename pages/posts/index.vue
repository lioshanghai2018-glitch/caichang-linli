<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">帖子管理</text>
      <view class="right-btn" @tap="refresh">
        <text>刷新</text>
      </view>
    </view>

    <!-- 筛选 -->
    <view class="filter-bar">
      <view class="filter-tabs">
        <view class="filter-item" :class="{ active: filterStatus === '' }" @tap="switchStatus('')">
          <text>全部</text>
        </view>
        <view class="filter-item" :class="{ active: filterStatus === '1' }" @tap="switchStatus('1')">
          <text>上架</text>
        </view>
        <view class="filter-item" :class="{ active: filterStatus === '0' }" @tap="switchStatus('0')">
          <text>下架</text>
        </view>
      </view>
      <view class="search-row">
        <input class="search-input" v-model="keyword" placeholder="搜索标题" @confirm="loadPosts" />
        <view class="search-btn" @tap="loadPosts">
          <text>搜索</text>
        </view>
      </view>
    </view>

    <scroll-view class="scroll-list" scroll-y="true">
      <view class="post-card" v-for="post in posts" :key="post._id || post.id">
        <view class="post-header">
          <text class="post-title">{{ post.title }}</text>
          <text class="post-status" :class="post.status === 1 ? 'online' : 'offline'">
            {{ post.status === 1 ? '上架' : '下架' }}
          </text>
        </view>
        <view class="post-meta">
          <text>发布者: {{ post.authorName }}</text>
          <text>{{ post.categoryName }}</text>
          <text v-if="post.price">¥{{ post.price }}</text>
        </view>
        <view class="post-stats">
          <text>点赞 {{ post.likes || 0 }}</text>
          <text>评论 {{ post.comments || 0 }}</text>
          <text>{{ formatTime(post.createdAt) }}</text>
        </view>
        <view class="post-actions">
          <view class="action-btn" @tap="toggleStatus(post)">
            <text>{{ post.status === 1 ? '下架' : '上架' }}</text>
          </view>
          <view class="action-btn danger" @tap="deletePost(post)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <view class="empty-hint" v-if="posts.length === 0 && !loading">
        <text>暂无帖子</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getPosts, togglePostStatus, deletePost } from '@/api'

export default {
  data() {
    return {
      posts: [],
      filterStatus: '',
      keyword: '',
      loading: false
    }
  },
  onLoad() {
    this.loadPosts()
  },
  methods: {
    goBack() { uni.navigateBack() },
    refresh() { this.loadPosts() },
    switchStatus(status) {
      this.filterStatus = status
      this.loadPosts()
    },
    async loadPosts() {
      this.loading = true
      try {
        const params = {}
        if (this.filterStatus !== '') params.status = Number(this.filterStatus)
        if (this.keyword) params.keyword = this.keyword
        const res = await getPosts(params)
        this.posts = res.data || []
      } catch (e) {
        console.error('加载失败', e)
      }
      this.loading = false
    },
    async toggleStatus(post) {
      const newStatus = post.status === 1 ? 0 : 1
      try {
        await togglePostStatus(post._id || post.id, newStatus)
        post.status = newStatus
        uni.showToast({ title: newStatus === 1 ? '已上架' : '已下架', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    deletePost(post) {
      uni.showModal({
        title: '确认删除',
        content: '确定删除该帖子吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await deletePost(post._id || post.id)
              this.posts = this.posts.filter(p => (p._id || p.id) !== (post._id || post.id))
              uni.showToast({ title: '已删除', icon: 'success' })
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },
    formatTime(isoString) {
      if (!isoString) return ''
      const date = new Date(isoString)
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #F5F1EB; }
.nav-bar { display: flex; align-items: center; height: 88rpx; background-color: #FFFFFF; padding: 0 24rpx; position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
.back-btn { width: 56rpx; display: flex; align-items: center; }
.back-arrow { font-size: 44rpx; color: #333; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #333; text-align: center; }
.right-btn text { font-size: 28rpx; color: #4F9A42; }
.filter-bar { background: #FFF; padding: 16rpx 20rpx; position: fixed; top: 88rpx; left: 0; right: 0; z-index: 99; }
.filter-tabs { display: flex; }
.filter-item { flex: 1; text-align: center; padding: 12rpx 0; }
.filter-item text { font-size: 28rpx; color: #666; }
.filter-item.active text { color: #4F9A42; font-weight: 600; }
.search-row { display: flex; gap: 16rpx; margin-top: 16rpx; }
.search-input { flex: 1; height: 64rpx; background: #F5F5F5; border-radius: 32rpx; padding: 0 24rpx; font-size: 26rpx; }
.search-btn { padding: 0 32rpx; height: 64rpx; background: #4F9A42; border-radius: 32rpx; display: flex; align-items: center; }
.search-btn text { font-size: 26rpx; color: #FFF; }
.scroll-list { height: calc(100vh - 220rpx); padding: 20rpx; padding-top: 200rpx; }
.post-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.post-title { font-size: 28rpx; font-weight: 600; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.post-status.online { background: #E8F5E9; color: #4F9A42; }
.post-status.offline { background: #F5F5F5; color: #999; }
.post-meta { display: flex; gap: 20rpx; font-size: 24rpx; color: #666; margin-bottom: 8rpx; }
.post-stats { display: flex; gap: 20rpx; font-size: 22rpx; color: #999; margin-bottom: 12rpx; }
.post-actions { display: flex; gap: 16rpx; justify-content: flex-end; }
.action-btn { padding: 10rpx 24rpx; background: #F5F5F5; border-radius: 20rpx; }
.action-btn text { font-size: 24rpx; color: #666; }
.action-btn.danger text { color: #FF5252; }
.empty-hint { text-align: center; padding: 120rpx 0; color: #999; }
</style>