<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">骑手管理</text>
      <view class="right-btn" @tap="showAddModal = true">
        <text>添加</text>
      </view>
    </view>

    <scroll-view class="scroll-list" scroll-y="true">
      <view class="rider-card" v-for="rider in riders" :key="rider._id || rider.id">
        <view class="rider-info">
          <view class="rider-avatar">
            <text class="iconfont icon-peisong" style="font-size: 40rpx; color: #2196F3;"></text>
          </view>
          <view class="rider-detail">
            <text class="rider-name">{{ rider.name }}</text>
            <text class="rider-phone">{{ rider.phone }}</text>
            <text class="rider-community" v-if="rider.communityName">{{ rider.communityName }}</text>
          </view>
        </view>
        <view class="rider-status">
          <view class="status-tag" :class="rider.status === 'active' ? 'active' : 'inactive'">
            <text>{{ rider.status === 'active' ? '在线' : '休息' }}</text>
          </view>
        </view>
        <view class="rider-actions">
          <view class="action-btn" @tap="editRider(rider)">
            <text>编辑</text>
          </view>
          <view class="action-btn danger" @tap="deleteRider(rider)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <view class="empty-hint" v-if="riders.length === 0 && !loading">
        <text>暂无骑手</text>
      </view>
    </scroll-view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal-mask" v-if="showAddModal" @tap="closeModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text>{{ isEdit ? '编辑骑手' : '添加骑手' }}</text>
          <text class="close-btn" @tap="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">姓名</text>
            <input class="form-input" v-model="form.name" placeholder="请输入姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">电话</text>
            <input class="form-input" type="number" v-model="form.phone" placeholder="请输入电话" />
          </view>
          <view class="form-item">
            <text class="form-label">状态</text>
            <view class="status-switch">
              <view class="switch-item" :class="{ active: form.status === 'active' }" @tap="form.status = 'active'">
                <text>在线</text>
              </view>
              <view class="switch-item" :class="{ active: form.status === 'inactive' }" @tap="form.status = 'inactive'">
                <text>休息</text>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn cancel" @tap="closeModal">
            <text>取消</text>
          </view>
          <view class="btn confirm" @tap="submitForm">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getRiders, addRider, updateRider, deleteRider } from '@/api'

export default {
  data() {
    return {
      riders: [],
      loading: false,
      showAddModal: false,
      isEdit: false,
      currentRiderId: null,
      form: {
        name: '',
        phone: '',
        status: 'active'
      }
    }
  },
  onLoad() {
    this.loadRiders()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async loadRiders() {
      this.loading = true
      try {
        const res = await getRiders()
        this.riders = res.data || []
      } catch (e) {
        console.error('加载骑手失败', e)
      }
      this.loading = false
    },
    editRider(rider) {
      this.isEdit = true
      this.currentRiderId = rider._id || rider.id
      this.form = {
        name: rider.name,
        phone: rider.phone,
        status: rider.status || 'active'
      }
      this.showAddModal = true
    },
    closeModal() {
      this.showAddModal = false
      this.isEdit = false
      this.currentRiderId = null
      this.form = { name: '', phone: '', status: 'active' }
    },
    async submitForm() {
      if (!this.form.name) {
        uni.showToast({ title: '请输入姓名', icon: 'none' })
        return
      }
      if (!this.form.phone) {
        uni.showToast({ title: '请输入电话', icon: 'none' })
        return
      }

      try {
        if (this.isEdit) {
          await updateRider(this.currentRiderId, this.form)
          uni.showToast({ title: '修改成功', icon: 'success' })
        } else {
          await addRider(this.form)
          uni.showToast({ title: '添加成功', icon: 'success' })
        }
        this.closeModal()
        this.loadRiders()
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    deleteRider(rider) {
      uni.showModal({
        title: '确认删除',
        content: `确定删除骑手 "${rider.name}" 吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteRider(rider._id || rider.id)
              this.riders = this.riders.filter(r => (r._id || r.id) !== (rider._id || rider.id))
              uni.showToast({ title: '已删除', icon: 'success' })
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #F5F1EB;
}
.nav-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  background-color: #FFFFFF;
  padding: 0 24rpx;
}
.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-arrow {
  font-size: 44rpx;
  color: #333;
}
.nav-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
}
.right-btn text {
  font-size: 28rpx;
  color: #4F9A42;
}

.scroll-list {
  height: calc(100vh - 88rpx);
  padding: 20rpx;
}
.rider-card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
}
.rider-info {
  display: flex;
  flex: 1;
}
.rider-avatar {
  width: 80rpx;
  height: 80rpx;
  background-color: #E3F2FD;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rider-detail {
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.rider-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.rider-phone {
  font-size: 24rpx;
  color: #666;
  margin-top: 4rpx;
}
.rider-community {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}
.rider-status {
  margin: 0 20rpx;
}
.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}
.status-tag.active {
  background-color: #E8F5E9;
  color: #4F9A42;
}
.status-tag.inactive {
  background-color: #F5F5F5;
  color: #999;
}
.rider-actions {
  display: flex;
  gap: 12rpx;
}
.action-btn {
  padding: 10rpx 20rpx;
  background-color: #F5F5F5;
  border-radius: 20rpx;
}
.action-btn text {
  font-size: 24rpx;
  color: #666;
}
.action-btn.danger text {
  color: #FF5252;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  width: 600rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.modal-header text:first-child {
  font-size: 32rpx;
  font-weight: 600;
}
.close-btn {
  font-size: 48rpx;
  color: #999;
}
.modal-body {
  padding: 30rpx;
}
.form-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
}
.form-label {
  width: 120rpx;
  font-size: 28rpx;
  color: #333;
}
.form-input {
  flex: 1;
  font-size: 28rpx;
}
.status-switch {
  display: flex;
  background-color: #F5F5F5;
  border-radius: 8rpx;
  padding: 4rpx;
}
.switch-item {
  padding: 12rpx 24rpx;
  border-radius: 6rpx;
}
.switch-item.active {
  background-color: #4F9A42;
}
.switch-item.active text {
  color: #FFFFFF;
}
.switch-item text {
  font-size: 26rpx;
  color: #666;
}
.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
}
.btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn text {
  font-size: 30rpx;
}
.btn.cancel {
  background-color: #F5F5F5;
}
.btn.cancel text {
  color: #666;
}
.btn.confirm {
  background-color: #4F9A42;
}
.btn.confirm text {
  color: #FFFFFF;
}

.empty-hint {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
}
</style>