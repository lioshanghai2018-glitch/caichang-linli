<template>
<view class="login-container">
  <view class="logo-section">
    <view class="logo-icon">🥬</view>
    <text class="title">买菜用户端</text>
    <text class="subtitle">新鲜直达 · 邻里同享</text>
  </view>

  <view class="form-section">
    <!-- #ifdef H5 || APP-PLUS -->
    <view class="tab-bar">
      <view class="tab" :class="{active: mode === 'sms'}" @tap="mode = 'sms'">
        <text>手机号登录</text>
      </view>
      <view class="tab" :class="{active: mode === 'test'}" @tap="mode = 'test'">
        <text>测试模式</text>
      </view>
    </view>

    <block v-if="mode === 'sms'">
      <view class="input-group">
        <text class="label">手机号</text>
        <view class="phone-row">
          <input class="input" type="number" v-model="phone" placeholder="请输入手机号" maxlength="11" />
          <view class="btn-sms" @tap="handleSendSms">
            <text>{{smsCountdown > 0 ? smsCountdown + 's' : '获取验证码'}}</text>
          </view>
        </view>
      </view>
      <view class="input-group">
        <text class="label">验证码</text>
        <input class="input" type="number" v-model="code" placeholder="请输入验证码" maxlength="6" />
      </view>
      <button class="btn-login" :loading="loading" @tap="handleSmsLogin">登录</button>

      <!-- #ifdef APP-PLUS -->
      <view class="divider"><text class="divider-text">本机号码一键登录</text></view>
      <button class="btn-oneclick" :loading="oneClickLoading" @tap="handleOneClick">本机号码一键登录</button>
      <!-- #endif -->
    </block>

    <block v-else>
      <text class="test-hint">仅用于查看云端已有数据。开发期使用。</text>
      <view class="input-group">
        <text class="label">userId（可选）</text>
        <input class="input" v-model="testUserId" placeholder="留空自动生成" />
      </view>
      <button class="btn-login" :loading="testLoading" @tap="handleTestLogin">进入测试模式</button>
    </block>
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <view class="input-group">
      <text class="label">手机号</text>
      <view class="phone-row">
        <input class="input" type="number" v-model="phone" placeholder="请输入手机号" maxlength="11" />
        <view class="btn-sms" @tap="handleSendSms">
          <text>{{smsCountdown > 0 ? smsCountdown + 's' : '获取验证码'}}</text>
        </view>
      </view>
    </view>
    <view class="input-group">
      <text class="label">验证码</text>
      <input class="input" type="number" v-model="code" placeholder="请输入验证码" maxlength="6" />
    </view>
    <button class="btn-login" :loading="loading" @tap="handleSmsLogin">登录</button>
    <!-- #endif -->
  </view>

  <view class="footer">
    <text>登录即视为同意</text>
    <navigator url="/pages/agreement/agreement?type=user" class="link">《用户协议》</navigator>
    <text>与</text>
    <navigator url="/pages/agreement/agreement?type=privacy" class="link">《隐私政策》</navigator>
  </view>
</view>
</template>

<script>
// #ifdef H5 || APP-PLUS
import { loginAsTest } from '@/utils/auth.js'
// #endif
import { loginBySms, sendSmsCode, loginByUniverify } from '@/utils/auth.js'

export default {
  data() {
    return {
      mode: 'sms',
      phone: '',
      code: '',
      loading: false,
      // #ifdef H5 || APP-PLUS
      testLoading: false,
      testUserId: '',
      // #endif
      oneClickLoading: false,
      smsCountdown: 0,
      _smsTimer: null
    }
  },
  onUnload() {
    if (this._smsTimer) clearInterval(this._smsTimer)
  },
  methods: {
    async handleSendSms() {
      if (!this.phone || this.phone.length !== 11) {
        return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      }
      if (this.smsCountdown > 0) return
      try {
        await sendSmsCode(this.phone)
        uni.showToast({ title: '已发送', icon: 'success' })
        this.smsCountdown = 60
        this._smsTimer = setInterval(() => {
          this.smsCountdown--
          if (this.smsCountdown <= 0 && this._smsTimer) {
            clearInterval(this._smsTimer)
            this._smsTimer = null
          }
        }, 1000)
      } catch (e) {
        uni.showToast({ title: e.msg || '发送失败', icon: 'none' })
      }
    },
    async handleSmsLogin() {
      if (!this.phone || this.phone.length !== 11) {
        return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      }
      if (!this.code || this.code.length < 4) {
        return uni.showToast({ title: '请输入验证码', icon: 'none' })
      }
      this.loading = true
      try {
        await loginBySms(this.phone, this.code)
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
      } catch (e) {
        uni.showToast({ title: e.msg || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    // #ifdef H5 || APP-PLUS
    async handleOneClick() {
      this.oneClickLoading = true
      try {
        await loginByUniverify()
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
      } catch (e) {
        uni.showToast({ title: e.msg || '一键登录失败', icon: 'none' })
      } finally {
        this.oneClickLoading = false
      }
    },
    handleTestLogin() {
      this.testLoading = true
      try {
        loginAsTest(this.testUserId)
        uni.showToast({ title: '已进入测试模式', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800)
      } finally {
        this.testLoading = false
      }
    }
    // #endif
  }
}
</script>

<style>
.login-container {
  min-height: 100vh;
  background: #F5F1EB;
  padding: 100rpx 50rpx 50rpx;
}
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
}
.logo-icon {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  border-radius: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80rpx;
  margin-bottom: 30rpx;
}
.title {
  font-size: 44rpx;
  color: #2D5A27;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.subtitle {
  font-size: 24rpx;
  color: #666;
}
.form-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.tab-bar {
  display: flex;
  background: #F5F5F5;
  border-radius: 12rpx;
  padding: 6rpx;
  margin-bottom: 36rpx;
}
.tab {
  flex: 1;
  padding: 16rpx 0;
  text-align: center;
  border-radius: 8rpx;
}
.tab text {
  font-size: 26rpx;
  color: #666;
}
.tab.active {
  background: #fff;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
}
.tab.active text {
  color: #2D5A27;
  font-weight: 500;
}
.input-group {
  margin-bottom: 28rpx;
}
.label {
  display: block;
  font-size: 26rpx;
  color: #333;
  margin-bottom: 10rpx;
}
.input {
  height: 80rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: #FAFAFA;
}
.phone-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
}
.phone-row .input {
  flex: 1;
}
.btn-sms {
  height: 80rpx;
  padding: 0 20rpx;
  background: #E8F5E9;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
}
.btn-sms text {
  font-size: 24rpx;
  color: #2D5A27;
  white-space: nowrap;
}
.btn-login {
  height: 88rpx;
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20rpx;
}
.btn-oneclick {
  height: 80rpx;
  background: #fff;
  color: #2D5A27;
  border: 2rpx solid #2D5A27;
  border-radius: 40rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.divider {
  display: flex;
  align-items: center;
  margin: 30rpx 0 20rpx;
}
.divider-text {
  font-size: 24rpx;
  color: #999;
  margin: 0 auto;
}
.test-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 22rpx;
  color: #999;
  text-align: center;
  margin-top: 40rpx;
}
.footer .link {
  color: #2D5A27;
  text-decoration: underline;
  margin: 0 4rpx;
}
</style>
