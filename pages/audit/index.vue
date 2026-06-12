<template>
<view class="page">
  <!-- 一级 tab 栏（仿用户端订单页 .tab-bar） -->
  <view class="tab-bar">
    <view
      v-for="(t, i) in mainTabs"
      :key="i"
      class="tab-item"
      :class="{ active: currentTab === i }"
      @tap="switchMain(i)"
    >
      <text>{{ t }}</text>
    </view>
  </view>

  <!-- 二级状态 tabs（仅认证/帖子 tab 显示） -->
  <view class="status-tabs" v-if="currentTab < 2">
    <view
      v-for="tab in currentStatusTabs"
      :key="tab.key"
      class="status-tab"
      :class="{ active: currentStatus === tab.key }"
      @tap="switchStatus(tab.key)"
    >
      <text class="status-tab-text">{{ tab.label }}</text>
      <view class="tab-badge" v-if="tab.count > 0">
        <text>{{ tab.count > 99 ? '99+' : tab.count }}</text>
      </view>
    </view>
  </view>

  <!-- 搜索框（仅认证/帖子 tab 显示） -->
  <view class="search-bar" v-if="currentTab < 2">
    <input
      class="search-input"
      v-model="searchKeyword"
      :placeholder="searchPlaceholder"
      confirm-type="search"
      @confirm="onSearch"
      @input="onSearchInput"
    />
    <text class="search-icon" @tap="onSearch">🔍</text>
    <text v-if="searchKeyword" class="search-clear" @tap="onSearchClear">✕</text>
  </view>

  <!-- 列表：认证 -->
  <scroll-view
    v-if="currentTab === 0"
    class="audit-list"
    scroll-y
    @scrolltolower="loadMore"
  >
    <view
      v-for="(item, idx) in certList"
      :key="idx"
      class="audit-card"
      @tap="openDetail(item, 0)"
    >
      <view class="card-header">
        <text class="card-title">{{ item.userName || item.name || '未知用户' }}</text>
        <view class="status-chip" :style="getCertStyle(item.status)">
          <text>{{ STATUS_STYLE[item.status] ? STATUS_STYLE[item.status].text : (item.status || '-') }}</text>
        </view>
      </view>
      <view class="card-body">
        <view class="info-row">
          <text class="info-label">手机号</text>
          <text class="info-value">{{ item.phone || '-' }}</text>
        </view>
        <view class="info-row" v-if="item.communityName">
          <text class="info-label">小区</text>
          <text class="info-value">{{ item.communityName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">提交时间</text>
          <text class="info-value">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="info-row" v-if="item.reviewedAt">
          <text class="info-label">审核时间</text>
          <text class="info-value">{{ formatTime(item.reviewedAt) }}</text>
        </view>
        <view class="info-row reject-reason" v-if="item.status === 'rejected' && item.rejectReason">
          <text class="info-label">拒绝原因</text>
          <text class="info-value">{{ item.rejectReason }}</text>
        </view>
      </view>
      <view v-if="item.status !== 'pending'" class="card-actions">
        <view class="quick-btn quick-revoke" @tap.stop="quickRevoke(item)">
          <text>撤销</text>
        </view>
      </view>
    </view>

    <view class="load-more" v-if="certList.length > 0">
      <text v-if="loading">加载中…</text>
      <text v-else-if="noMore">没有更多了</text>
      <text v-else @tap="loadMore">加载更多</text>
    </view>

    <view class="empty-state" v-if="certList.length === 0 && !loading">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无认证记录</text>
    </view>
  </scroll-view>

  <!-- 列表：帖子 -->
  <scroll-view
    v-else-if="currentTab === 1"
    class="audit-list"
    scroll-y
    @scrolltolower="loadMore"
  >
    <view
      v-for="(item, idx) in postList"
      :key="idx"
      class="audit-card"
      @tap="openDetail(item, 1)"
    >
      <view class="card-header">
        <text class="card-title">{{ item.title || '(无标题)' }}</text>
        <view class="status-chip" :style="getPostStyle(item.status)">
          <text>{{ POST_STATUS_STYLE[item.status] ? POST_STATUS_STYLE[item.status].text : (item.status || '-') }}</text>
        </view>
      </view>
      <view class="card-body">
        <text class="post-content">{{ item.content }}</text>
        <view class="thumbs" v-if="Array.isArray(item.images) && item.images.length">
          <image
            v-for="(img, ii) in item.images.slice(0, 3)"
            :key="ii"
            :src="img"
            mode="aspectFill"
            class="thumb"
            @error="(e) => console.error('[audit] thumb load failed', img, e)"
          />
        </view>
      </view>
      <view class="card-footer">
        <text class="meta">{{ item.authorName || '匿名' }} · {{ formatTime(item.createdAt) }}</text>
        <view class="meta-stats" v-if="item.likeCount || item.commentCount">
          <text class="meta-stat" v-if="item.likeCount">♡ {{ item.likeCount }}</text>
          <text class="meta-stat" v-if="item.commentCount">💬 {{ item.commentCount }}</text>
        </view>
      </view>
    </view>

    <view class="load-more" v-if="postList.length > 0">
      <text v-if="loading">加载中…</text>
      <text v-else-if="noMore">没有更多了</text>
      <text v-else @tap="loadMore">加载更多</text>
    </view>

    <view class="empty-state" v-if="postList.length === 0 && !loading">
      <text class="empty-icon">📝</text>
      <text class="empty-text">暂无帖子</text>
    </view>
  </scroll-view>

  <!-- 列表：分类管理 -->
  <scroll-view
    v-else-if="currentTab === 2"
    class="audit-list"
    scroll-y
  >
    <view class="cat-add-bar">
      <input
        class="cat-input"
        v-model="newCategoryName"
        placeholder="输入新分类名(最多20字)"
        maxlength="20"
        confirm-type="done"
        @confirm="onAddCategory"
      />
      <view class="cat-add-btn" @tap="onAddCategory">
        <text>+ 新增</text>
      </view>
    </view>

    <view
      v-for="(cat, idx) in categoryList"
      :key="cat._id"
      class="cat-card"
    >
      <view class="cat-index">
        <text>{{ cat.index || (idx + 1) }}</text>
      </view>
      <view class="cat-info">
        <text class="cat-name">{{ cat.name }}</text>
        <text class="cat-meta">排序:{{ cat.sort || 0 }} · 编号:#{{ cat._id.slice(-6) }}</text>
      </view>
      <view class="cat-actions">
        <view class="cat-btn cat-btn-edit" @tap="onEditCategory(cat)">
          <text>编辑</text>
        </view>
        <view class="cat-btn cat-btn-del" @tap="onDeleteCategory(cat)">
          <text>删除</text>
        </view>
      </view>
    </view>

    <view class="load-more" v-if="categoryLoading">
      <text>加载中…</text>
    </view>

    <view class="empty-state" v-if="categoryList.length === 0 && !categoryLoading">
      <text class="empty-icon">🏷</text>
      <text class="empty-text">暂无分类,点击上方新增</text>
    </view>
  </scroll-view>

  <!-- 列表：退款审核 -->
  <scroll-view
    v-else-if="currentTab === 3"
    class="audit-list"
    scroll-y
    @scrolltolower="loadMoreRefunds"
  >
    <view class="status-tabs refund-subtabs">
      <view
        v-for="t in refundStatusTabs"
        :key="t.key"
        class="status-tab"
        :class="{ active: refundStatusTab === t.key }"
        @tap="switchRefundTab(t.key)"
      >
        <text class="status-tab-text">{{ t.label }}</text>
        <view class="tab-badge" v-if="t.count > 0">
          <text>{{ t.count > 99 ? '99+' : t.count }}</text>
        </view>
      </view>
    </view>

    <view
      v-for="(r, idx) in refunds"
      :key="r._id || idx"
      class="audit-card"
      @tap="openRefundDetail(r)"
    >
      <view class="card-header">
        <text class="card-title">订单 {{ r.orderNo || r.orderId || '-' }}</text>
        <view class="status-chip" :style="getRefundStyle(r.status)">
          <text>{{ refundStatusText(r.status) }}</text>
        </view>
      </view>
      <view class="card-body">
        <view class="info-row">
          <text class="info-label">类型</text>
          <text class="info-value">{{ refundTypeText(r.type) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">用户</text>
          <text class="info-value">{{ (r.user && (r.user.nickname || r.user.phone)) || '匿名' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">金额</text>
          <text class="info-value price">¥{{ (r.order && r.order.totalAmount) || r.refundAmount || 0 }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">原因</text>
          <text class="info-value ellipsis-2">{{ r.reason || '-' }}</text>
        </view>
        <view class="info-row" v-if="r.images && r.images.length">
          <text class="info-label">凭证</text>
          <text class="info-value">{{ r.images.length }} 张图片</text>
        </view>
        <view class="info-row">
          <text class="info-label">提交时间</text>
          <text class="info-value">{{ formatTime(r.createdAt) }}</text>
        </view>
        <view class="info-row reject-reason" v-if="r.status === 'rejected' && r.rejectReason">
          <text class="info-label">拒绝原因</text>
          <text class="info-value">{{ r.rejectReason }}</text>
        </view>
      </view>
    </view>

    <view class="load-more" v-if="refunds.length > 0 && refundLoading">
      <text>加载中…</text>
    </view>

    <view class="empty-state" v-if="refunds.length === 0 && !refundLoading">
      <text class="empty-icon">💸</text>
      <text class="empty-text">暂无退款申请</text>
    </view>
  </scroll-view>

  <!-- 详情弹窗（外壳共用，内部 v-if 切两套 body / footer） -->
  <view v-if="showDetail" class="popup-mask" @tap="closeDetail">
    <view class="popup-content" @tap.stop>
      <view class="popup-header">
        <text class="popup-title">{{ currentTab === 0 ? '认证详情' : '帖子详情' }}</text>
        <text class="popup-close" @tap="closeDetail">✕</text>
      </view>

      <scroll-view class="popup-body" scroll-y>
        <!-- 认证详情 body -->
        <block v-if="currentTab === 0">
          <view class="detail-section">
            <view class="detail-row">
              <text class="detail-label">姓名</text>
              <text class="detail-value">{{ currentCert.userName || currentCert.name || '-' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">手机号</text>
              <text class="detail-value">{{ currentCert.phone || '-' }}</text>
            </view>
            <view class="detail-row" v-if="currentCert.communityName">
              <text class="detail-label">小区</text>
              <text class="detail-value">{{ currentCert.communityName }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">提交时间</text>
              <text class="detail-value">{{ formatTime(currentCert.createdAt) }}</text>
            </view>
            <view class="detail-row" v-if="currentCert.reviewedAt">
              <text class="detail-label">审核时间</text>
              <text class="detail-value">{{ formatTime(currentCert.reviewedAt) }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">状态</text>
              <view class="status-chip" :style="getCertStyle(currentCert.status)">
                <text>{{ STATUS_STYLE[currentCert.status] ? STATUS_STYLE[currentCert.status].text : (currentCert.status || '-') }}</text>
              </view>
            </view>
          </view>

          <view class="detail-section">
            <text class="section-title">地址证明（账单）</text>
            <image
              v-if="isValidImageUrl(currentCert.billUrl)"
              class="cert-image"
              :src="currentCert.billUrl"
              mode="aspectFit"
              @tap="previewImage(currentCert.billUrl)"
              @error="(e) => onImageError('bill', currentCert.billUrl, e)"
            />
            <view v-else class="image-placeholder">
              <text class="placeholder-icon">🖼</text>
              <text class="placeholder-text">{{ getImagePlaceholderText(currentCert.billUrl, '账单') }}</text>
              <view v-if="currentCert.billUrl && currentCert.billUrl.startsWith('cloud://')" class="retry-btn" @tap="retryResolveCert">
                <text>重新解析图片</text>
              </view>
            </view>
          </view>

          <view class="detail-section" v-if="currentCert.status === 'rejected' && currentCert.rejectReason">
            <text class="section-title">拒绝原因</text>
            <text class="reject-text">{{ currentCert.rejectReason }}</text>
          </view>

          <view v-if="currentCert.status === 'pending'" class="action-section">
            <text class="action-label">拒绝原因（可选）</text>
            <textarea
              class="reject-input"
              v-model="rejectReason"
              placeholder="留空使用默认原因"
              maxlength="200"
            />
          </view>
        </block>

        <!-- 帖子详情 body -->
        <block v-else>
          <view class="detail-section">
            <view class="detail-row">
              <text class="detail-label">作者</text>
              <text class="detail-value">{{ currentPost.authorName || '匿名' }}</text>
            </view>
            <view class="detail-row" v-if="currentPost.contactPhone">
              <text class="detail-label">电话</text>
              <text class="detail-value">{{ currentPost.contactPhone }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">分类</text>
              <text class="detail-value">{{ currentPost.category || '-' }}</text>
            </view>
            <view class="detail-row" v-if="currentPost.price">
              <text class="detail-label">价格</text>
              <text class="detail-value">¥{{ currentPost.price }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">发布时间</text>
              <text class="detail-value">{{ formatTime(currentPost.createdAt) }}</text>
            </view>
            <view class="detail-row" v-if="currentPost.downReason">
              <text class="detail-label">下架原因</text>
              <text class="detail-value reject-text">{{ currentPost.downReason }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">状态</text>
              <view class="status-chip" :style="getPostStyle(currentPost.status)">
                <text>{{ POST_STATUS_STYLE[currentPost.status] ? POST_STATUS_STYLE[currentPost.status].text : (currentPost.status || '-') }}</text>
              </view>
            </view>
          </view>

          <view class="detail-section">
            <text class="section-title">正文</text>
            <text class="post-content-full">{{ currentPost.content }}</text>
            <view class="image-grid" v-if="Array.isArray(currentPost.images) && currentPost.images.length">
              <image
                v-for="(img, ii) in currentPost.images"
                :key="ii"
                :src="img"
                mode="aspectFill"
                class="grid-img"
                @tap="previewImage(img)"
                @error="(e) => console.error('[audit] grid img load failed', img, e)"
              />
            </view>
          </view>
        </block>
      </scroll-view>

      <!-- 弹窗底部固定操作按钮（v-if 切两套） -->
      <view v-if="currentTab === 0" class="popup-footer">
        <block v-if="currentCert.status === 'pending'">
          <view class="btn btn-reject" @tap="confirmReview('reject')">
            <text>拒绝</text>
          </view>
          <view class="btn btn-approve" @tap="confirmReview('approve')">
            <text>通过</text>
          </view>
        </block>
        <block v-else>
          <view class="btn btn-revoke" @tap="doRevoke">
            <text>撤销认证（让用户重新提交）</text>
          </view>
        </block>
      </view>

      <view v-else class="popup-footer">
        <block v-if="currentPost.status === 'active'">
          <view class="btn btn-reject" @tap="confirmPost('offline')">
            <text>下架</text>
          </view>
          <view class="btn btn-reject-solid" @tap="confirmPost('delete')">
            <text>删除</text>
          </view>
        </block>
        <block v-else-if="currentPost.status === 'closed'">
          <view class="btn btn-approve" @tap="confirmPost('online')">
            <text>重新上架</text>
          </view>
          <view class="btn btn-reject-solid" @tap="confirmPost('delete')">
            <text>删除</text>
          </view>
        </block>
        <block v-else>
          <text class="footer-hint">已删除的帖子无法操作</text>
        </block>
      </view>
    </view>
  </view>

  <!-- 退款详情弹窗(独立 popup,跟认证/帖子 popup 互不干扰) -->
  <view v-if="refundDetail" class="popup-mask" @tap="closeRefundDetail">
    <view class="popup-content" @tap.stop>
      <view class="popup-header">
        <text class="popup-title">退款详情</text>
        <text class="popup-close" @tap="closeRefundDetail">✕</text>
      </view>

      <scroll-view class="popup-body" scroll-y>
        <view class="detail-section">
          <view class="detail-row">
            <text class="detail-label">订单号</text>
            <text class="detail-value">{{ refundDetail.orderNo || refundDetail.orderId || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">类型</text>
            <text class="detail-value">{{ refundTypeText(refundDetail.type) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">用户</text>
            <text class="detail-value">
              {{ (refundDetail.user && refundDetail.user.nickname) || '匿名' }}
              <text v-if="refundDetail.user && refundDetail.user.phone"> {{ refundDetail.user.phone }}</text>
            </text>
          </view>
          <view class="detail-row">
            <text class="detail-label">金额</text>
            <text class="detail-value price">¥{{ (refundDetail.order && refundDetail.order.totalAmount) || refundDetail.refundAmount || 0 }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">状态</text>
            <view class="status-chip" :style="getRefundStyle(refundDetail.status)">
              <text>{{ refundStatusText(refundDetail.status) }}</text>
            </view>
          </view>
          <view class="detail-row">
            <text class="detail-label">提交时间</text>
            <text class="detail-value">{{ formatTime(refundDetail.createdAt) }}</text>
          </view>
          <view class="detail-row" v-if="refundDetail.processedAt">
            <text class="detail-label">处理时间</text>
            <text class="detail-value">{{ formatTime(refundDetail.processedAt) }}</text>
          </view>
        </view>

        <view class="detail-section">
          <text class="section-title">退款理由</text>
          <text class="post-content-full">{{ refundDetail.reason || '（用户未填写）' }}</text>
        </view>

        <view class="detail-section" v-if="refundDetail.images && refundDetail.images.length">
          <text class="section-title">图片凭证（{{ refundDetail.images.length }}）</text>
          <view class="image-grid">
            <image
              v-for="(img, ii) in refundDetail.images"
              :key="ii"
              :src="img"
              mode="aspectFill"
              class="grid-img"
              @tap="previewImage(img)"
              @error="(e) => console.error('[audit/refund] image load failed', img, e)"
            />
          </view>
        </view>

        <view class="detail-section" v-if="refundDetail.status === 'rejected' && refundDetail.rejectReason">
          <text class="section-title">拒绝原因</text>
          <text class="reject-text">{{ refundDetail.rejectReason }}</text>
        </view>

        <view v-if="refundDetail.status === 'pending'" class="action-section">
          <text class="action-label">拒绝原因（选填，拒绝后将显示给用户）</text>
          <textarea
            class="reject-input"
            v-model="refundRejectReason"
            placeholder="请输入拒绝原因，留空则使用默认原因"
            maxlength="200"
            auto-height
          />
        </view>
      </scroll-view>

      <view v-if="refundDetail.status === 'pending'" class="popup-footer">
        <view class="btn btn-reject" @tap="confirmRefundAction('reject')">
          <text>拒绝</text>
        </view>
        <view class="btn btn-approve" @tap="confirmRefundAction('approve')">
          <text>通过</text>
        </view>
      </view>
      <view v-else class="popup-footer">
        <text class="footer-hint">已处理的退款无法再次操作</text>
      </view>
    </view>
  </view>
</view>
</template>

<script>
import { listCertifications, reviewCert, listAllPosts, operatePost, listNeighborCategories, createNeighborCategory, updateNeighborCategory, deleteNeighborCategory, listRefunds, processRefund } from '@/utils/api.js'

const STATUS_STYLE = {
  pending:   { text: '审核中', color: '#FF8800', bg: '#FFF3E0' },
  certified: { text: '已通过', color: '#4F9A42', bg: '#E8F5E9' },
  rejected:  { text: '已拒绝', color: '#999999', bg: '#F5F5F5' }
}

const POST_STATUS_STYLE = {
  active:  { text: '展示中', color: '#4F9A42', bg: '#E8F5E9' },
  closed:  { text: '已下架', color: '#FF6B00', bg: '#FFF3E0' },
  deleted: { text: '已删除', color: '#999999', bg: '#F5F5F5' }
}

const REFUND_STATUS_STYLE = {
  pending:   { text: '待审核', color: '#FF8800', bg: '#FFF3E0' },
  approved:  { text: '已通过', color: '#4F9A42', bg: '#E8F5E9' },
  rejected:  { text: '已拒绝', color: '#FF4444', bg: '#FFEEEE' }
}

const REFUND_TYPE_TEXT = {
  return_refund: '退货退款',
  refund_only:   '仅退款',
  exchange:      '我要换货'
}

export default {
  data() {
    return {
      STATUS_STYLE,
      POST_STATUS_STYLE,
      REFUND_STATUS_STYLE,
      currentTab: 0,
      currentStatus: 'all',
      searchKeyword: '',
      loading: false,
      noMore: false,
      page: 1,
      pageSize: 20,
      mainTabs: ['认证审核', '帖子管理', '分类管理', '退款审核'],
      certList: [],
      postList: [],
      categoryList: [],
      categoryLoading: false,
      showDetail: false,
      currentCert: {},
      currentPost: {},
      rejectReason: '',
      downReason: '',
      newCategoryName: '',
      certStatusTabs: [
        { key: 'all',       label: '全部',   count: 0 },
        { key: 'pending',   label: '审核中', count: 0 },
        { key: 'certified', label: '已通过', count: 0 },
        { key: 'rejected',  label: '已拒绝', count: 0 }
      ],
      postStatusTabs: [
        { key: 'all',     label: '全部',   count: 0 },
        { key: 'active',  label: '展示中', count: 0 },
        { key: 'closed',  label: '已下架', count: 0 },
        { key: 'deleted', label: '已删除', count: 0 }
      ],
      // 退款审核
      refunds: [],
      refundStatusTab: 'pending',
      refundStatusTabs: [
        { key: 'all',      label: '全部',   count: 0 },
        { key: 'pending',  label: '待审核', count: 0 },
        { key: 'approved', label: '已通过', count: 0 },
        { key: 'rejected', label: '已拒绝', count: 0 }
      ],
      refundDetail: null,
      refundRejectReason: '',
      refundLoading: false
    }
  },
  computed: {
    currentStatusTabs() {
      return this.currentTab === 0 ? this.certStatusTabs : this.postStatusTabs
    },
    searchPlaceholder() {
      return this.currentTab === 0 ? '搜索姓名/手机号/小区' : '搜索标题/正文/作者'
    }
  },
  onLoad() {
    this.loadList()
  },
  onShow() {
    // 退款 tab 当前在 active 时,每次进入页面都拉一次,确保新提交的能及时看到
    if (this.currentTab === 3) this.loadRefunds()
  },
  onPullDownRefresh() {
    this.page = 1
    this.noMore = false
    if (this.currentTab === 0) this.certList = []
    else if (this.currentTab === 1) this.postList = []
    if (this.currentTab === 2) {
      this.loadCategoryList().finally(() => uni.stopPullDownRefresh())
    } else if (this.currentTab === 3) {
      this.loadRefunds().finally(() => uni.stopPullDownRefresh())
    } else {
      this.loadList().finally(() => uni.stopPullDownRefresh())
    }
  },
  methods: {
    getCertStyle(s) {
      return STATUS_STYLE[s] || { text: s || '-', color: '#666', bg: '#F5F5F5' }
    },
    getPostStyle(s) {
      return POST_STATUS_STYLE[s] || { text: s || '-', color: '#666', bg: '#F5F5F5' }
    },
    getRefundStyle(s) {
      return REFUND_STATUS_STYLE[s] || { text: s || '-', color: '#666', bg: '#F5F5F5' }
    },
    refundStatusText(s) {
      return (REFUND_STATUS_STYLE[s] && REFUND_STATUS_STYLE[s].text) || s || '-'
    },
    refundTypeText(t) {
      return REFUND_TYPE_TEXT[t] || '退货退款'
    },
    formatTime(t) {
      if (!t) return '-'
      const d = new Date(t)
      if (isNaN(d.getTime())) return '-'
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    previewImage(url) {
      if (!url) return
      uni.previewImage({ current: url, urls: [url] })
    },
    isValidImageUrl(url) {
      // 必须是 http(s) 开头才能在小程序 image 组件里加载
      // cloud:// 走 resolveFileIdsInItems 后会变成 https://，http://tmp/... 是用户端设备临时路径
      return typeof url === 'string' && /^https?:\/\//.test(url)
    },
    getImagePlaceholderText(url, label) {
      if (!url) return `用户未上传${label}`
      if (url.startsWith('cloud://')) return `${label}图片未转换（请重新部署云函数）`
      if (url.startsWith('http://tmp/')) return `${label}图片上传失败（旧数据），请让用户重新提交`
      return `${label}图片地址异常：${url.slice(0, 40)}`
    },
    onImageError(field, url, e) {
      console.error(`[audit] ${field} image load failed:`, url, e)
    },

    switchMain(i) {
      if (this.currentTab === i) return
      this.currentTab = i
      this.currentStatus = 'all'
      this.searchKeyword = ''
      this.page = 1
      this.noMore = false
      this.certList = []
      this.postList = []
      this.closeDetail()
      this.closeRefundDetail()
      if (i === 2) this.loadCategoryList()
      else if (i === 3) this.loadRefunds()
      else this.loadList()
    },
    switchStatus(k) {
      if (this.currentStatus === k) return
      this.currentStatus = k
      this.page = 1
      this.noMore = false
      if (this.currentTab === 0) this.certList = []
      else this.postList = []
      this.loadList()
    },
    onSearch() {
      this.page = 1
      this.noMore = false
      if (this.currentTab === 0) this.certList = []
      else this.postList = []
      this.loadList()
    },
    onSearchInput() {
      if (this._searchTimer) clearTimeout(this._searchTimer)
      this._searchTimer = setTimeout(() => this.onSearch(), 400)
    },
    onSearchClear() {
      this.searchKeyword = ''
      this.onSearch()
    },
    loadMore() {
      if (this.noMore || this.loading) return
      this.loadList()
    },

    async loadList() {
      if (this.loading) return
      this.loading = true
      try {
        const params = {
          status: this.currentStatus,
          page: this.page,
          pageSize: this.pageSize,
          keyword: this.searchKeyword
        }
        let res, list
        if (this.currentTab === 0) {
          res = await listCertifications(params)
          list = (res.data && res.data.list) || []
          if (this.page === 1) this.certList = list
          else this.certList = this.certList.concat(list)
        } else {
          res = await listAllPosts(params)
          list = (res.data && res.data.list) || []
          if (this.page === 1) this.postList = list
          else this.postList = this.postList.concat(list)
        }
        if (list.length < this.pageSize) this.noMore = true
        this.page++
      } catch (e) {
        console.error('[audit] load failed:', e)
        const msg = e.msg || e.errMsg || (e.errCode ? `${e.errCode}: ${e.errMsg || ''}` : '') || '加载失败'
        uni.showToast({ title: msg.slice(0, 60), icon: 'none', duration: 3000 })
      } finally {
        this.loading = false
      }
    },

    openDetail(item, type) {
      if (type === 0) this.currentCert = item
      else this.currentPost = item
      this.rejectReason = ''
      this.downReason = ''
      this.showDetail = true
      console.log('[audit] openDetail full cert:', JSON.stringify(this.currentCert))
    },
    async retryResolveCert() {
      if (!this.currentCert || !this.currentCert._id) return
      uni.showLoading({ title: '重新拉取中…' })
      try {
        // 用 status: this.currentCert.status 重新拉单页，确保 resolveFileIdsInItems 再跑一遍
        const res = await listCertifications({
          status: this.currentCert.status || 'all',
          page: 1,
          pageSize: 50,
          keyword: ''
        })
        const list = (res.data && res.data.list) || []
        const found = list.find(c => c._id === this.currentCert._id)
        if (found) {
          this.currentCert = found
          uni.hideLoading()
          if (isValidImageUrl(found.billUrl)) {
            uni.showToast({ title: '图片已刷新', icon: 'success' })
          } else {
            uni.showToast({ title: '仍未解析，请检查云函数', icon: 'none' })
          }
        } else {
          uni.hideLoading()
          uni.showToast({ title: '未找到该认证', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '重试失败', icon: 'none' })
      }
    },
    closeDetail() {
      this.showDetail = false
      this.currentCert = {}
      this.currentPost = {}
      this.rejectReason = ''
      this.downReason = ''
    },

    async confirmReview(action) {
      if (!this.currentCert._id) return
      const actionText = action === 'approve' ? '通过' : '拒绝'
      const confirmed = await new Promise(resolve => {
        uni.showModal({
          title: `确认${actionText}`,
          content: action === 'reject' ? (this.rejectReason || '将使用默认原因') : '确定通过该用户的认证？',
          success: r => resolve(r.confirm)
        })
      })
      if (!confirmed) return
      try {
        uni.showLoading({ title: '处理中…' })
        await reviewCert(this.currentCert._id, action, this.rejectReason)
        uni.hideLoading()
        uni.showToast({ title: `${actionText}成功`, icon: 'success' })
        this.closeDetail()
        this.page = 1
        this.noMore = false
        this.certList = []
        this.loadList()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || `${actionText}失败`, icon: 'none' })
      }
    },
    async doRevoke() {
      if (!this.currentCert._id) return
      const confirmed = await new Promise(resolve => {
        uni.showModal({
          title: '确认撤销',
          content: '撤销后该用户回到"未认证"状态，可重新提交资料。',
          success: r => resolve(r.confirm)
        })
      })
      if (!confirmed) return
      try {
        uni.showLoading({ title: '处理中…' })
        await reviewCert(this.currentCert._id, 'revoke')
        uni.hideLoading()
        uni.showToast({ title: '已撤销', icon: 'success' })
        this.closeDetail()
        this.page = 1
        this.noMore = false
        this.certList = []
        this.loadList()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '撤销失败', icon: 'none' })
      }
    },
    async quickRevoke(item) {
      this.currentCert = item
      await this.doRevoke()
    },
    async confirmPost(action) {
      if (!this.currentPost._id) return
      const labelMap = { offline: '下架', online: '重新上架', delete: '删除' }
      const label = labelMap[action] || action
      const confirmed = await new Promise(resolve => {
        uni.showModal({
          title: `确认${label}`,
          content: action === 'delete' ? '删除后不可恢复（软删，DB 仍可见）' : '确定要操作这条帖子？',
          success: r => resolve(r.confirm)
        })
      })
      if (!confirmed) return
      try {
        uni.showLoading({ title: '处理中…' })
        await operatePost(this.currentPost._id, action, this.downReason)
        uni.hideLoading()
        uni.showToast({ title: `${label}成功`, icon: 'success' })
        this.closeDetail()
        this.page = 1
        this.noMore = false
        this.postList = []
        this.loadList()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || `${label}失败`, icon: 'none' })
      }
    },

    // ==================== 退款审核 ====================
    async loadRefunds() {
      this.refundLoading = true
      try {
        const res = await listRefunds(this.refundStatusTab)
        this.refunds = res.data || []
      } catch (e) {
        console.error('[audit/refund] load failed:', e)
        uni.showToast({ title: e.msg || '加载退款失败', icon: 'none' })
        this.refunds = []
      } finally {
        this.refundLoading = false
      }
    },
    loadMoreRefunds() {
      // 当前是简单全量拉取,没有分页;scrolltolower 暂不触发拉新
    },
    switchRefundTab(k) {
      if (this.refundStatusTab === k) return
      this.refundStatusTab = k
      this.loadRefunds()
    },
    openRefundDetail(r) {
      this.refundDetail = r
      this.refundRejectReason = ''
    },
    closeRefundDetail() {
      this.refundDetail = null
      this.refundRejectReason = ''
    },
    async confirmRefundAction(action) {
      if (!this.refundDetail || !this.refundDetail._id) return
      const isApprove = action === 'approve'
      const actionText = isApprove ? '通过' : '拒绝'
      const confirmed = await new Promise(resolve => {
        uni.showModal({
          title: `确认${actionText}`,
          content: isApprove
            ? '通过后该退款申请会标记为已通过(换货类型不会修改订单状态)'
            : (this.refundRejectReason || '将使用默认原因'),
          success: r => resolve(r.confirm)
        })
      })
      if (!confirmed) return
      try {
        uni.showLoading({ title: '处理中…' })
        // processRefund 期望 id 是订单的 _id(也就是 refund.orderId 字段),不是退款记录自己的 _id
        await processRefund(this.refundDetail.orderId, action, 0, this.refundRejectReason)
        uni.hideLoading()
        uni.showToast({ title: `${actionText}成功`, icon: 'success' })
        this.closeRefundDetail()
        this.loadRefunds()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || `${actionText}失败`, icon: 'none' })
      }
    },

    // ==================== 分类管理 ====================
    async loadCategoryList() {
      this.categoryLoading = true
      try {
        const res = await listNeighborCategories()
        this.categoryList = (res.data && res.data.list) || []
      } catch (e) {
        uni.showToast({ title: e.msg || '加载分类失败', icon: 'none' })
        this.categoryList = []
      }
      this.categoryLoading = false
    },
    async onAddCategory() {
      const name = (this.newCategoryName || '').trim()
      if (!name) {
        uni.showToast({ title: '请输入分类名', icon: 'none' })
        return
      }
      try {
        uni.showLoading({ title: '新增中…' })
        await createNeighborCategory(name, 0)
        uni.hideLoading()
        uni.showToast({ title: '已新增', icon: 'success' })
        this.newCategoryName = ''
        this.loadCategoryList()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '新增失败', icon: 'none' })
      }
    },
    async onEditCategory(cat) {
      uni.showModal({
        title: '编辑分类',
        editable: true,
        placeholderText: '新分类名',
        content: cat.name,
        success: async (r) => {
          if (!r.confirm) return
          const newName = (r.content || '').trim()
          if (!newName) {
            uni.showToast({ title: '分类名不能为空', icon: 'none' })
            return
          }
          if (newName === cat.name) return
          try {
            uni.showLoading({ title: '保存中…' })
            await updateNeighborCategory(cat._id, { name: newName })
            uni.hideLoading()
            uni.showToast({ title: '已保存', icon: 'success' })
            this.loadCategoryList()
          } catch (e) {
            uni.hideLoading()
            uni.showToast({ title: e.msg || '保存失败', icon: 'none' })
          }
        }
      })
    },
    async onDeleteCategory(cat) {
      const confirmed = await new Promise(resolve => {
        uni.showModal({
          title: '确认删除',
          content: `删除分类"${cat.name}"后,已使用此分类的帖子在前台仍会显示分类名(只是下拉里看不到)。确定删除?`,
          success: r => resolve(r.confirm)
        })
      })
      if (!confirmed) return
      try {
        uni.showLoading({ title: '删除中…' })
        await deleteNeighborCategory(cat._id)
        uni.hideLoading()
        uni.showToast({ title: '已删除', icon: 'success' })
        this.loadCategoryList()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.msg || '删除失败', icon: 'none' })
      }
    }
  }
}
</script>

<style>
.page {
  background-color: #F5F1EB;
  min-height: 100vh;
  padding: 0 20rpx 120rpx;
}

/* 一级 tab 栏（仿用户端订单页） */
.tab-bar {
  display: flex;
  height: 88rpx;
  background-color: #FFFFFF;
  border-bottom: 1rpx solid #EEEEEE;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.tab-item text {
  font-size: 26rpx;
  color: #666666;
}
.tab-item.active text {
  font-weight: 600;
  color: #4F9A42;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background-color: #4F9A42;
  border-radius: 2rpx;
}

/* 二级状态 tabs */
.status-tabs {
  display: flex;
  background: #FFFFFF;
  padding: 12rpx 0;
  margin: 16rpx 0 12rpx;
  border-radius: 16rpx;
}
.status-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 0;
  position: relative;
}
.status-tab-text {
  font-size: 26rpx;
  color: #666666;
}
.status-tab.active .status-tab-text {
  color: #4F9A42;
  font-weight: 600;
}
.tab-badge {
  min-width: 28rpx;
  height: 28rpx;
  background: #FF6B00;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  padding: 0 8rpx;
}
.tab-badge text {
  font-size: 20rpx;
  color: #FFFFFF;
  line-height: 1;
}

/* 搜索框 */
.search-bar {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 0 24rpx;
  height: 72rpx;
  margin-bottom: 16rpx;
}
.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  height: 72rpx;
}
.search-icon {
  font-size: 32rpx;
  color: #999;
  padding: 0 8rpx;
}
.search-clear {
  font-size: 28rpx;
  color: #CCC;
  padding: 0 8rpx;
}

/* 列表 */
.audit-list {
  height: calc(100vh - 460rpx);
}
.audit-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #F0F0F0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
  flex: 1;
  margin-right: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-chip {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  flex-shrink: 0;
}
.status-chip text {
  font-size: 22rpx;
}
.card-body {
  padding: 12rpx 0;
}
.info-row {
  display: flex;
  font-size: 26rpx;
  line-height: 1.6;
  margin-bottom: 4rpx;
}
.info-label {
  color: #999999;
  width: 140rpx;
  flex-shrink: 0;
}
.info-value {
  color: #333333;
  flex: 1;
}
.reject-reason .info-value {
  color: #FF6B00;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  padding-top: 12rpx;
  margin-top: 12rpx;
  border-top: 1rpx solid #F0F0F0;
}
.quick-btn {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
  line-height: 1;
}
.quick-btn text {
  font-size: 24rpx;
  line-height: 1;
}
.quick-revoke {
  background: #FFFFFF;
  border: 1rpx solid #999999;
}
.quick-revoke text {
  color: #666666;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8rpx;
  border-top: 1rpx solid #F0F0F0;
}
.meta {
  font-size: 22rpx;
  color: #999999;
}
.meta-stats {
  display: flex;
  gap: 12rpx;
}
.meta-stat {
  font-size: 22rpx;
  color: #999999;
}
.post-content {
  display: -webkit-box;
  font-size: 26rpx;
  color: #555555;
  line-height: 1.5;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.thumbs {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
}
.thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #F5F5F5;
}

/* 加载更多 + 空态 */
.load-more {
  text-align: center;
  padding: 24rpx 0;
  color: #999999;
  font-size: 24rpx;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.popup-content {
  width: 100%;
  height: 85vh;
  background: #F5F1EB;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  border-bottom: 1rpx solid #F0F0F0;
}
.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}
.popup-close {
  font-size: 32rpx;
  color: #999999;
  padding: 8rpx;
}
.popup-body {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
}
.popup-footer {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #F0F0F0;
  flex-shrink: 0;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
.popup-footer .btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.popup-footer .btn text {
  font-size: 30rpx;
  font-weight: 600;
}
.btn-approve {
  background: #4CAF50;
  color: #FFFFFF;
}
.btn-approve text {
  color: #FFFFFF;
}
.btn-reject {
  background: #FFFFFF;
  border: 2rpx solid #FF6B00;
  color: #FF6B00;
}
.btn-reject text {
  color: #FF6B00;
}
.btn-reject-solid {
  background: #FF4444;
  color: #FFFFFF;
}
.btn-reject-solid text {
  color: #FFFFFF;
}
.btn-revoke {
  background: #FFFFFF;
  border: 2rpx solid #999999;
  color: #666666;
  width: 100%;
}
.btn-revoke text {
  color: #666666;
}
.footer-hint {
  flex: 1;
  text-align: center;
  color: #999999;
  font-size: 26rpx;
  line-height: 88rpx;
}

/* 详情区 */
.detail-section {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.detail-row {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  line-height: 1.6;
  margin-bottom: 8rpx;
}
.detail-label {
  color: #999999;
  width: 140rpx;
  flex-shrink: 0;
}
.detail-value {
  color: #333333;
  flex: 1;
  word-break: break-all;
}
.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 12rpx;
}
.cert-image {
  width: 100%;
  height: 400rpx;
  background: #F5F5F5;
  border-radius: 12rpx;
}
.image-placeholder {
  width: 100%;
  height: 200rpx;
  background: #F8F8F8;
  border: 2rpx dashed #E0E0E0;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  box-sizing: border-box;
}
.placeholder-icon {
  font-size: 56rpx;
  margin-bottom: 8rpx;
  opacity: 0.5;
}
.placeholder-text {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  line-height: 1.4;
}
.retry-btn {
  margin-top: 16rpx;
  padding: 12rpx 32rpx;
  background: #4F9A42;
  border-radius: 32rpx;
}
.retry-btn text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 500;
}
.reject-text {
  color: #FF6B00;
}
.reject-input {
  width: 100%;
  min-height: 120rpx;
  background: #FFFFFF;
  border: 2rpx solid #E0E0E0;
  border-radius: 8rpx;
  padding: 16rpx;
  font-size: 26rpx;
  color: #333333;
  box-sizing: border-box;
  margin-top: 8rpx;
}
.action-label {
  display: block;
  font-size: 24rpx;
  color: #666666;
}
.action-section {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.post-content-full {
  display: block;
  font-size: 28rpx;
  color: #333333;
  line-height: 1.7;
  margin-bottom: 16rpx;
  white-space: pre-wrap;
  word-break: break-all;
}
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
}
.grid-img {
  width: 100%;
  height: 200rpx;
  border-radius: 8rpx;
  background: #F5F5F5;
}

/* 分类管理 */
.cat-add-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #F0F0F0;
}
.cat-input {
  flex: 1;
  height: 64rpx;
  background: #F8F8F8;
  border-radius: 32rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #333;
}
.cat-add-btn {
  padding: 0 28rpx;
  height: 64rpx;
  background: #4F9A42;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cat-add-btn text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 600;
}
.cat-card {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  border: 1rpx solid #F0F0F0;
}
.cat-index {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #E8F5E9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 16rpx;
}
.cat-index text {
  font-size: 24rpx;
  font-weight: 600;
  color: #4F9A42;
}
.cat-info {
  flex: 1;
  min-width: 0;
}
.cat-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 6rpx;
}
.cat-meta {
  font-size: 22rpx;
  color: #999;
}
.cat-actions {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}
.cat-btn {
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
}
.cat-btn text {
  font-size: 24rpx;
}
.cat-btn-edit {
  background: #E8F5E9;
}
.cat-btn-edit text {
  color: #4F9A42;
}
.cat-btn-del {
  background: #FFEEEE;
}
.cat-btn-del text {
  color: #E63946;
}

/* ========== 退款审核 ========== */
.refund-subtabs {
  margin: 0 0 12rpx;
}
.ellipsis-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}
.info-value.price {
  color: #FF4D4F;
  font-weight: 600;
}
</style>
