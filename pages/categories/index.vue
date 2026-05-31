<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">分类管理</text>
      <view class="right-btn" @tap="showAddModal = true">
        <text>添加</text>
      </view>
    </view>

    <scroll-view class="scroll-list" scroll-y="true">
      <view class="category-card" v-for="cat in categories" :key="cat._id || cat.id">
        <view class="category-info">
          <text class="category-name">{{ cat.name }}</text>
          <text class="category-sort">排序: {{ cat.sort || 0 }}</text>
        </view>
        <view class="category-status">
          <view class="status-tag" :class="cat.status ? 'active' : 'inactive'">
            <text>{{ cat.status ? '启用' : '禁用' }}</text>
          </view>
        </view>
        <view class="category-actions">
          <view class="action-btn" @tap="toggleStatus(cat)">
            <text>{{ cat.status ? '禁用' : '启用' }}</text>
          </view>
          <view class="action-btn" @tap="editCategory(cat)">
            <text>编辑</text>
          </view>
          <view class="action-btn danger" @tap="deleteCategory(cat)">
            <text>删除</text>
          </view>
        </view>
      </view>

      <view class="empty-hint" v-if="categories.length === 0 && !loading">
        <text>暂无分类</text>
      </view>
    </scroll-view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal-mask" v-if="showAddModal" @tap="closeModal">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text>{{ isEdit ? '编辑分类' : '添加分类' }}</text>
          <text class="close-btn" @tap="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">名称</text>
            <input class="form-input" v-model="form.name" placeholder="分类名称" />
          </view>
          <view class="form-item">
            <text class="form-label">排序</text>
            <input class="form-input" type="number" v-model="form.sort" placeholder="数字越小越靠前" />
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
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/api'

export default {
  data() {
    return {
      categories: [],
      loading: false,
      showAddModal: false,
      isEdit: false,
      currentId: null,
      form: { name: '', sort: 0 }
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
        const res = await getCategories()
        this.categories = res.data || []
      } catch (e) {
        console.error('加载失败', e)
      }
      this.loading = false
    },
    editCategory(cat) {
      this.isEdit = true
      this.currentId = cat._id || cat.id
      this.form = { name: cat.name, sort: cat.sort || 0 }
      this.showAddModal = true
    },
    closeModal() {
      this.showAddModal = false
      this.isEdit = false
      this.currentId = null
      this.form = { name: '', sort: 0 }
    },
    async submitForm() {
      if (!this.form.name) {
        uni.showToast({ title: '请输入名称', icon: 'none' })
        return
      }
      try {
        if (this.isEdit) {
          await updateCategory(this.currentId, this.form)
        } else {
          await addCategory(this.form)
        }
        uni.showToast({ title: '成功', icon: 'success' })
        this.closeModal()
        this.loadData()
      } catch (e) {
        uni.showToast({ title: '失败', icon: 'none' })
      }
    },
    async toggleStatus(cat) {
      try {
        await updateCategory(cat._id || cat.id, { status: !cat.status })
        cat.status = !cat.status
        uni.showToast({ title: cat.status ? '已启用' : '已禁用', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    deleteCategory(cat) {
      uni.showModal({
        title: '确认删除',
        content: `删除 "${cat.name}"？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteCategory(cat._id || cat.id)
              this.categories = this.categories.filter(x => (x._id || x.id) !== (cat._id || cat.id))
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
.category-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.category-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.category-name { font-size: 28rpx; font-weight: 600; color: #333; }
.category-sort { font-size: 24rpx; color: #999; }
.status-tag { padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 22rpx; }
.status-tag.active { background: #E8F5E9; color: #4F9A42; }
.status-tag.inactive { background: #F5F5F5; color: #999; }
.category-actions { display: flex; gap: 12rpx; justify-content: flex-end; }
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