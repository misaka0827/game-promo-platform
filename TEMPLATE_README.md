# 活动推广平台模板

这是一个现成的**创作者推广活动管理平台**模板。你只需要 **fork 这个仓库**，然后修改一个配置文件 `config.js`，就能拥有自己的活动平台。

---

## 快速上手（3 步搞定）

### 第 1 步：Fork 仓库

点击 GitHub 页面右上角的 **Fork** 按钮，把这个仓库复制到你自己的账号下。

### 第 2 步：修改 config.js

打开项目根目录的 `config.js` 文件，按照下面的说明修改你需要的字段。

### 第 3 步：部署上线

改完 `config.js` 后，告诉龙虾（AI助手）：

> "帮我把这个项目部署到 Cloudflare Pages"

龙虾会帮你完成所有部署步骤。

---

## config.js 字段说明

### 基本信息

| 字段 | 含义 | 示例 |
|------|------|------|
| `platformName` | 平台名称，显示在所有页面的标题栏 | `'抖音 x 独立游戏种草平台'` |
| `heroTitle` | 创作者入口页的大标题 | `'玩游戏，也能领奖励'` |
| `heroSubtitle` | 创作者入口页大标题下方的说明文字 | `'选择你的角色，报名任务...'` |
| `logoText` | 首页最顶部的 Logo 文字 | `'XX工作室 · 游戏推广协作平台'` |
| `platformSlogan` | 平台简短口号 | `'接任务 · 领激活码 · 获奖励'` |

### 创作者类型

平台支持两种创作者类型（默认是「主播」和「博主」），你可以改成任何你需要的角色名称。

#### creatorTypeA（默认：主播）

| 字段 | 含义 | 示例 |
|------|------|------|
| `label` | 类型名称 | `'主播'` |
| `icon` | 显示的 Emoji 图标 | `'🎙️'` |
| `color` | 主题色关键字 | `'purple'` |
| `pageName` | 对应的页面文件名 | `'streamer.html'` |
| `description` | 简短描述 | `'直播类创作者'` |
| `shortDesc` | 身份选择卡片上的说明（支持 HTML） | `'直播类创作者<br>提交直播截图与数据'` |
| `fansLabel` | 粉丝数字段的标签 | `'实时粉丝数'` |
| `fansPlaceholder` | 粉丝数输入框提示 | `'例如：12万、8500'` |
| `namePlaceholder` | 昵称输入框提示 | `'你的直播昵称'` |
| `profilePlaceholder` | 主页链接输入框提示 | `'https://www.xiaohongshu.com/...'` |
| `profileLabel` | 主页链接字段标签 | `'小红书主页链接'` |

#### creatorTypeB（默认：博主）

字段与 creatorTypeA 完全一致，只需填入博主端的对应内容。

### 合作规则

| 字段 | 含义 |
|------|------|
| `streamerRules` | 主播端「浏览任务」页顶部显示的合作规则（支持 HTML 标签） |
| `bloggerRules` | 博主端「浏览任务」页顶部显示的合作规则（支持 HTML 标签） |

### 提交内容字段

#### streamerSubmitFields（主播提交时的字段文案）

| 字段 | 含义 | 示例 |
|------|------|------|
| `liveshotLabel` | 直播截图字段标签 | `'直播间截图'` |
| `liveshotHint` | 直播截图上传的提示说明（HTML） | 截图要求说明 |
| `datashotLabel` | 数据截图字段标签 | `'直播数据报告截图'` |
| `datashotHint` | 数据截图上传的提示说明（HTML） | 数据报告获取路径 |
| `clipLabel` | 切片链接字段标签 | `'直播切片链接'` |
| `clipPlaceholder` | 切片链接输入框提示 | `'请输入你制作的直播切片链接'` |

#### bloggerSubmitFields（博主提交时的字段文案）

| 字段 | 含义 | 示例 |
|------|------|------|
| `videoLabel` | 视频链接字段标签 | `'种草视频链接'` |
| `videoPlaceholder` | 视频链接输入框提示 | `'请输入你制作的视频链接'` |

### 运营后台

| 字段 | 含义 | 示例 |
|------|------|------|
| `adminPassword` | 运营后台访问密码 | `'mypassword123'` |
| `adminTitleSuffix` | 后台页面标题后缀 | `'独立游戏推广'` |
| `adminSubtitle` | 后台 header 的简要说明 | `'发任务 / 审名单 / 分CDK / 收数据'` |

### 招募类型选项

`recruitOptions` 数组定义了发布任务时「招募类型」下拉框的选项：

```js
recruitOptions: [
  { value: '不限', label: '不限（博主 + 主播）' },
  { value: '博主', label: '仅博主' },
  { value: '主播', label: '仅主播' },
],
```

请确保 `value` 与 `creatorTypeA.label` / `creatorTypeB.label` 一致。

### 任务流程步骤

`workflowSteps` 数组定义了创作者入口页显示的流程步骤：

```js
workflowSteps: [
  { title: '报名任务', desc: '挑选感兴趣的游戏...' },
  { title: '领取激活码，开始游玩', desc: '审核通过后...' },
  { title: '完成内容，上传数据', desc: '按要求完成...' },
],
```

### 其他

| 字段 | 含义 | 示例 |
|------|------|------|
| `wechatPlaceholder` | 微信号输入框提示 | `'方便运营联系你'` |

---

## 不需要修改的文件

- `api.js` — 数据层逻辑，不要改
- `admin.html` / `streamer.html` / `blogger.html` / `creator.html` / `index.html` — 页面结构，不要改
- `upload_to_github.py` / `server.py` — 服务端工具，不要改

---

## 常见问题

**Q: 我想把「主播」改成「UP主」怎么办？**
A: 修改 `config.js` 里 `creatorTypeA.label` 为 `'UP主'`，同时更新 `recruitOptions` 里对应的 value 和 label。

**Q: 我想增加第三种创作者类型怎么办？**
A: 目前模板支持两种创作者类型。如需更多类型，请联系开发同学。

**Q: 部署后数据存在哪里？**
A: 数据存在 Cloudflare KV 中，每个部署的平台独立存储，互不影响。
