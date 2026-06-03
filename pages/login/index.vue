<template>
  <view class="login-container">
    <view class="logo-section">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="title">配送员登录</text>
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

      <button class="btn-login" type="primary" :loading="loading" @click="handleLogin">
        登录
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import riderApi from '../../api/rider'

const phone = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!phone.value || phone.value.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await riderApi.login(phone.value, password.value)
    const info = res.data || {}
    // merchantId/phone 都在嵌套的 info.riderInfo 里（云对象登录返回结构）
    let merchantId = info.merchantId || info.riderInfo?.merchantId
    const riderPhone = info.phone || info.riderInfo?.phone || phone.value
    // 兜底：老骑手账号可能没绑 merchantId，登录后自动反推
    if (riderPhone && !merchantId) {
      try {
        const fixRes = await riderApi.fixRiderMerchantId(riderPhone)
        if (fixRes && fixRes.data && fixRes.data.merchantId) {
          merchantId = fixRes.data.merchantId
        }
      } catch (e) { /* ignore */ }
    }
    if (merchantId) {
      info.merchantId = merchantId
      info.riderInfo = info.riderInfo || {}
      info.riderInfo.merchantId = merchantId
    }
    uni.setStorageSync('riderInfo', info)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/pending/index' })
    }, 1000)
  } catch (e) {
    console.error('登录失败:', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  padding: 100rpx 50rpx;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  background: #fff;
  border-radius: 80rpx;
  margin-bottom: 30rpx;
}

.title {
  font-size: 48rpx;
  color: #fff;
  font-weight: bold;
}

.form-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 50rpx 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1);
}

.input-group {
  margin-bottom: 40rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 15rpx;
}

.input {
  height: 80rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.btn-login {
  height: 90rpx;
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  color: #fff;
  border-radius: 45rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30rpx;
}
</style>