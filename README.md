# 个人博客：架构与文件维护指南

本项目使用 Astro + TypeScript + CSS 构建静态个人博客，部署到 GitHub Pages。

**当前阶段：内容功能与 Glassmorphism 视觉样式已接通。** 现有栏目为主页、osu skin、炒股碎碎念、画妹妹、读书与思考、快乐的事、找我&投喂。包含自动缩略图、原图查看器、开发资源监听、文章分类筛选、资源与路由校验，以及 Pages 构建流程。全站使用设计图提供的蓝粉背景、半透明毛玻璃导航与内容卡片，并接入本地字体。

README 位于 Git 仓库根目录，下文路径均相对于此目录。可以整理和替换 `resource/` 中的内容；提交并推送后，Actions 会重新扫描、构建并部署。

本地更新：先用 `cd` 进入包含 `package.json` 的仓库目录，然后运行 `npm run dev`。保持终端运行，修改内容后浏览器会自动刷新。

## 1. 栏目与路由

| 栏目 | 地址 | 页面文件 | 内容来源 |
| --- | --- | --- | --- |
| 主页 | `/` | `src/pages/index.astro` | `resource/about.md` + 站点配置 |
| osu skin 列表 | `/osu/` | `src/pages/osu/index.astro` | 每套 skin 的标题和封面 |
| 单套 skin 详情 | `/osu_skin/<id>/` | `src/pages/osu_skin/[id].astro` | 对应 skin 的说明和全部预览图 |
| 绘画展示 | `/drawing/` | `src/pages/drawing/index.astro` | `resource/drawing/` |
| 炒股记录与碎碎念 | `/stock/` | `src/pages/stock/index.astro` | `resource/stock_text/**/*.md` |
| 文章详情 | `/stock/<id>/` | `src/pages/stock/[...id].astro` | 对应 Markdown 正文 |
| 读书与思考 | `/reading/` | `src/pages/reading/index.astro` | `resource/reading_text/**/*.md` |
| 读书文章详情 | `/reading/<id>/` | `src/pages/reading/[...id].astro` | 对应 Markdown 正文 |
| 快乐的事 | `/happy/` | `src/pages/happy/index.astro` | `resource/happy/<id>/post.json` 和对应图片 |
| 找我&投喂 | `/contact/` | `src/pages/contact/index.astro` | `resource/contact/config.json` 和两张图片 |

主页首屏展示名字、短简介及栏目入口，下滑进入自我介绍。当前全站导航在手机上自动换行。暂不设计评论区。

