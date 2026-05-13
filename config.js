/**
 * config.js — 活动平台配置文件
 *
 * Fork 本仓库后，只需修改此文件即可定制你自己的活动平台。
 * 修改完成后告诉龙虾（AI助手）帮你部署即可上线。
 */
window.SITE_CONFIG = {

  // ============================================================
  //  基本信息
  // ============================================================

  /** 平台名称（显示在首页标题、各页面 header） */
  platformName: '小红书 x 单主机游戏种草平台',

  /** 首页大标题 */
  heroTitle: '玩游戏，也能领奖励',

  /** 首页副标题 */
  heroSubtitle: '选择你的角色，报名任务领取激活码，玩完游戏按要求上传数据',

  /** 首页顶部 Logo 文字（index.html header） */
  logoText: '单主机 · 游戏推广协作平台',

  /** 首页简短描述（creator.html header 下方） */
  platformSlogan: '接任务 · 领激活码 · 获奖励',

  // ============================================================
  //  创作者类型
  // ============================================================

  /** 创作者类型 A（默认：主播） */
  creatorTypeA: {
    label: '主播',
    icon: '🎙️',
    color: 'purple',             // 主题色关键字（purple / blue / green ...）
    pageName: 'streamer.html',
    description: '直播类创作者',
    shortDesc: '直播类创作者<br>提交直播截图与数据',
    /** 创作者端 header 里的粉丝数字段文案 */
    fansLabel: '实时粉丝数',
    fansPlaceholder: '例如：12万、8500',
    /** 登录弹窗里的昵称 placeholder */
    namePlaceholder: '你的直播昵称',
    /** 主页链接 placeholder */
    profilePlaceholder: 'https://www.xiaohongshu.com/user/profile/...',
    profileLabel: '小红书主页链接',
  },

  /** 创作者类型 B（默认：博主） */
  creatorTypeB: {
    label: '博主',
    icon: '✍️',
    color: 'blue',
    pageName: 'blogger.html',
    description: '图文/视频创作者',
    shortDesc: '图文/视频创作者<br>提交种草内容链接',
    fansLabel: '实时粉丝数',
    fansPlaceholder: '例如：8500、2万',
    namePlaceholder: '你的小红书昵称',
    profilePlaceholder: 'https://www.xiaohongshu.com/user/profile/...',
    profileLabel: '小红书主页链接',
  },

  // ============================================================
  //  合作规则（显示在主播端 / 博主端的任务列表顶部）
  // ============================================================

  /** 主播合作规则（HTML，支持标签） */
  streamerRules: `
    <p class="font-semibold text-gray-700 mb-1">📋 主播合作规则</p>
    <p>1️⃣ 报名成功请<strong>务必按时发布作品</strong>！否则会计入黑名单影响后续权益</p>
    <p>2️⃣ 报名门槛粉丝 &gt; 5000；入选后需在<strong>标题和直播间置顶消息</strong>（直播间介绍）中露出游戏名称</p>
    <p>3️⃣ 直播该游戏 <strong>1小时以上</strong>，并剪辑发布一条<strong>直播切片</strong></p>
  `,

  /** 博主合作规则（HTML，支持标签） */
  bloggerRules: `
    <p class="font-semibold text-gray-700 mb-1">📋 博主合作规则</p>
    <p class="font-semibold text-gray-500">【笔记内容】</p>
    <p>• 测评至少 <strong>50% 以上</strong>需是<strong>自己的游戏画面</strong>，时长 <strong>&gt; 30秒</strong></p>
    <p>• <strong>文案和PV需自行剪辑&配音</strong>，直接贴PV/搬运文案视为低质，会被计入黑名单</p>
    <p class="font-semibold text-gray-500 mt-1">【笔记发布】</p>
    <p>• 合作笔记发布后至少<strong>保留一个月</strong>，提前删除将被计入黑名单</p>
    <p>• 请<strong>务必按时发布</strong>，否则会计入黑名单影响后续权益</p>
  `,

  // ============================================================
  //  提交内容字段（主播端特有）
  // ============================================================

  /** 主播提交时需要填的字段文案 */
  streamerSubmitFields: {
    liveshotLabel: '直播间截图',
    liveshotHint: `
      <p class="font-semibold">📸 截图要求：</p>
      <p>• 截图需<strong>露出带游戏名的直播介绍</strong>（标题/封面区域）</p>
      <p>• 建议选取<strong>在线人数较高时刻</strong>的截图，以便体现直播效果</p>
    `,
    datashotLabel: '直播数据报告截图',
    datashotHint: `
      <p class="font-semibold">📊 数据报告获取路径：</p>
      <p>创作者中心 → 主播中心 → <strong>近一场直播报告</strong> → 核心指标</p>
      <p class="text-blue-600">（对该页面进行截图后上传）</p>
    `,
    clipLabel: '直播切片链接',
    clipPlaceholder: '请输入你制作的直播切片链接',
  },

  /** 博主提交时需要填的字段文案 */
  bloggerSubmitFields: {
    videoLabel: '种草视频链接',
    videoPlaceholder: '请输入你制作的视频链接',
  },

  // ============================================================
  //  运营后台
  // ============================================================

  /** 运营后台密码（index.html 用） */
  adminPassword: 'xhs2024',

  /** 运营后台标题后缀 */
  adminTitleSuffix: '单主机游戏推广',

  /** 运营后台简要描述 */
  adminSubtitle: '发任务 / 审名单 / 分CDK / 收数据',

  // ============================================================
  //  招募类型下拉选项
  // ============================================================

  /** 招募类型选项（与 creatorTypeA / B 的 label 对应） */
  recruitOptions: [
    { value: '不限', label: '不限（博主 + 主播）' },
    { value: '博主', label: '仅博主' },
    { value: '主播', label: '仅主播' },
  ],

  // ============================================================
  //  任务流程步骤说明（creator.html 首页）
  // ============================================================

  /** 任务流程步骤 */
  workflowSteps: [
    { title: '报名任务', desc: '挑选感兴趣的游戏，填写信息提交申请，等待审核通过' },
    { title: '领取激活码，开始游玩', desc: '审核通过后在「我的报名」领取 CDK，下载游戏开始体验' },
    { title: '完成内容，上传数据', desc: '按要求完成直播或发布笔记，在截止前上传截图与内容链接' },
  ],

  // ============================================================
  //  联系方式 / 微信字段
  // ============================================================

  /** 报名时微信号字段的 placeholder */
  wechatPlaceholder: '方便运营联系你',

};
