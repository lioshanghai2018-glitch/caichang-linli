<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">认证管理</text>
      <view class="right-btn" @tap="refresh">
        <text>刷新</text>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="filter-tabs">
      <view class="filter-item" :class="{ active: currentFilter === 'all' }" @tap="switchFilter('all')">
        <text>全部</text>
      </view>
      <view class="filter-item" :class="{ active: currentFilter === 'pending' }" @tap="switchFilter('pending')">
        <text>待审核</text>
      </view>
      <view class="filter-item" :class="{ active: currentFilter === 'certified' }" @tap="switchFilter('certified')">
        <text>已认证</text>
      </view>
    </view>

    <scroll-view class="scroll-list" scroll-y="true">
      <view class="cert-card" v-for="cert in filteredCerts" :key="cert._id || cert.id" @tap="showDetail(cert)">
        <view class="cert-header">
          <text class="cert-name">{{ cert.name || '未填写姓名' }}</text>
          <text class="cert-status" :class="cert.status">{{ getStatusText(cert.status) }}</text>
        </view>
        <view class="cert-info">
          <text>手机: {{ cert.phone }}</text>
          <text>小区: {{ cert.communityName }}</text>
        </view>
        <view class="cert-time">
          <text>{{ formatTime(cert.submitTime || cert.createTime) }}</text>
        </view>
        <view class="cert-actions" v-if="cert.status === 'pending'" @tap.stop>
          <view class="action-btn approve" @tap="approveCert(cert)">
            <text>通过</text>
          </view>
          <view class="action-btn reject" @tap="rejectCert(cert)">
            <text>拒绝</text>
          </view>
        </view>
        <view class="cert-actions" v-if="cert.status === 'certified'" @tap.stop>
          <view class="action-btn danger" @tap="revokeCert(cert)">
            <text>撤销认证</text>
          </view>
        </view>
      </view>

      <view class="empty-hint" v-if="filteredCerts.length === 0 && !loading">
        <text>暂无认证申请</text>
      </view>
    </scroll-view>

    <!-- 详情弹窗 -->
    <view class="modal-mask" v-if="showCertModal" @tap="showCertModal = false">
      <view class="modal-content" @tap.stop>
        <view class="modal-header">
          <text>认证详情</text>
          <text class="close-btn" @tap="showCertModal = false">×</text>
        </view>
        <scroll-view class="detail-scroll" scroll-y="true">
          <view class="detail-item">
            <text class="detail-label">姓名</text>
            <text class="detail-value">{{ currentCert.name }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">手机号</text>
            <text class="detail-value">{{ currentCert.phone }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">小区</text>
            <text class="detail-value">{{ currentCert.communityName }}</text>
          </view>
          <view class="detail-images" v-if="currentCert.idCardUrl">
            <text class="detail-label">身份证照片</text>
            <image :src="currentCert.idCardUrl" mode="aspectFit" @tap="previewImage(currentCert.idCardUrl)"></image>
          </view>
          <view class="detail-images" v-if="currentCert.billUrl">
            <text class="detail-label">缴费凭证</text>
            <image :src="currentCert.billUrl" mode="aspectFit" @tap="previewImage(currentCert.billUrl)"></image>
          </view>
          <view class="detail-item" v-if="currentCert.rejectReason">
            <text class="detail-label">拒绝原因</text>
            <text class="detail-value" style="color: #FF5252;">{{ currentCert.rejectReason }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 拒绝原因弹窗 -->
    <view class="modal-mask" v-if="showRejectModal" @tap="showRejectModal = false">
      <view class="modal-content reject-modal" @tap.stop>
        <view class="modal-header">
          <text>拒绝原因</text>
          <text class="close-btn" @tap="showRejectModal = false">×</text>
        </view>
        <view class="reject-body">
          <textarea class="reject-input" v-model="rejectReason" placeholder="请输入拒绝原因" />
        </view>
        <view class="modal-footer">
          <view class="btn cancel" @tap="showRejectModal = false"><text>取消</text></view>
          <view class="btn confirm" @tap="confirmReject"><text>确认拒绝</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getCerts, approveCert, rejectCert as apiRejectCert, revokeCert as apiRevokeCert } from '@/api'

export default {
  data() {
    return {
      certs: [],
      filteredCerts: [],
      currentFilter: 'all',
      loading: false,
      showCertModal: false,
      currentCert: {},
      showRejectModal: false,
      rejectReason: ''
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    goBack() { uni.navigateBack() },
    refresh() { this.loadData() },
    async loadData() {
      this.loading = true
      try {
        const res = await getCerts()
        this.certs = res.data || []
        this.applyFilter()
      } catch (e) {
        console.error('加载失败', e)
      }
      this.loading = false
    },
    switchFilter(filter) {
      this.currentFilter = filter
      this.applyFilter()
    },
    applyFilter() {
      if (this.currentFilter === 'all') {
        this.filteredCerts = this.certs
      } else {
        this.filteredCerts = this.certs.filter(c => c.status === this.currentFilter)
      }
    },
    showDetail(cert) {
      this.currentCert = cert
      this.showCertModal = true
    },
    getStatusText(status) {
      const map = { pending: '待审核', certified: '已认证', rejected: '已拒绝', none: '无' }
      return map[status] || status
    },
    formatTime(isoString) {
      if (!isoString) return ''
      const date = new Date(isoString)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    },
    async approveCert(cert) {
      try {
        await approveCert(cert._id || cert.id)
        cert.status = 'certified'
        this.applyFilter()
        uni.showToast({ title: '已通过', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    rejectCert(cert) {
      this.currentCert = cert
      this.rejectReason = ''
      this.showRejectModal = true
    },
    async confirmReject() {
      if (!this.rejectReason.trim()) {
        uni.showToast({ title: '请输入原因', icon: 'none' })
        return
      }
      try {
        await apiRejectCert(this.currentCert._id || this.currentCert.id, this.rejectReason)
        this.currentCert.status = 'rejected'
        this.currentCert.rejectReason = this.rejectReason
        this.showRejectModal = false
        this.applyFilter()
        uni.showToast({ title: '已拒绝', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    async revokeCert(cert) {
      uni.showModal({
        title: '确认撤销',
        content: '确定要撤销该用户的认证吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await apiRevokeCert(cert.userId)
              cert.status = 'none'
              this.applyFilter()
              uni.showToast({ title: '已撤销', icon: 'success' })
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    previewImage(url) {
      uni.previewImage({ urls: [url] })
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
.filter-tabs { display: flex; background: #FFF; padding: 16rpx 0; position: fixed; top: 88rpx; left: 0; right: 0; z-index: 99; }
.filter-item { flex: 1; text-align: center; padding: 16rpx 0; }
.filter-item text { font-size: 28rpx; color: #666; }
.filter-item.active text { color: #4F9A42; font-weight: 600; }
.scroll-list { height: calc(100vh - 160rpx); padding: 20rpx; padding-top: 160rpx; }
.cert-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.cert-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.cert-name { font-size: 28rpx; font-weight: 600; color: #333; }
.cert-status { font-size: 24rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.cert-status.pending { background: #FFF3E0; color: #FF9800; }
.cert-status.certified { background: #E8F5E9; color: #4F9A42; }
.cert-status.rejected { background: #FFEBEE; color: #FF5252; }
.cert-info { display: flex; flex-direction: column; gap: 8rpx; }
.cert-info text { font-size: 26rpx; color: #666; }
.cert-time { font-size: 24rpx; color: #999; margin-top: 12rpx; }
.cert-actions { display: flex; gap: 16rpx; margin-top: 16rpx; justify-content: flex-end; }
.action-btn { padding: 12rpx 24rpx; border-radius: 32rpx; }
.action-btn text { font-size: 26rpx; }
.action-btn.approve { background: #E8F5E9; }
.action-btn.approve text { color: #4F9A42; }
.action-btn.reject { background: #FFEBEE; }
.action-btn.reject text { color: #FF5252; }
.action-btn.danger { background: #FFEBEE; }
.action-btn.danger text { color: #FF5252; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 650rpx; max-height: 80vh; background: #FFF; border-radius: 24rpx; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; padding: 30rpx; border-bottom: 1rpx solid #F0F0F0; flex-shrink: 0; }
.modal-header text:first-child { font-size: 32rpx; font-weight: 600; }
.close-btn { font-size: 48rpx; color: #999; }
.detail-scroll { padding: 20rpx; max-height: 600rpx; }
.detail-item { display: flex; padding: 16rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.detail-label { width: 160rpx; font-size: 26rpx; color: #999; }
.detail-value { font-size: 26rpx; color: #333; }
.detail-images { padding: 16rpx 0; }
.detail-images image { width: 100%; height: 300rpx; margin-top: 12rpx; background: #F5F5F5; border-radius: 12rpx; }
.reject-modal { width: 600rpx; }
.reject-body { padding: 30rpx; }
.reject-input { width: 100%; height: 200rpx; background: #F5F5F5; border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; }
.modal-footer { display: flex; gap: 20rpx; padding: 20rpx 30rpx 30rpx; }
.btn { flex: 1; height: 80rpx; border-radius: 40rpx; display: flex; align-items: center; justify-content: center; }
.btn text { font-size: 30rpx; }
.btn.cancel { background: #F5F5F5; }
.btn.cancel text { color: #666; }
.btn.confirm { background: #4F9A42; }
.btn.confirm text { color: #FFF; }
.empty-hint { text-align: center; padding: 120rpx 0; color: #999; }
</style>