osu skin 的文件夹只使用一级标识，因此详情模板命名为 `[id].astro`。股票与读书文章允许子文件夹，因此使用 `[...id].astro`。这些方括号是实际文件名的一部分，无需手动替换；构建逻辑会枚举内容并生成静态页面。参见 [Astro 路由文档](https://docs.astro.build/en/guides/routing/)。

## 2. 已创建的目录与文件

```text
Kitazaki-Hinata.github.io/
├── .github/
│   └── workflows/deploy.yml             # main 推送触发检查、构建与 Pages 发布
├── .gitignore
├── README.md
├── astro.config.mjs                    # 站点 URL、base、静态输出配置
├── package.json                        # 依赖、Node.js 24 要求和 npm 命令
├── package-lock.json                   # npm 生成的完整依赖锁文件
├── tsconfig.json
├── resource/                           # 人工维护的内容源
│   ├── about.md                        # 示例自我介绍
│   ├── background/
│   │   └── main-bg.webp                # 全站背景，来自 design/main-bg.png
│   ├── design/                        # 设计原稿，不自动发布
│   │   └── main-bg.png                 # 保留的背景 PNG 原图
│   ├── fonts/                         # 原始字体，不自动发布
│   │   └── web/                       # 已转换的 WOFF2 与字体样式表
│   ├── drawing/
│   │   ├── 2026-09-09-example.svg       # 示例绘画
│   │   └── 2026-09-09-example.json      # 同名作品说明
│   ├── osu_skin/
│   │   └── example-skin/               # 每套 skin 一个文件夹
│   │       ├── skin.json               # 标题、封面、说明、排序
│   │       └── images/                 # 只需维护原图
│   │           ├── 01-cover.svg
│   │           └── 02-gameplay.svg
│   ├── stock_text/
│   │   └── 2026-09-09-example.md        # 示例文章
│   ├── reading_text/
│   │   └── 2026-09-10-example.md        # 示例读书笔记
│   ├── happy/
│   │   └── 2026-09-10-example/          # 每条快乐记录一个文件夹
│   │       ├── post.json               # 短文、可选标题、日期和图片顺序
│   │       └── images/
│   │           └── 01-moment.svg       # 示例图，可放一张或多张原图
│   ├── contact/
│   │   ├── config.json                 # 联系方式与赞助图片的文件名、说明
│   │   ├── contact.svg                 # 个人联系方式示例图
│   │   └── support.svg                 # 赞助渠道示例图
│   └── images/
│       ├── avatar.svg
│       ├── stock/example.svg           # 文章插图
│       └── reading/example.svg         # 读书文章插图
├── scripts/
│   ├── prepare-media.mjs               # 校验资源、生成缩略图和媒体清单
│   ├── prepare-design-fonts.py         # 可选的字体子集生成工具，日常构建不需要
│   ├── content-rules.mjs               # 共享元数据、路由和 Markdown 引用规则
│   ├── resource-loader.mjs             # 内容加载与媒体变动后的渲染缓存更新
│   ├── watch-resources.mjs             # 开发期间监听资源、刷新内容
│   └── remark-resource-images.mjs      # 转换 Markdown 插图和文档链接 URL
├── src/
│   ├── content.config.ts               # Markdown 集合与字段校验
│   ├── config/site.ts                  # 名称、背景、头像、导航、社交链接
│   ├── generated/
│   │   ├── .gitkeep                    # 提交到 Git，用于保留目录
│   │   └── media.json                  # 构建时生成的媒体清单，已忽略
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ArticleLayout.astro
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── SkinCard.astro
│   │   ├── HappyFeed.astro              # 按日期展示图文记录
│   │   ├── Gallery.astro
│   │   ├── Thumbnail.astro
│   │   ├── ImageViewer.astro
│   │   └── ArticleList.astro            # 股票和读书共用的文章列表
│   ├── lib/
│   │   ├── content.ts
│   │   ├── media.ts                    # 媒体数据类型，支持空画廊
│   │   └── urls.ts
│   ├── scripts/
│   │   ├── image-viewer.ts             # 图片浮层和鼠标、触屏、键盘操作
│   │   ├── viewer-math.ts              # 缩放与拖动边界计算
│   │   └── article-filter.ts           # 分类筛选及 URL / 浏览器历史同步
│   ├── styles/
│   │   ├── global.css
│   │   └── image-viewer.css            # 图片查看器必需的布局样式
│   └── pages/
│       ├── index.astro
│       ├── 404.astro
│       ├── osu/index.astro
│       ├── osu_skin/[id].astro
│       ├── drawing/index.astro
│       ├── stock/
│       │   ├── index.astro
│       │   └── [...id].astro
│       ├── reading/
│       │   ├── index.astro
│       │   └── [...id].astro
│       ├── happy/index.astro
│       └── contact/index.astro
├── tests/                             # 资源处理、缩放计算和浏览器交互测试
├── playwright.config.ts               # 浏览器测试配置
└── public/
    ├── favicon.svg                     # 人工维护的网站图标
    └── resource/
        └── .gitkeep                    # 公开媒体输出目录，图片由脚本复制
```

示例图片是真正可打开的 SVG 文件，可直接用浏览器预览，不是改了图片后缀的文本占位。它们仅用于说明文件关系，可以换成自己的 PNG、JPG 或 WebP；如果后缀或文件名改变，同时更新引用。

## 3. 全站统一背景与主页

所有页面，包括股票与读书文章、skin、快乐的事、找我&投喂和 404，都通过 `BaseLayout.astro` 使用同一个背景；`ArticleLayout.astro` 复用该布局。

背景原图放入 `resource/background/`。当前 `src/config/site.ts` 中的设置是：

```ts
background: "background/main-bg.webp"
```

此路径相对于 `resource/`，对应 `resource/background/main-bg.webp`。背景由 `resource/design/main-bg.png` 转换为 WebP，保持 2560 × 1440 原尺寸与透明通道，质量参数为 94；文件从约 8.86 MB 缩小到 1.43 MB。PNG 原图保留在设计目录。可直接替换 WebP；如果修改文件名，将站点配置同步更新。目录可以存多张备选图，全站只使用配置选中的一张。

布局使用固定全屏背景层、居中覆盖、带颜色的半透明导航与内容卡片、背景模糊、柔和阴影及图片失败时的纯色回退。详情页不单独设置背景。主页的名称、简介与按钮和导航品牌共享左侧基准；首屏下方留出空白，自我介绍滚动后进入视野。

自我介绍编辑 `resource/about.md`；站点名称、搜索摘要、头像及社交链接编辑 `src/config/site.ts`。首页首屏的中英文欢迎文字编辑 `src/pages/index.astro`。头像路径同样相对于 `resource/`。

字体源文件在 `resource/fonts/`。网页使用 `resource/fonts/web/` 中的 WOFF2：首页大字号名称使用 `Torus Pro` Regular，完整转换自 `TorusPro-Regular.ttf`，CSS 字重为 `400`；首页其他文字及标题保留 `Alibaba Health`，拉丁字符子集约 7.5 KB，其余字符约 1.04 MB；`Microsoft YaHei Nav` 来自微软雅黑 Bold 的导航字符子集，约 12.5 KB。后两者的 CSS 字重均为 `700`；所有自定义字体使用 `font-display: swap`，保证字体加载时文字仍可见；正文使用系统字体以保持阅读舒适。

`prepare:media` 只复制 `web/` 里的 WOFF2 和 `fonts.css` 到 `public/resource/`，不会发布原始 TTF/TTC。布局使用 `withBase()` 加载样式和预加载拉丁字体，样式表通过相对路径引用 WOFF2，因此普通项目站点的 base 路径同样有效。

日常构建直接使用已转换的字体，无需 Python。若替换原始字体或增加导航用字，可修改 `scripts/prepare-design-fonts.py` 中的导航文字，然后在已有 fontTools 和 Brotli 的 Python 环境运行 `python scripts/prepare-design-fonts.py`，提交更新后的 WOFF2。导航子集未包含的文字会使用后备字体。

## 4. osu skin：列表、详情与图片

每套 skin 使用一个文件夹；复制现有的 `resource/osu_skin/example-skin/` 即可准备第二套。文件夹名称就是稳定的路由标识，例如：

```text
resource/osu_skin/white-cat/
    → 列表：/osu/
    → 详情：/osu_skin/white-cat/
```

文件夹名使用小写英文、数字和短横线，例如 `white-cat`、`hinata-blue`；标题可以是中文。发布后修改标题不影响链接，重命名文件夹会改变链接。

### 标题、封面和原图放在哪里

| 内容 | 维护位置 | 示例 |
| --- | --- | --- |
| skin 标题 | `skin.json` 的 `title` | `Example Skin · 蓝紫` |
| 列表封面 | `skin.json` 的 `cover` | `images/01-cover.svg` |
| 说明、日期和排序 | `skin.json` | `description`、`date`、`order` |
| 封面原图与详情原图 | 该 skin 的 `images/` 目录 | `01-cover.svg`、`02-gameplay.svg` |
| 列表及画廊缩略图 | 构建自动生成至 `public/resource/` | 无需手动压缩或维护 |

当前 `skin.json` 示例：

```json
{
  "title": "Example Skin · 蓝紫",
  "cover": "images/01-cover.svg",
  "description": "示例 skin：展示封面和多张预览图的目录组织方式。",
  "date": "2026-09-09",
  "author": "Kitazaki Hinata",
  "order": 1,
  "draft": false
}
```

`cover` 相对于这一套 skin 的文件夹，必须指向其 `images/` 中的一张图片。封面只决定列表使用哪张图，不改变详情图片顺序；封面图片也包含在详情画廊中。

| 字段 | 规则 |
| --- | --- |
| `title` | 建议填写；省略时回退到文件夹名 |
| `cover` | 建议明确填写；省略时取排序后的第一张图片，填写但文件不存在时报告错误 |
| `description` | 可选，省略时隐藏说明 |
| `date` | 可选，格式为 `YYYY-MM-DD` |
| `author` | 可选，省略时隐藏作者 |
| `download` | 可选，填写真实下载地址；省略时隐藏下载按钮 |
| `order` | 可选数字，越小越靠前，未填写的排在有 order 的后面 |
| `draft` | 可选，默认 false；true 时不生成卡片、详情页及该 skin 的公开图片 |

多个 skin 按 `order` 升序，再按 `date` 倒序（无日期的在后），最后按文件夹名称排序。详情图片按文件名进行自然排序，建议使用 `01-cover`、`02-gameplay`、`03-results` 等数字前缀。

缺少 `skin.json` 时，采用上述默认值，仍以文件夹为一个 skin。图片应放在 `<id>/images/`；`osu_skin/` 根目录不直接放图片。配置路径错误、空图片目录、规范化后重名或无效 JSON 都应在构建时报告具体位置。

### 图片浏览方式

`/osu/` 展示多张 skin 卡片，每张只有标题、封面缩略图和可选简介。点击标题或封面进入 `/osu_skin/<id>/`，展示这套 skin 的全部图片缩略图。

详情页在电脑上双击缩略图打开原图查看器；触屏轻点打开，键盘选中图片后按 Enter 打开。“查看原图”文字入口单击即可打开。绘画区使用同一个查看器，单击图片打开。

查看器支持放大、缩小、适应窗口、放大后拖动、上一张、下一张和关闭；支持滚轮、双指缩放、左右方向键切图、`+` / `-` 缩放、`0` 复位、Esc 关闭。打开时锁定页面滚动，关闭后恢复原入口焦点。缩放范围是适应窗口状态的 1～5 倍，100% 表示适应窗口；小原图在初始状态下不会放大。原图加载失败时显示提示，仍可关闭或切换图片。

查看器内保留“新标签页打开原图”链接。只有打开查看器时才请求对应原图；画廊与卡片使用延迟加载的缩略图。

这里区分三次操作：列表点击进入详情，详情双击打开原图，查看器内操作缩放。JavaScript 不可用时保留通向原图的普通链接。

### 添加与更新

1. 复制 `example-skin/`，改成新文件夹名。
2. 替换 `images/` 内的示例图，可放任意多张预览原图。
3. 修改 `skin.json` 的标题、封面、说明和排序。
4. 删除不需要的示例图片；如果删除的是封面，同时更新 `cover`。
5. 提交并推送，部署成功即可更新列表与详情。

更改标题修改 `title`，更换封面修改 `cover`，增加截图放入 `images/`，暂时隐藏设置 `draft: true`。可用同名文件替换旧原图；生成的公开文件名包含内容哈希，图片内容改变后 URL 随之更新。只需维护原图和配置，缩略图与引用会自动更新。

## 5. 绘画与文章插图

绘画放入 `resource/drawing/`，支持子文件夹。已有一张示例 SVG，以及同目录、同名的 JSON：

```json
{
  "title": "示例绘画：落日",
  "date": "2026-09-09",
  "description": "用于演示绘画文件与同名说明文件的对应关系，可替换为自己的作品。",
  "alt": "紫色天空下的落日与山形"
}
```

只放图片也应能展示；JSON 为可选。标题默认取文件名，日期优先取 JSON，其次解析文件名开头的 `YYYY-MM-DD`。有日期的作品倒序排列，无日期的在后，同日期按相对路径排序，不使用 Git 检出时会变化的文件修改时间。同目录禁止仅扩展名不同的同名图片，以免说明文件产生歧义；说明 JSON 找不到同名图片时也会报告错误。作品说明还可设置 `draft: true` 暂时隐藏绘画及其公开图片。

头像和正文插图放入 `resource/images/`。现有 `stock/`、`reading/` 子目录各有示例图片，分别用于股票和读书文章。找我&投喂的两张图片单独放在 `resource/contact/`。

## 6. 文章、快乐的事与找我&投喂

### 炒股记录与碎碎念

在 `resource/stock_text/` 新建 Markdown，例如现有的 `2026-09-09-example.md`：

```markdown
---
title: "示例：今日复盘与碎碎念"
date: "2026-09-09"
category: "炒股记录"
tags: ["示例", "复盘"]
description: "演示标题、日期、分类、摘要及正文插图的写法。"
draft: false
---

# 今日复盘与碎碎念

在这里写正文。

![示例插图](../images/stock/example.svg)
```

构建时读取所有 Markdown，`/stock/` 自动列出标题，点击进入对应静态文章页：

```text
resource/stock_text/2026-09-09-example.md
    → /stock/ 的标题列表
    → /stock/2026-09-09-example/
```

元数据全部可选，没有 YAML 头部的 Markdown 也要能展示：

| 字段 | 默认或回退规则 |
| --- | --- |
| `title` | 正文第一个一级标题，再回退到文件名 |
| `date` | 文件名开头日期，仍缺少则显示“未注明日期” |
| `category` | 股票区默认“碎碎念”，读书区默认“读书笔记”；可填写自定义分类 |
| `tags` | 空数组 |
| `description` | 从正文提取纯文本摘要 |
| `draft` | false；true 时不生成列表条目和详情页 |

列表按日期倒序，无日期的在后，同日期按文章标识排序，可通过列表上方的分类选择框筛选。分类来自已发布文章的 `category`，支持自定义名称，筛选结果会写入 `?category=...`，刷新、分享链接和浏览器前进后退均可恢复。无匹配内容时显示空状态；关闭 JavaScript 后仍显示完整列表。文章标识来自相对路径去掉小写 `.md` 扩展名，保留子目录，例如 `2026/review.md` 对应 `/stock/2026/review/`。各段执行 Unicode NFKC 规范化、转小写、空白转短横线，只保留文字、数字、短横线和下划线；例如 `中文 笔记.md` 对应 `中文-笔记`。空标识、`index` 路径段以及规范化后重名会报错，避免覆盖栏目或详情页。不要设置 `slug` 字段；重命名文件会改变网址。日期请用带引号的 `"YYYY-MM-DD"` 字符串。

正文插图优先使用相对于 Markdown 文件的路径，这样在编辑器中也能预览；上例使用 `../images/stock/example.svg`。嵌套目录中的文章需要相应增加 `../`。也可约定 `resource/images/...` 表示仓库根目录下的资源。由 `remark-resource-images.mjs` 解析源文件位置、校验引用，再转为带站点 base 的哈希图片 URL。

标准 Markdown 的行内插图和引用式插图均可使用；代码块内的示例不会被当成真实引用。相对 `.md` 链接（如 `[上一篇](./previous.md)`）会转换成对应详情页地址，发布内容链接到缺失或草稿文档会报错。文件路径大小写必须完全一致，路径分隔符用 `/`。

股票与读书文章采用 Astro 构建时内容集合，通过 `glob()` 读取、`getStaticPaths()` 生成详情路由、`render()` 渲染正文，参考 [Astro 内容集合文档](https://docs.astro.build/en/guides/content-collections/)。

### 读书与思考

在 `resource/reading_text/` 新建 Markdown，维护方式与股票区相同：列表自动提取标题、日期与摘要，按日期倒序排列，支持分类筛选、子文件夹、草稿和正文插图。

```text
resource/reading_text/2026-09-10-example.md
    → /reading/2026-09-10-example/
resource/reading_text/2026/a-book.md
    → /reading/2026/a-book/
```

可以复制已有示例，也可以从下面开始：

```markdown
---
title: "读完一本书之后"
date: "2026-09-10"
category: "读书笔记"
tags: ["阅读", "思考"]
description: "记录这次阅读带来的启发。"
draft: false
---

# 读完一本书之后

在这里写正文。

![阅读插图](../images/reading/example.svg)
```

`category` 可填“读书笔记”“随想”等自定义名称；省略时使用“读书笔记”。没有元数据也可展示，标题回退到第一个一级标题或文件名。设置 `draft: true` 后不会出现在列表，也不会生成详情页。股票和读书区可以使用相同的文件名，因为它们有各自的路由前缀。

### 快乐的事

访问 `/happy/`，按时间浏览“一张图片配一段短文”的生活记录。同一件事也可以配多张图片，文字只显示一次；点击图片打开原图查看器，上一张／下一张只切换这一条记录的图片。栏目复用全站背景、缩略图和查看器。

每条记录使用 `resource/happy/` 下的一个独立文件夹。复制示例后替换图片与短文即可：

```text
resource/happy/
├── 2026-09-10-example/
│   ├── post.json
│   └── images/
│       └── 01-moment.svg
└── 2026-09-11-a-good-day/
    ├── post.json
    └── images/
        ├── 01-photo.jpg
        └── 02-photo.jpg
```

文件夹名使用小写英文、数字和短横线，建议以日期开头。最简 `post.json` 只需填写 `text`；系统自动读取这一条记录的 `images/` 文件夹，支持子目录。完整示例：

```json
{
  "title": "今天的小确幸",
  "date": "2026-09-10",
  "text": "忙完之后，坐下来喝了一杯喜欢的饮料。\n平常的一天，也有值得记住的小快乐。",
  "alt": "桌上放着的一杯热饮",
  "draft": false
}
```

| 字段 | 规则 |
| --- | --- |
| `text` | 已发布记录必填，填写非空短文；作为纯文本展示，保留换行，不解析 Markdown 或 HTML |
| `title` | 可选；省略时只展示图片、短文及可用日期 |
| `date` | 可选的真实 `YYYY-MM-DD` 日期；省略时取文件夹名开头的日期，仍没有则隐藏日期 |
| `alt` | 可选的图片替代文字；省略时使用记录标题与图片序号 |
| `draft` | 默认 false；true 时不展示该记录，也不发布其图片 |
| `images` | 可选的非空数组；省略时按文件名自然排序读取全部图片，填写时只发布数组中指定的图片并遵循数组顺序 |

多张图片需要自定义顺序时，可在配置中添加：

```json
"images": ["images/02-photo.jpg", "images/01-photo.jpg"]
```

这些路径相对于当前记录文件夹，必须指向其 `images/` 内的图片，大小写一致，不可重复引用。缺少 `post.json`、短文为空、无图片、无效日期、文件不存在或引用其他记录的图片都会报告错误。草稿可以先只填写 `{"draft": true}`，等图文准备好后再发布。

记录按日期倒序排列，无日期的在后，同日期按文件夹名称排序。图文直接展示在栏目列表中；使用 `/happy/#happy-2026-09-10-example` 这样的锚点地址可定位到某条记录，重命名文件夹会改变锚点。

添加时复制一整个示例文件夹；更新时修改 `post.json` 或替换原图；删除时移除整条记录的文件夹。开发预览会自动刷新，删除或隐藏后，生成目录中的对应图片也会清理。所有记录都为空或为草稿时，页面显示空状态。上传原图即可，压缩缩略图由脚本自动生成。

### 找我&投喂

页面固定展示“个人联系方式”和“赞助渠道”两张图片，点击可以打开原图查看器，支持放大、缩小和切换。所有页面继续使用相同背景。

把图片放在 `resource/contact/`，通过同目录的 `config.json` 指定文件名。现有示例：

```json
{
  "contact": {
    "image": "contact.svg",
    "description": "欢迎来聊聊共同感兴趣的事。"
  },
  "support": {
    "image": "support.svg",
    "description": "感谢你对创作的支持。"
  }
}
```

- `contact.image`：个人联系方式图片；`support.image`：赞助渠道图片。两个字段必填，路径相对于 `resource/contact/`。
- `description`：可选说明；`alt`：可选替代文字，默认使用对应标题。
- 当前两张 SVG 只是明确标注的示例图，不包含真实联系方式或收款码。
- 更换为 PNG 时，例如放入 `my-contact.png` 和 `support-code.png`，再修改配置中对应的 `image` 即可。文件名、后缀和大小写需要一致。
- 只发布配置选中的两张图片；目录内其他备选图片不会自动展示或复制到公开媒体目录。引用缺失文件或目录外的图片会阻止构建。
- 继续维护原图即可，系统自动生成缩略图；查看器打开的是完整原图。二维码或小字图片建议使用清晰的 PNG 原图。
- 本地运行 `npm run dev` 后，修改配置或替换图片都会自动更新；线上需要提交、推送并等待部署。

原“代码项目”栏目、详情页、组件及其资源目录已经移除。`/projects/` 和原项目详情地址不再生成，访问时返回 404。

## 7. 资源扫描与生成产物

`resource/` 是人工维护的内容源，`public/resource/` 是专用的公开媒体输出目录，`src/generated/media.json` 保存图片与字体映射、绘画、skin、快乐图文、联系与赞助图片以及文章信息。

媒体准备过程：

1. 扫描资源、读取 Markdown / JSON，校验元数据类型、真实日期、URL、封面、背景、头像和正文引用。
2. 检查资源路径大小写冲突、重复路由、无对应图片的绘画说明、skin 与快乐记录的文件夹名称和图片目录。
3. 过滤草稿，按日期、order 和文件名排序，生成图片尺寸及内容清单。
4. 保留原图字节，生成宽度 400、800、1200px 的 WebP 缩略图，质量参数为 80。按原比例缩小，不拉伸，小于目标尺寸的图片不放大，也不重复生成相同尺寸。
5. 复制 `resource/fonts/web/` 中的 WOFF2 和 `fonts.css`；缺少自定义字体的站点输出空样式表，仍可正常构建。
6. 先在 `.cache/` 中完成解码与压缩，再更新公开资源与清单；校验或解码失败时保留上一次成功生成的媒体。删除或隐藏的资源在成功更新后从输出中清理。

支持 JPG、JPEG、PNG、WebP、AVIF、GIF 和 SVG。缩略图会处理照片方向信息；动画使用第一帧作为缩略图，原图保留动画。列表卡片沿用现有封面裁切规则，绘画和详情预览保持图片比例。浏览器根据图片实际显示宽度和设备像素比选择缩略图，采用 [HTML 标准的自动图片尺寸](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)，并提供旧浏览器回退尺寸。

源文件仍使用自己命名的目录和文件名；公开产物采用平铺的哈希文件名，例如：

```text
resource/drawing/my-art.png             # 人工维护
public/resource/<hash>.png              # 原图副本
public/resource/<hash>-400-q80-v1.webp   # 自动缩略图
public/resource/<hash>-800-q80-v1.webp
public/resource/<hash>-1200-q80-v1.webp
src/generated/media.json               # 源路径、产物、尺寸、路由等映射
```

**无需自己制作缩略图。** 只需上传合适清晰度的原图；生成参数在 `scripts/prepare-media.mjs` 中统一维护。不要在 Markdown 或 JSON 里手写哈希文件名，继续引用 `resource/` 下的原始路径。

运行 `npm run dev` 时会监听 `resource/` 以及 `src/config/site.ts`。新增、修改、删除图片、JSON 或 Markdown 后自动重新校验、准备资源并刷新浏览器，不需要手动重启。Markdown 渲染缓存也包含媒体版本，避免图片替换后正文保留旧 URL。保存尚未完成或配置出错时可能出现错误浮层；修正并保存后自动恢复。

Markdown 和 JSON 源文件不会复制到公开目录。草稿不生成股票或读书文章详情；skin、绘画和快乐记录的草稿也不复制对应图片。共用的 `resource/images/` 图片仍会公开，公开 GitHub 仓库中的源文件也能被查看。

`check`、`build`、`dev` 都先运行媒体准备命令，因此新克隆无需手动创建清单。生成目录由 Git 忽略，只保留 `.gitkeep`。清理范围仅包含专用的媒体产物及临时目录，不会清理原始资源或 `public/favicon.svg`。

## 8. Git 忽略规则

当前 `.gitignore` 已覆盖：

| 类型 | 忽略内容 |
| --- | --- |
| 依赖和缓存 | `node_modules/`、`.astro/`、`.cache/`、`.vite/`、`*.tsbuildinfo` |
| 构建与检查结果 | `dist/`、`coverage/`、`test-results/`、`playwright-report/` |
| 自动生成内容 | `src/generated/*`、`public/resource/*`，各自保留 `.gitkeep` |
| 本地配置 | `.env`、`.env.*`、`*.local`，允许提交 `.env.example` |
| 日志与临时文件 | `*.log`、`*.tmp`、`*.temp`、`*.swp`、`*.swo`、`*.bak`、`*~` |
| IDE 与系统文件 | `.idea/`、`.vscode/`、`*.iml`、`.DS_Store`、`Thumbs.db`、`Desktop.ini` |

图片、`.md`、`.json`、`.svg` 没有按后缀全局忽略；`resource/`、源码、`public/favicon.svg`、`package-lock.json` 和工作流应正常提交。现有 IDE 文件保留在本地。

## 9. 开发与 GitHub Actions 部署

### 已接通的构建命令

工作流位于 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，已连接项目的检查、构建和发布命令。

此前 Actions 报出的 Missing npm script: check、Missing npm script: build 和 Astro is not installed，已通过实际安装依赖并定义命令修复。项目使用 Node.js 24；`package-lock.json` 已由 npm 生成，必须与 `package.json` 一起提交。

现有命令如下：

| 命令 | 实际行为 |
| --- | --- |
| `npm run dev` | 先准备媒体，再启动 Astro 开发服务器；监听资源并自动刷新 |
| `npm run check` | 先准备媒体，再执行 Astro 类型和内容检查 |
| `npm run build` | 准备资源，再生成完整静态网站到 `dist/` |
| `npm run preview` | 预览已构建的 `dist/`，修改内容后需重新 build |
| `npm test` | 检查资源处理、错误路径、草稿、路由和缩放计算 |
| `npm run test:browser` | 在隔离的临时站点中运行桌面与触屏浏览器测试 |

`check` 和 `build` 都先执行 `npm run prepare:media`，不依赖本地预先生成的文件。动态详情页已经通过 `getStaticPaths()` 枚举内容并渲染，首页及所有栏目使用同一个布局。

### 工作流如何运行

工作流在推送到 `main` 时自动运行，也支持 Actions 页面手动运行；手动选择其他分支时会跳过，避免覆盖主站。工作目录是检出后的仓库根目录，**不要在 YAML 中再加本地外层 `HK-blog/` 或 `Kitazaki-Hinata.github.io/` 路径**。

构建任务按以下顺序执行：

1. 检出源码，设置 Node.js 24，按 `package-lock.json` 缓存 npm 下载内容。
2. 检查 `package.json` 中的 check、build 命令及 Astro 依赖是否已配置。
3. 执行 `npm ci`，按锁文件安装依赖。
4. 配置 GitHub Pages，尽早发现 Pages 尚未启用等问题。
5. 执行 `npm run check` 和 `npm test`，失败时停止。
6. 执行 `npm run build`，失败时停止。
7. 确认生成了非空的 `dist/index.html`。
8. 将 `dist/` 上传为 Pages 构建产物。

发布任务通过 `needs: build` 等待整个构建任务成功，再将产物发布到 `github-pages` 环境，输出访问网址。只有发布任务拥有 `pages: write` 和 `id-token: write` 权限；构建任务仅拥有仓库和 Pages 配置的读取权限。多个运行共用 `pages` 并发组，保留 `cancel-in-progress: false`，不打断正在进行的发布。

工作流使用已核对的官方 Action：checkout v7、setup-node v7、configure-pages v5、upload-pages-artifact v4、deploy-pages v4。Node.js 24 用于项目构建，符合当前 Astro 的安装要求；本地也建议使用 Node.js 24。参考 [Astro 安装要求](https://docs.astro.build/en/install-and-setup/)、[setup-node 配置](https://github.com/actions/setup-node) 和 [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

### 首次发布与网址测试

首次发布按以下步骤操作：

1. 在仓库 `Settings → Pages → Build and deployment → Source` 中选择 **GitHub Actions**。本项目不需要手动创建 `gh-pages` 分支或个人访问令牌。
2. 在仓库根目录运行下面的本地检查与构建命令，并打开 preview 输出的本地网址。
3. 确认首页、背景、导航和详情路由正常；预览结束后使用 Ctrl+C 停止。
4. 将源码、工作流、`package.json`、`package-lock.json`、README 和 `resource/` 示例一起提交，推送到 `main`。`dist/`、依赖及自动生成图片继续忽略。仅存在本地的未跟踪图片不会被 Actions 读取。
5. 打开仓库 `Actions → Deploy Astro to GitHub Pages`，确认 Build Astro site 和 Deploy GitHub Pages 两个任务均成功。
6. 从 `github-pages` 环境打开输出的网址，预期为 `https://kitazaki-hinata.github.io/`；再测试 `/osu/`、`/drawing/`、`/stock/`、`/reading/`、`/happy/`、`/contact/` 以及已实现的详情页，直接刷新详情地址也应正常。

```sh
npm ci
npm run check
npm test
npm run build
npm run preview
```

Windows PowerShell 如果限制 `npm.ps1`，可以把命令里的 `npm` 换成 `npm.cmd`。`npm run preview` 默认输出本地预览网址，保持终端运行即可访问。

`site` 已配置为 `https://kitazaki-hinata.github.io`，`base` 为 `/`，`output` 为 `static`；这个仓库使用用户站点地址，不要把仓库名再次加到 base 中。若以后改用普通项目仓库并部署到 `/<repo>/`，再修改 base，导航和图片 URL 由 `src/lib/urls.ts` 统一处理。参见 [Astro 的 GitHub Pages 部署指南](https://docs.astro.build/en/guides/deploy/github/)。

### 常见失败位置

| 失败位置或现象 | 重点检查 |
| --- | --- |
| 没有触发工作流 | 是否已将 `.github/workflows/deploy.yml` 提交并推送到 main，仓库是否允许 Actions |
| Verify project setup | 是否已配置 Astro 依赖及 check、build 命令；确认推送的是包含依赖和命令的新版 package.json |
| npm ci | `package.json` 和锁文件是否匹配，是否提交了新的锁文件 |
| Configure GitHub Pages | Pages 的 Source 是否设为 GitHub Actions |
| Check project / Build Astro site | 查看第一条错误；确认媒体生成脚本、内容集合、动态路由及资源引用已经实现 |
| Verify website output | 构建是否真的生成了 `dist/index.html`，Astro 输出目录是否被修改 |
| Deploy GitHub Pages | `github-pages` 环境是否允许 main 部署，是否存在等待审核的环境规则 |
| 部署成功但网址或图片 404 | 是否打开了正确网址，site/base 是否正确，图片是否已提交，路径大小写是否一致 |

输出检查只确认首页文件存在且非空，不代表页面内容和所有交互已经正确。GitHub Pages 托管静态文件，新增内容需要提交、推送并等待重新构建部署；浏览器不直接枚举资源目录。网页 URL 统一使用 `/`，资源引用大小写必须与文件一致。

## 10. 验证与下一步

当前已接通统一背景与导航、主页自我介绍、绘画列表、skin 列表及详情、股票与读书文章列表和详情、快乐图文、找我&投喂图片、404、自动缩略图、原图查看器、分类筛选、资源监听和校验。

本地验证命令：

```sh
npm run check
npm test
npm run build
npm run test:browser
```

浏览器测试在 `.cache/` 内创建隔离的站点副本和测试内容，不修改作者的原始资源。Windows 默认使用已安装的 Microsoft Edge；其他系统先运行 `npx playwright install chromium`。Actions 默认运行类型检查、资源测试和构建；浏览器测试可在本地单独执行。

本次类型检查无错误、警告或提示，13 项资源与缩放测试、10 项浏览器测试通过，构建生成 11 个示例页面。资源测试包含照片方向、动画首帧、读书路由冲突以及联系图片选择和路径校验。浏览器测试覆盖桌面双击、绘画单击、键盘与焦点恢复、滚轮和拖动、触屏双指缩放、加载失败、分类 URL 与历史记录、无 JavaScript 回退，以及资源新增、删除和 Markdown 插图替换后的自动更新；新增读书筛选与嵌套详情、草稿隐藏、联系图片查看、旧项目页面 404，以及读书文章和联系配置的自动更新验证。快乐栏目还覆盖图文分组、日期与图片顺序、纯文本换行、多组查看器、草稿隐藏、错误引用、资源清理、自动刷新和空列表。

页面已按设计图接入蓝粉背景、本地字体和毛玻璃样式。线上发布仍需提交并推送到 main，等待 GitHub Actions 成功；本地功能验证不等于已完成线上发布。暂不提供评论区。
