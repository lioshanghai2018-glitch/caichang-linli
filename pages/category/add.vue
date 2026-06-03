<template>
<view class="page">
  <view class="back-bar">
    <text class="back-arrow" @tap="goBack">‹</text>
    <text class="page-title">{{isEdit ? '编辑分类' : '新增分类'}}</text>
  </view>

  <view class="card">
    <view class="form-row">
      <text class="form-label required">分类名称</text>
      <input class="form-input" placeholder="如：鲜花、菌菇" v-model="name" maxlength="10" />
    </view>
    <view class="form-row">
      <text class="form-label">排序号</text>
      <input class="form-input" type="number" placeholder="数字越小越靠前" v-model="sort" />
    </view>
    <view class="form-row">
      <text class="form-label">启用</text>
      <view class="switch-wrap" @tap="toggleEnabled">
        <view class="switch" :class="{on: enabled}">
          <view class="switch-dot"></view>
        </view>
      </view>
    </view>
  </view>

  <view class="bottom-bar">
    <view class="action-btn primary" @tap="submit">
      <text class="btn-text">{{isEdit ? '保存修改' : '立即添加'}}</text>
    </view>
  </view>

  <view class="bottom-placeholder"></view>
</view>
</template>

<script>
import { addCategory, updateCategory, getCategories } from '@/utils/api.js'

export default {
  data() {
    return {
      isEdit: false,
      catId: '',
      name: '',
      sort: 0,
      enabled: true,
      submitting: false
    }
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true
      this.catId = options.id
      this.loadItem(options.id)
    }
  },
  methods: {
    goBack() { uni.navigateBack() },
    toggleEnabled() { this.enabled = !this.enabled },
    async loadItem(id) {
      uni.showLoading({ title: '加载中...' })
      try {
        const res = await getCategories()
        const list = Array.isArray(res.data) ? res.data : (res.data?.list || [])
        const item = list.find(c => c._id === id)
        if (item) {
          this.name = item.name || ''
          this.sort = item.sort || 0
          this.enabled = item.status !== false
        }
      } catch (e) {
        uni.showToast({ title: e.msg || '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    async submit() {
      if (this.submitting) return
      if (!this.name.trim()) {
        uni.showToast({ title: '请输入分类名称', icon: 'none' })
        return
      }
      this.submitting = true
      uni.showLoading({ title: this.isEdit ? '保存中...' : '添加中...' })
      const payload = {
        name: this.name.trim(),
        sort: Number(this.sort) || 0,
        status: this.enabled
      }
      try {
        if (this.isEdit) {
          await updateCategory(this.catId, payload)
        } else {
          await addCategory(payload)
        }
        uni.hideLoading()
        uni.showToast({ title: this.isEdit ? '已保存' : '已添加', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '操作失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 0 20rpx 180rpx;
}

.back-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
}

.back-arrow {
  font-size: 48rpx;
  color: #000000;
  font-weight: 300;
  padding: 0 8rpx;
}

.page-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
}

.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  margin-bottom: 16rpx;
}

.form-row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.form-row:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 28rpx;
  color: #333333;
  width: 180rpx;
  flex-shrink: 0;
}

.form-label.required::before {
  content: '*';
  color: #FF0000;
  margin-right: 4rpx;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
  text-align: right;
}

.form-input::placeholder {
  color: #CCCCCC;
}

.switch-wrap {
  margin-left: auto;
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

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 24rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
}

.action-btn {
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.primary {
  background: #4CAF50;
}

.action-btn .btn-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.bottom-placeholder {
  height: 120rpx;
}
</style>
