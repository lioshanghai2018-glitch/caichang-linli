<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">小区管理</text>
      <view class="right-btn" @tap="showAddModal = true">
        <text>添加</text>
      </view>
    </view>

    <scroll-view class="scroll-list" scroll-y="true">
      <view class="community-card" v-for="c in communities" :key="c._id || c.id">
        <view class="community-info">
          <text class="community-name">{{ c.name }}</text>
          <text class="community-address">{{ c.address || '暂无地址' }}</text>
        </view>
        <view class="community-actions">
          <view class="action-btn" @tap="editCommunity(c)">
            <text>编辑</text>
          </view>
          <view class="action-btn danger" @tap="deleteCommunity(c)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <view class="empty-hint" v-if="communities.length === 0 && !loading">
        <text>暂无小区</text>
      </view>
    </scroll-view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal-mask" v-if="showAddModal" @tap="closeModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text>{{ isEdit ? '编辑小区' : '添加小区' }}</text>
          <text class="close-btn" @tap="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">名称</text>
            <input class="form-input" v-model="form.name" placeholder="请输入小区名称" />
          </view>
          <view class="form-item">
            <text class="form-label">地址</text>
            <input class="form-input" v-model="form.address" placeholder="请输入详细地址" />
          </view>
        </view>
        <view class="modal-footer">
          <view class="btn cancel" @tap="closeModal"><text>取消</text></view>
          <view class="btn confirm" @tap="submitForm"><text>确定</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getCommunities, addCommunity, updateCommunity, deleteCommunity } from '@/api'

export default {
  data() {
    return {
      communities: [],
      loading: false,
      showAddModal: false,
      isEdit: false,
      currentId: null,
      form: { name: '', address: '' }
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    goBack() { uni.navigateBack() },
    async loadData() {
      this.loading = true
      try {
        const res = await getCommunities()
        this.communities = res.data || []
      } catch (e) {
        console.error('加载失败', e)
      }
      this.loading = false
    },
    editCommunity(c) {
      this.isEdit = true
      this.currentId = c._id || c.id
      this.form = { name: c.name, address: c.address }
      this.showAddModal = true
    },
    closeModal() {
      this.showAddModal = false
      this.isEdit = false
      this.currentId = null
      this.form = { name: '', address: '' }
    },
    async submitForm() {
      if (!this.form.name) {
        uni.showToast({ title: '请输入名称', icon: 'none' })
        return
      }
      try {
        if (this.isEdit) {
          await updateCommunity(this.currentId, this.form)
        } else {
          await addCommunity(this.form)
        }
        uni.showToast({ title: '成功', icon: 'success' })
        this.closeModal()
        this.loadData()
      } catch (e) {
        uni.showToast({ title: '失败', icon: 'none' })
      }
    },
    deleteCommunity(c) {
      uni.showModal({
        title: '确认删除',
        content: `删除 "${c.name}"？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteCommunity(c._id || c.id)
              this.communities = this.communities.filter(x => (x._id || x.id) !== (c._id || c.id))
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
.page { min-height: 100vh; background-color: #F5F1EB; }
.nav-bar { display: flex; align-items: center; height: 88rpx; background-color: #FFFFFF; padding: 0 24rpx; }
.back-btn { width: 56rpx; display: flex; align-items: center; }
.back-arrow { font-size: 44rpx; color: #333; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #333; text-align: center; }
.right-btn text { font-size: 28rpx; color: #4F9A42; }
.scroll-list { height: calc(100vh - 88rpx); padding: 20rpx; }
.community-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; display: flex; align-items: center; }
.community-info { flex: 1; }
.community-name { font-size: 28rpx; font-weight: 600; color: #333; display: block; }
.community-address { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.community-actions { display: flex; gap: 12rpx; }
.action-btn { padding: 10rpx 20rpx; background: #F5F5F5; border-radius: 20rpx; }
.action-btn text { font-size: 24rpx; color: #666; }
.action-btn.danger text { color: #FF5252; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 600rpx; background: #FFF; border-radius: 24rpx; }
.modal-header { display: flex; justify-content: space-between; padding: 30rpx; border-bottom: 1rpx solid #F0F0F0; }
.modal-header text:first-child { font-size: 32rpx; font-weight: 600; }
.close-btn { font-size: 48rpx; color: #999; }
.modal-body { padding: 30rpx; }
.form-item { display: flex; align-items: center; padding: 20rpx 0; }
.form-label { width: 120rpx; font-size: 28rpx; color: #333; }
.form-input { flex: 1; font-size: 28rpx; }
.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx 30rpx; }
.btn { flex: 1; height: 80rpx; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; }
.btn text { font-size: 30rpx; }
.btn.cancel { background: #F5F5F5; }
.btn.cancel text { color: #666; }
.btn.confirm { background: #4F9A42; }
.btn.confirm text { color: #FFF; }
.empty-hint { text-align: center; padding: 120rpx 0; color: #999; }
</style>