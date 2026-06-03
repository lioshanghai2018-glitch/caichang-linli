<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">帖子详情</text>
    </view>

    <!-- 帖子内容 -->
    <scroll-view class="content-scroll" scroll-y="true">
      <view class="post-card">
        <!-- 作者信息 -->
        <view class="author-row">
          <view class="author-info">
            <view class="author-name-row">
              <text class="author-name">{{ getDisplayId(post.authorId) }}</text>
              <view class="badge" v-if="post.isCertified || post.certified">
                <text>已认证</text>
              </view>
            </view>
            <text class="post-time">{{ post.createdAt ? formatTime(post.createdAt) : post.time }}</text>
          </view>
          <view class="follow-btn" v-if="!post.isFollowed" @tap="toggleFollow">
            <text>关注</text>
          </view>
          <view class="followed-btn" v-else @tap="toggleFollow">
            <text>已关注</text>
          </view>
        </view>

        <!-- 标题 -->
        <text class="post-title">{{ post.title }}</text>

        <!-- 内容 -->
        <text class="post-content">{{ post.content }}</text>

        <!-- 图片 -->
        <view class="post-images" v-if="post.images && post.images.length > 0">
          <image class="post-img" v-for="(img, idx) in post.images" :key="idx" :src="img" mode="aspectFill" @tap="previewImage(idx)" />
        </view>

        <!-- 价格 -->
        <view class="price-row" v-if="post.price">
          <text class="price-text">{{ post.price }}</text>
        </view>

        <!-- 分类标签 -->
        <view class="tag-row" v-if="post.categoryName">
          <view class="tag">
            <text>{{ post.categoryName }}</text>
          </view>
        </view>

        <!-- 互动栏 -->
        <view class="action-row">
          <view class="action-item" @tap="toggleLike">
            <view class="iconfont" :class="post.isLiked ? 'icon-dianzan1' : 'icon-dianzan'"></view>
            <text>{{ post.likes }}</text>
          </view>
          <view class="action-item">
            <view class="iconfont icon-pinglun"></view>
            <text>{{ post.comments || 0 }}</text>
          </view>
          <view class="action-item call-btn" @tap="callPhone" v-if="post.contactPhone">
            <view class="iconfont icon-dianhua"></view>
            <text>联系TA</text>
          </view>
        </view>
      </view>

      <!-- 评论列表 -->
      <view class="comment-section">
        <text class="comment-title">评论 ({{ comments.length }})</text>
        <view class="comment-list">
          <view class="comment-item" v-for="(comment, idx) in comments" :key="idx">
            <view class="comment-user">
              <text class="comment-user-id">{{ getDisplayId(comment.userId) }}</text>
            </view>
            <view class="comment-body">
              <text class="comment-author">{{ comment.authorName }}</text>
              <text class="comment-text">{{ comment.content }}</text>
              <text class="comment-time">{{ formatTime(comment.createdAt) }}</text>
            </view>
          </view>
          <view class="no-comment" v-if="comments.length === 0">
            <text>暂无评论，快来抢沙发</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部输入框 -->
    <view class="input-bar">
      <input class="comment-input" v-model="commentText" placeholder="说点什么..." placeholder-class="input-placeholder" />
      <view class="send-btn" @tap="submitComment">
        <text>发送</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getPostDetail, toggleLike, toggleFollow, getComments, createComment } from '@/utils/neighbor-api.js'

