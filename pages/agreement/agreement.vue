<template>
  <view class="agreement-page">
    <view class="tab-bar">
      <view
        class="tab"
        :class="{ active: currentTab === 'user' }"
        @tap="switchTab('user')"
      >
        <text>用户协议</text>
      </view>
      <view
        class="tab"
        :class="{ active: currentTab === 'privacy' }"
        @tap="switchTab('privacy')"
      >
        <text>隐私政策</text>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <view class="content" v-if="currentTab === 'user'">
        <text class="title">大研菜场用户服务协议</text>
        <text class="update-time">最后更新日期：2026年6月3日</text>

        <text class="section-title">一、服务说明</text>
        <text class="paragraph">大研菜场（以下简称"本平台"）是一款提供生鲜商品购买、配送及社区邻里交流服务的微信小程序。在使用本平台服务前，请仔细阅读本协议全部条款。一旦您注册、使用或以任何方式使用本平台服务，即视为您已充分理解、知悉并同意本协议全部内容。</text>

        <text class="section-title">二、用户注册与账户安全</text>
        <text class="paragraph">2.1 您需要通过手机号码完成注册，并保证所提供的手机号真实有效。手机号将作为您在本平台的唯一身份标识。</text>
        <text class="paragraph">2.2 您应妥善保管账户信息，因您主动泄露或未尽妥善保管义务造成的损失，本平台不承担责任。</text>
        <text class="paragraph">2.3 如发现账户被他人盗用或存在其他安全漏洞，请立即联系客服，本平台将协助您采取相应措施。</text>

        <text class="section-title">三、用户行为规范</text>
        <text class="paragraph">3.1 您在使用本平台服务时应遵守国家法律法规，不得利用本平台从事违法违规活动。</text>
        <text class="paragraph">3.2 在邻里社区发布内容时，您应确保所发布的内容真实、合法，不得发布含有：</text>
        <text class="paragraph">　• 违反国家法律法规的内容</text>
        <text class="paragraph">　• 虚假、欺诈、诱导性信息</text>
        <text class="paragraph">　• 淫秽、暴力、血腥、低俗内容</text>
        <text class="paragraph">　• 侵犯他人知识产权、隐私权等合法权益的内容</text>
        <text class="paragraph">　• 商业广告、垃圾信息</text>
        <text class="paragraph">3.3 您应遵守诚实信用原则，不得恶意下单、恶意退款、恶意评价，扰乱平台正常经营秩序。</text>

        <text class="section-title">四、商品与订单</text>
        <text class="paragraph">4.1 本平台所售商品价格、规格、库存等信息以商品详情页实际展示为准。</text>
        <text class="paragraph">4.2 订单提交后，系统将自动为您预留库存。付款完成后，订单进入待配送状态。</text>
        <text class="paragraph">4.3 商品质量、缺斤少两等问题，请在收到商品后24小时内联系客服处理。</text>
        <text class="paragraph">4.4 自提订单请在约定时间前往指定地点提取；配送订单请保持电话畅通。</text>

        <text class="section-title">五、知识产权</text>
        <text class="paragraph">本平台提供的所有内容（包括但不限于文字、图片、音频、视频、软件、界面设计）的知识产权归本平台或相关权利人所有。未经权利人书面许可，您不得以任何形式复制、传播、修改或用于商业目的。</text>

        <text class="section-title">六、免责声明</text>
        <text class="paragraph">6.1 因不可抗力（包括但不限于自然灾害、网络故障、政策调整）导致本平台无法正常服务的，本平台不承担责任。</text>
        <text class="paragraph">6.2 因您自身原因（包括但不限于地址错误、电话不通、超时未取）造成的损失，由您自行承担。</text>

        <text class="section-title">七、协议变更与终止</text>
        <text class="paragraph">7.1 本平台有权根据业务发展需要对本协议进行修改，修改后的协议将在本平台公示。</text>
        <text class="paragraph">7.2 如您不同意修改后的协议，可停止使用本平台服务；继续使用视为接受修改。</text>
        <text class="paragraph">7.3 您严重违反本协议时，本平台有权暂停或终止您的账户。</text>

        <text class="section-title">八、适用法律与争议解决</text>
        <text class="paragraph">本协议适用中华人民共和国法律。因本协议产生的争议，双方应友好协商解决；协商不成的，提交本平台运营方所在地有管辖权的人民法院诉讼解决。</text>

        <text class="section-title">九、联系我们</text>
        <text class="paragraph">如您对本协议有任何疑问，可通过以下方式联系我们：</text>
        <text class="paragraph">客服电话：400-XXX-XXXX</text>
        <text class="paragraph">客服工作时间：每日 9:00 - 21:00</text>
      </view>

      <view class="content" v-else>
        <text class="title">大研菜场隐私政策</text>
        <text class="update-time">最后更新日期：2026年6月3日</text>

        <text class="section-title">一、引言</text>
        <text class="paragraph">大研菜场（以下简称"我们"）非常重视您的个人信息安全。我们根据《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》等相关法律法规，制定本《隐私政策》并严格遵守。</text>
        <text class="paragraph">本政策将帮助您了解以下内容：</text>
        <text class="paragraph">　• 我们收集哪些信息</text>
        <text class="paragraph">　• 我们如何使用这些信息</text>
        <text class="paragraph">　• 我们如何共享、存储和保护这些信息</text>
        <text class="paragraph">　• 您享有的权利</text>

        <text class="section-title">二、我们收集的信息</text>
        <text class="paragraph">2.1 账户信息：手机号码（用于注册和身份验证）、微信昵称和头像（仅当您授权时获取）。</text>
        <text class="paragraph">2.2 订单信息：收货人姓名、收货地址、联系电话、订单详情（购买的商品、价格、数量、支付方式）。</text>
        <text class="paragraph">2.3 位置信息：当您使用"附近小区"或配送相关功能时，我们会获取您的位置信息（需您明确授权）。</text>
        <text class="paragraph">2.4 邻里社区内容：您主动发布的帖子文字、图片、评论。</text>
        <text class="paragraph">2.5 设备与日志信息：设备型号、操作系统版本、微信版本、访问时间、访问页面，用于故障诊断和安全保护。</text>

        <text class="section-title">三、信息使用方式</text>
        <text class="paragraph">3.1 为您提供商品展示、订单生成、支付、配送、售后等核心服务。</text>
        <text class="paragraph">3.2 向您推送订单状态变更通知（需您授权订阅消息）。</text>
        <text class="paragraph">3.3 优化商品推荐、改进服务质量、进行数据分析。</text>
        <text class="paragraph">3.4 进行内容安全审核、防范欺诈、维护平台安全秩序。</text>
        <text class="paragraph">3.5 处理您的咨询、投诉与建议。</text>

        <text class="section-title">四、信息共享</text>
        <text class="paragraph">4.1 商家：为完成订单配送，我们会向商家共享订单中的必要信息（商品、地址、联系电话）。</text>
        <text class="paragraph">4.2 骑手：为完成配送服务，我们会向骑手共享配送地址、联系电话及位置信息。</text>
        <text class="paragraph">4.3 云服务提供商：我们在腾讯云开发（CloudBase）平台部署服务，您的数据存储在该平台，受其安全体系保护。</text>
        <text class="paragraph">4.4 法律法规要求：除非获得您的明确同意，我们不会向第三方共享您的个人信息；除非法律法规、政府主管部门要求。</text>

        <text class="section-title">五、信息存储与保护</text>
        <text class="paragraph">5.1 您的个人信息存储在中华人民共和国境内的服务器。</text>
        <text class="paragraph">5.2 我们采用行业通行的加密传输（HTTPS）、访问控制、数据脱敏等多重安全措施保护您的个人信息。</text>
        <text class="paragraph">5.3 涉及身份证照片等敏感信息时，仅在认证审核环节使用，审核完成后按法规要求定期清理。</text>
        <text class="paragraph">5.4 当您注销账户或停止使用我们的服务后，我们将在合理期限内删除您的个人信息，法律另有规定的除外。</text>

        <text class="section-title">六、您的权利</text>
        <text class="paragraph">6.1 查询与访问：您可在"我的"页面查看订单、地址等个人信息。</text>
        <text class="paragraph">6.2 更正与删除：您可在"地址管理"中修改或删除收货地址。</text>
        <text class="paragraph">6.3 撤回授权：您可在微信"设置-小程序"中关闭位置、相册等授权。</text>
        <text class="paragraph">6.4 注销账户：您可通过客服申请注销账户，注销后您的信息将按法规要求处理。</text>

        <text class="section-title">七、未成年人保护</text>
        <text class="paragraph">本平台不面向未满14周岁的未成年人提供服务。如您是未成年人，请在监护人同意下使用本平台服务。</text>

        <text class="section-title">八、政策更新</text>
        <text class="paragraph">我们可能根据业务调整、法律法规变化更新本政策。更新后的政策将在本平台公示，重大变更将通过订单消息等方式通知您。</text>

        <text class="section-title">九、联系我们</text>
        <text class="paragraph">如您对本政策或您的个人信息有任何疑问、意见或建议，可通过以下方式联系我们：</text>
        <text class="paragraph">客服电话：400-XXX-XXXX</text>
        <text class="paragraph">客服工作时间：每日 9:00 - 21:00</text>

        <text class="paragraph emphasis">我们承诺严格保护您的个人信息安全，感谢您选择大研菜场。</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      currentTab: 'user'
    }
  },
  onLoad(options) {
    if (options && options.type === 'privacy') {
      this.currentTab = 'privacy'
      uni.setNavigationBarTitle({ title: '隐私政策' })
    } else {
      uni.setNavigationBarTitle({ title: '用户协议' })
    }
  },
  methods: {
    switchTab(type) {
      this.currentTab = type
      uni.setNavigationBarTitle({
        title: type === 'user' ? '用户协议' : '隐私政策'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.agreement-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #FFFFFF;
}

.tab-bar {
  display: flex;
  height: 88rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid #EFEFEF;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tab text {
  font-size: 30rpx;
  color: #666666;
}

.tab.active text {
  color: #00C853;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background-color: #00C853;
  border-radius: 2rpx;
}

.content-scroll {
  flex: 1;
  padding: 32rpx 40rpx;
}

.content {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 40rpx;
  font-weight: 600;
  color: #222222;
  margin-bottom: 16rpx;
  text-align: center;
}

.update-time {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 48rpx;
  text-align: center;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #222222;
  margin-top: 32rpx;
  margin-bottom: 16rpx;
}

.paragraph {
  font-size: 28rpx;
  color: #444444;
  line-height: 1.8;
  margin-bottom: 12rpx;
}

.emphasis {
  font-size: 28rpx;
  color: #00C853;
  font-weight: 500;
  margin-top: 32rpx;
  text-align: center;
}
</style>
