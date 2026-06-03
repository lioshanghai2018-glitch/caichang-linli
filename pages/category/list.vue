<template>
<view class="page">
  <view class="empty-state" v-if="categories.length === 0 && !loading">
    <text class="empty-icon">🗂️</text>
    <text class="empty-text">还没有分类，点击右下角添加</text>
  </view>

  <scroll-view class="cat-list" scroll-y v-else>
    <view class="cat-item" v-for="(item, idx) in categories" :key="item._id || idx">
      <view class="cat-main">
        <view class="cat-name-row">
          <text class="cat-name">{{item.name}}</text>
          <text class="cat-sort">排序 {{item.sort || 0}}</text>
        </view>
        <view class="cat-status">
          <text class="status-text" :class="{on: item.status !== false, off: item.status === false}">
            {{item.status === false ? '已停用' : '已启用'}}
          </text>
        </view>
      </view>
      <view class="cat-actions">
        <view class="switch-wrap" @tap.stop="toggleStatus(item)">
          <view class="switch" :class="{on: item.status !== false}">
            <view class="switch-dot"></view>
          </view>
        </view>
        <text class="action-btn" @tap.stop="goEdit(item._id)">编辑</text>
        <text class="action-btn danger" @tap.stop="del(item)">删除</text>
      </view>
    </view>
    <view class="bottom-placeholder"></view>
  </scroll-view>

  <view class="add-btn" @tap="goAdd">
    <text class="add-icon">+</text>
  </view>
</view>
</template>

<script>
import { getCategories, deleteCategory, updateCategory } from '@/utils/api.js'

export default {
  data() {
    return {
      categories: [],
      loading: false
    }
  },
  onShow() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.loading = true
      try {
        const res = await getCategories()
        this.categories = Array.isArray(res.data) ? res.data : (res.data?.list || [])
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/category/add' })
    },
    goEdit(id) {
      uni.navigateTo({ url: `/pages/category/add?id=${id}` })
    },
    async toggleStatus(item) {
      const next = !(item.status !== false)
      try {
        await updateCategory(item._id, { status: next })
        item.status = next
      } catch (e) {
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      }
    },
    del(item) {
      uni.showModal({
        title: '删除分类',
        content: `确定删除「${item.name}」？该分类下的商品不受影响。`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteCategory(item._id)
            uni.showToast({ title: '已删除', icon: 'success' })
            this.fetchList()
          } catch (e) {
            uni.showToast({ title: e.msg || '删除失败', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 20rpx 20rpx 180rpx;
}

.cat-list {
  height: calc(100vh - 40rpx);
}

.cat-item {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.cat-main {
  flex: 1;
  min-width: 0;
}

.cat-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.cat-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #000000;
}

.cat-sort {
  font-size: 22rpx;
  color: #999999;
  padding: 2rpx 10rpx;
  background: #F5F5F5;
  border-radius: 6rpx;
}

.status-text {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.status-text.on {
  color: #4CAF50;
  background: #E8F5E9;
}

.status-text.off {
  color: #999999;
  background: #F5F5F5;
}

.cat-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.switch-wrap {
  display: flex;
  align-items: center;
}

.switch {
  width: 80rpx;
  height: 44rpx;
  background: #E8E8E8;
  border-radius: 22rpx;
  padding: 4rpx;
  transition: all 0.3s;
}

.switch.on {
  background: #4CAF50;
}

.switch-dot {
  width: 36rpx;
  height: 36rpx;
  background: #FFFFFF;
  border-radius: 50%;
  transition: all 0.3s;
}

.switch.on .switch-dot {
  transform: translateX(36rpx);
}

.action-btn {
  font-size: 26rpx;
  color: #4CAF50;
  padding: 8rpx 16rpx;
}

.action-btn.danger {
  color: #FF6B00;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.add-btn {
  position: fixed;
  bottom: 80rpx;
  right: 24rpx;
  width: 96rpx;
  height: 96rpx;
  background: #4CAF50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(76,175,80,0.4);
}

.add-icon {
  font-size: 60rpx;
  color: #FFFFFF;
  font-weight: 300;
}

.bottom-placeholder {
  height: 40rpx;
}
</style>