export default {
  data() {
    return {
      postId: '',
      userId: 'user_' + (uni.getStorageSync('userId') || Date.now()),
      post: {
        authorId: '',
        title: '',
        content: '',
        images: [],
        tags: [],
        likes: 0,
        comments: 0,
        isLiked: false,
        isFollowed: false,
        contactPhone: ''
      },
      comments: [],
      commentText: ''
    }
  },
  onLoad(options) {
    if (options.id) {
      this.postId = options.id
      this.loadPostDetail()
      this.loadComments()
    }
  },
  methods: {
    goBack() { uni.navigateBack() },

    getDisplayId(authorId) {
      if (!authorId) return '游客'
      if (authorId.length > 8) {
        return authorId.slice(-6)
      }
      return authorId
    },

    async loadPostDetail() {
      try {
        const res = await getPostDetail({ postId: this.postId, userId: this.userId })
        if (res.data) {
          const postData = Array.isArray(res.data) ? res.data[0] : res.data
          this.post = { ...this.post, ...postData }
        }
      } catch (e) {
        console.error('加载详情失败', e)
      }
    },

    async loadComments() {
      try {
        const res = await getComments(this.postId)
        this.comments = res.data || []
      } catch (e) {
        // 使用本地存储
        let localPosts = uni.getStorageSync('local_posts') || []
        const post = localPosts.find(p => (p._id || p.id) === this.postId)
        this.comments = post ? (post.commentsList || []) : [
          { authorName: '邻居王阿姨', content: '太好了，明天我也想要一些', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { authorName: '邻居张大哥', content: '西红柿怎么卖？', createdAt: new Date(Date.now() - 2700000).toISOString() },
          { authorName: '邻居老陈', content: '支持邻里经济！', createdAt: new Date(Date.now() - 300000).toISOString() }
        ]
      }
    },

    async toggleLike() {
      try {
        await toggleLike(this.postId, this.userId)
      } catch (e) {}
      this.post.isLiked = !this.post.isLiked
      this.post.likes += this.post.isLiked ? 1 : -1
    },

    async toggleFollow() {
      try {
        await toggleFollow(this.post.authorId, this.userId)
      } catch (e) {}
      this.post.isFollowed = !this.post.isFollowed
      uni.showToast({ title: this.post.isFollowed ? '已关注' : '取消关注', icon: 'none' })
    },

    callPhone() {
      if (!this.post.contactPhone) {
        uni.showToast({ title: '暂无联系电话', icon: 'none' })
        return
      }
      uni.makePhoneCall({ phoneNumber: this.post.contactPhone })
    },

    previewImage(idx) {
      uni.previewImage({
        urls: this.post.images,
        current: idx
      })
    },

    async submitComment() {
      if (!this.commentText.trim()) {
        uni.showToast({ title: '请输入评论内容', icon: 'none' })
        return
      }
      const newComment = {
        authorName: uni.getStorageSync('userName') || '邻居',
        content: this.commentText.trim(),
        createdAt: new Date().toISOString()
      }
      try {
        await createComment(this.postId, this.userId, this.commentText.trim(), newComment.authorName)
      } catch (e) {
        // 本地存储
        let localPosts = uni.getStorageSync('local_posts') || []
        const idx = localPosts.findIndex(p => (p._id || p.id) === this.postId)
        if (idx >= 0) {
          if (!localPosts[idx].commentsList) localPosts[idx].commentsList = []
          localPosts[idx].commentsList.unshift(newComment)
        }
        uni.setStorageSync('local_posts', localPosts)
      }
      this.comments.unshift(newComment)
      this.commentText = ''
      this.post.comments = (this.post.comments || 0) + 1
      uni.showToast({ title: '评论成功', icon: 'success' })
    },

    formatTime(isoString) {
      if (!isoString) return ''
      const date = new Date(isoString)
      const now = new Date()
      const diff = now - date
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
      if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
      return date.toLocaleDateString('zh-CN')
    }
  }
}
</script>

<style>
.page { min-height: 100vh; background-color: #F5F1EB; padding-bottom: 100rpx; display: flex; flex-direction: column; }
.nav-bar { display: flex; align-items: center; height: 88rpx; background-color: #FFFFFF; padding: 0 24rpx; position: fixed; top: 0; left: 0; right: 0; z-index: 100; border-bottom: 1rpx solid #F0F0F0; }
.back-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.back-arrow { font-size: 44rpx; color: #333; font-weight: 300; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #333; text-align: center; }

.content-scroll { flex: 1; margin-top: 88rpx; }

.post-card { background-color: #FFFFFF; margin: 16rpx 20rpx; border-radius: 16rpx; padding: 24rpx; }
.author-row { display: flex; align-items: center; }
.author-info { flex: 1; display: flex; flex-direction: column; }
.author-name-row { display: flex; align-items: center; }
.author-name { font-size: 28rpx; font-weight: 600; color: #333; }
.badge { background-color: #E8F5E9; padding: 2rpx 8rpx; border-radius: 4rpx; margin-left: 12rpx; }
.badge text { font-size: 18rpx; font-weight: 600; color: #4F9A42; }
.post-time { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.follow-btn { border: 2rpx solid #4F9A42; border-radius: 32rpx; padding: 8rpx 24rpx; }
.follow-btn text { font-size: 24rpx; color: #4F9A42; }
.followed-btn { background-color: #E8F5E9; border-radius: 32rpx; padding: 8rpx 24rpx; }
.followed-btn text { font-size: 24rpx; color: #666; }

.post-title { font-size: 32rpx; font-weight: 600; color: #333; display: block; margin-top: 20rpx; }
.post-content { font-size: 28rpx; color: #333; line-height: 1.6; display: block; margin-top: 12rpx; }
.post-images { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.post-img { width: 200rpx; height: 200rpx; border-radius: 12rpx; }
.price-row { margin-top: 16rpx; }
.price-text { font-size: 32rpx; font-weight: 600; color: #FF6B6B; }
.tag-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.tag { background-color: #E8F5E9; border-radius: 8rpx; padding: 4rpx 12rpx; }
.tag text { font-size: 22rpx; color: #4F9A42; }
.action-row { display: flex; gap: 48rpx; margin-top: 24rpx; padding-top: 16rpx; border-top: 1rpx solid #F0F0F0; }
.action-item { display: flex; align-items: center; gap: 8rpx; }
.action-item .iconfont { font-size: 36rpx; color: #666; }
.action-item text { font-size: 26rpx; color: #666; }
.call-btn { margin-left: auto; }
.call-btn .iconfont { color: #4F9A42; }
.call-btn text { color: #4F9A42; font-weight: 500; }

.comment-section { background-color: #FFFFFF; margin: 16rpx 20rpx; border-radius: 16rpx; padding: 24rpx; }
.comment-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 20rpx; }
.comment-list { }
.comment-item { display: flex; margin-bottom: 24rpx; }
.comment-user { width: 64rpx; height: 64rpx; border-radius: 50%; background-color: #E8F5E9; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.comment-user-id { font-size: 20rpx; color: #4F9A42; font-weight: 600; }
.comment-body { flex: 1; margin-left: 16rpx; display: flex; flex-direction: column; }
.comment-author { font-size: 26rpx; font-weight: 600; color: #333; }
.comment-text { font-size: 26rpx; color: #333; margin-top: 6rpx; line-height: 1.4; }
.comment-time { font-size: 20rpx; color: #999; margin-top: 6rpx; }
.no-comment { text-align: center; padding: 40rpx 0; }
.no-comment text { font-size: 26rpx; color: #999; }

/* 底部输入栏 */
.input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background-color: #FFFFFF;
  border-top: 1rpx solid #F0F0F0;
  z-index: 100;
}
.comment-input {
  flex: 1;
  height: 72rpx;
  background-color: #F5F5F5;
  border-radius: 36rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
}
.input-placeholder { color: #999; }
.send-btn {
  margin-left: 16rpx;
  padding: 16rpx 32rpx;
  background-color: #4F9A42;
  border-radius: 36rpx;
}
.send-btn text { font-size: 28rpx; color: #FFFFFF; }
</style>