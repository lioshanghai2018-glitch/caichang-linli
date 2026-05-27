<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="back-btn" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">{{ isEdit ? '编辑地址' : '新增地址' }}</text>
    </view>

    <!-- 表单区域 -->
    <view class="form-section">
      <!-- 收货人 -->
      <view class="form-item">
        <view class="form-label">收货人</view>
        <input class="form-input" type="text" v-model="form.name" placeholder="请输入收货人姓名" placeholder-class="input-placeholder" />
      </view>
      <view class="form-divider"></view>

      <!-- 手机号 -->
      <view class="form-item">
        <view class="form-label">手机号</view>
        <input class="form-input" type="number" v-model="form.phone" placeholder="请输入手机号" maxlength="11" placeholder-class="input-placeholder" />
      </view>
      <view class="form-divider"></view>

      <!-- 收货地址 -->
      <view class="form-item" @tap="showCommunityPicker">
        <view class="form-label">收货小区</view>
        <view class="form-input address-input">
          <text :class="form.address ? 'address-text' : 'input-placeholder'">{{ form.address || '请选择小区' }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="form-divider"></view>

      <!-- 门牌号 -->
      <view class="form-item">
        <view class="form-label">门牌号</view>
        <input class="form-input" type="text" v-model="form.doorNo" placeholder="请输入详细地址（楼栋/单元/门牌）" placeholder-class="input-placeholder" />
      </view>
      <view class="form-divider"></view>

      <!-- 设为默认 -->
      <view class="form-item switch-item">
        <view class="form-label">设为默认地址</view>
        <switch class="default-switch" :checked="form.isDefault" @change="onSwitchChange" color="#4F9A42" />
      </view>
    </view>

    <!-- 底部保存按钮 -->
    <view class="bottom-bar">
      <view class="save-btn" @tap="saveAddress">
        <text class="save-btn-text">保存</text>
      </view>
    </view>
  </view>
</template>

<script>
import { saveAddress, getAddressList } from '@/utils/address.js'

export default {
  data() {
    return {
      isEdit: false,
      form: {
        id: '',
        name: '',
        phone: '',
        address: '',
        doorNo: '',
        isDefault: false
      },
      communityList: []
    }
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true
      const list = getAddressList()
      const addr = list.find(a => a.id === options.id)
      if (addr) {
        this.form = { ...addr }
      }
    }
    this.loadCommunities()
  },
  methods: {
    async loadCommunities() {
      try {
        const res = await uni.request({
          url: 'https://fc-mp-ae9bd108-da40-4ae6-923b-c3007dedec12.next.bspapp.com/merchant-api/getCommunities',
          method: 'POST',
          data: { method: 'getCommunities', params: {} }
        })
        if (res.data && res.data.code === 0) {
          this.communityList = (res.data.data || []).map(c => c.name)
        }
      } catch (e) {
        console.error('获取小区列表失败:', e)
      }
    },
    goBack() {
      uni.navigateBack()
    },
    showCommunityPicker() {
      const list = this.communityList;
      uni.showActionSheet({
        itemList: list,
        success: (res) => {
          this.form.address = list[res.tapIndex];
        }
      })
    },
    onSwitchChange(e) {
      this.form.isDefault = e.detail.value
    },
    saveAddress() {
      if (!this.form.name.trim()) {
        uni.showToast({ title: '请输入收货人', icon: 'none' })
        return
      }
      if (!this.form.phone.trim() || this.form.phone.length !== 11) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return
      }
      if (!this.form.address.trim()) {
        uni.showToast({ title: '请选择收货地址', icon: 'none' })
        return
      }
      if (!this.form.doorNo.trim()) {
        uni.showToast({ title: '请输入门牌号', icon: 'none' })
        return
      }
      saveAddress(this.form)
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background-color: #F5F1EB;
  padding-bottom: 140rpx;
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
  font-weight: 300;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
  margin-right: 56rpx;
}

.form-section {
  background-color: #FFFFFF;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 0 24rpx;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
}

.form-label {
  font-size: 30rpx;
  color: #333;
  width: 160rpx;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 30rpx;
  color: #333;
  height: 48rpx;
  line-height: 48rpx;
}

.input-placeholder {
  font-size: 30rpx;
  color: #CCC;
}

.address-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.address-text {
  font-size: 30rpx;
  color: #333;
}

.arrow {
  font-size: 32rpx;
  color: #CCC;
}

.form-divider {
  height: 1rpx;
  background-color: #F0F0F0;
}

.switch-item {
  justify-content: space-between;
}

.default-switch {
  transform: scale(0.8);
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  background-color: #FFFFFF;
  border-top: 1rpx solid #E8E8E8;
}

.save-btn {
  background-color: #4F9A42;
  border-radius: 40rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>