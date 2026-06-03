<template>
<view class="login-container">
  <view class="logo-section">
    <view class="logo-icon">🏪</view>
    <text class="title">商家端登录</text>
    <text class="subtitle">大研菜场</text>
  </view>

  <view class="form-section">
    <view class="input-group">
      <text class="label">手机号</text>
      <input
        class="input"
        type="number"
        v-model="phone"
        placeholder="请输入手机号"
        maxlength="11"
      />
    </view>

    <view class="input-group">
      <text class="label">密码</text>
      <input
        class="input"
        password
        v-model="password"
        placeholder="请输入密码"
      />
    </view>

    <button class="btn-login" :loading="loading" @tap="handleLogin">
      登录
    </button>

    <view class="divider"><text class="divider-text">或</text></view>

    <button class="btn-test" :loading="testLoading" @tap="handleTestLogin">
      测试模式（跳过登录）
    </button>
    <text class="test-hint">仅用于查看云端已有数据，需输入已存在的 merchantId</text>
    <input
      v-if="showTestInput"
      class="test-input"
      v-model="testMerchantId"
      placeholder="请输入 merchantId"
    />
  </view>
</view>
</template>

<script>
import { login, loginAsTest } from '@/utils/auth.js'
export default {
  data() {
    return {
      phone: '',
      password: '',
      loading: false,
      testLoading: false,
      showTestInput: true,
      testMerchantId: ''
    }
  },
  methods: {
    async handleLogin() {
      if (!this.phone || this.phone.length !== 11) {
        return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      }
      if (!this.password) {
        return uni.showToast({ title: '请输入密码', icon: 'none' })
      }
      this.loading = true
      try {
        await login(this.phone, this.password)
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
      } catch (e) {
        uni.showToast({ title: e.msg || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    handleTestLogin() {
      const id = (this.testMerchantId || '').trim()
      if (!id) {
        return uni.showToast({ title: '请输入 merchantId', icon: 'none' })
      }
      this.testLoading = true
      try {
        loginAsTest(id)
        uni.showToast({ title: '已进入测试模式', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
      } finally {
        this.testLoading = false
      }
    }
  }
}
</script>

<style>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #528A59 0%, #2D5A27 100%);
  padding: 120rpx 50rpx;
}
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}
.logo-icon {
  width: 160rpx;
  height: 160rpx;
  background: #fff;
  border-radius: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80rpx;
  margin-bottom: 30rpx;
}
.title {
  font-size: 44rpx;
  color: #fff;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.subtitle {
  font-size: 26rpx;
  color: rgba(255,255,255,0.8);
}
.form-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 50rpx 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1);
}
.input-group {
  margin-bottom: 36rpx;
}
.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}
.input {
  height: 80rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}
.btn-login {
  height: 88rpx;
  background: linear-gradient(135deg, #528A59 0%, #2D5A27 100%);
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20rpx;
}
.divider {
  display: flex;
  align-items: center;
  margin: 40rpx 0 20rpx;
}
.divider-text {
  font-size: 24rpx;
  color: #999;
  margin: 0 auto;
}
.btn-test {
  height: 80rpx;
  background: #F5F1EB;
  color: #666;
  border-radius: 40rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.test-hint {
  display: block;
  font-size: 22rpx;
  color: #999;
  text-align: center;
  margin-top: 12rpx;
  margin-bottom: 12rpx;
}
.test-input {
  height: 70rpx;
  border: 2rpx dashed #ccc;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  margin-top: 8rpx;
}
</style>
