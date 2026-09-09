# 个人博客：架构与文件维护指南

本项目计划使用 Astro + TypeScript + CSS 构建静态个人博客，部署到 GitHub Pages。

**当前阶段：目录、文件骨架、示例资源和 GitHub Pages 工作流已创建。** 页面、内容扫描、缩略图生成和图片查看器尚未实现；`package.json` 仍未安装 Astro 或定义构建命令，因此还没有可运行的网站。工作流已经启用，但当前推送会在项目配置检查处报告缺失项，不会成功部署。

README 位于 Git 仓库根目录，下文路径均相对于此目录。现在可以整理和替换 `resource/` 中的内容；自动展示需要完成后续功能实现及部署后才会生效。

## 1. 栏目与路由

| 栏目 | 地址 | 页面文件 | 内容来源 |
| --- | --- | --- | --- |
| 主页 | `/` | `src/pages/index.astro` | `resource/about.md` + 站点配置 |
| osu skin 列表 | `/osu/` | `src/pages/osu/index.astro` | 每套 skin 的标题和封面 |
| 单套 skin 详情 | `/osu_skin/<id>/` | `src/pages/osu_skin/[id].astro` | 对应 skin 的说明和全部预览图 |
| 绘画展示 | `/drawing/` | `src/pages/drawing/index.astro` | `resource/drawing/` |
| 炒股记录与碎碎念 | `/stock/` | `src/pages/stock/index.astro` | `resource/stock_text/**/*.md` |
| 文章详情 | `/stock/<id>/` | `src/pages/stock/[...id].astro` | 对应 Markdown 正文 |
| 代码项目 | `/projects/` | `src/pages/projects/index.astro` | `resource/projects/**/*.md` |
| 项目详情 | `/projects/<id>/` | `src/pages/projects/[...id].astro` | 对应 Markdown 正文 |

主页首屏展示名字、短简介及栏目入口，下滑进入自我介绍。全站导航在手机上折叠。暂不设计评论区。

osu skin 的文件夹只使用一级标识，因此详情模板命名为 `[id].astro`。文章和项目允许子文件夹，因此使用 `[...id].astro`。这些方括号是实际文件名的一部分，无需手动替换；后续由构建逻辑枚举内容并生成静态页面。参见 [Astro 路由文档](https://docs.astro.build/en/guides/routing/)。

## 2. 已创建的目录与文件

```text
Kitazaki-Hinata.github.io/
├── .github/
│   └── workflows/deploy.yml             # main 推送触发检查、构建与 Pages 发布
├── .gitignore
├── README.md
├── astro.config.mjs                    # 站点 URL、base、静态输出配置
├── package.json                        # 项目元数据，暂未添加依赖和命令
├── package-lock.json                   # 与当前空依赖清单一致的初始锁文件
├── tsconfig.json
├── resource/                           # 人工维护的内容源
│   ├── about.md                        # 示例自我介绍
│   ├── background/
│   │   └── main.svg                    # 全站背景示例
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
│   ├── projects/
│   │   └── example-blog.md             # 示例项目
│   └── images/
│       ├── avatar.svg
│       ├── stock/example.svg           # 文章插图
│       └── projects/example.svg        # 项目封面和截图
├── scripts/
│   └── prepare-media.mjs               # 媒体扫描、缩略图、开发监听占位
├── src/
│   ├── content.config.ts               # Markdown 集合与字段校验占位
│   ├── config/site.ts                  # 名称、背景、头像、导航、社交链接
│   ├── generated/
│   │   ├── .gitkeep                    # 提交到 Git，用于保留目录
│   │   └── media.json                  # 本地空清单占位，已忽略
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ArticleLayout.astro
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── SkinCard.astro
│   │   ├── Gallery.astro
│   │   ├── ImageViewer.astro
│   │   ├── ArticleList.astro
│   │   └── ProjectCard.astro
│   ├── lib/
│   │   ├── content.ts
│   │   └── urls.ts
│   ├── scripts/image-viewer.ts
│   ├── styles/global.css
│   └── pages/
│       ├── index.astro
│       ├── 404.astro
│       ├── osu/index.astro
│       ├── osu_skin/[id].astro
│       ├── drawing/index.astro
│       ├── stock/
│       │   ├── index.astro
│       │   └── [...id].astro
│       └── projects/
│           ├── index.astro
│           └── [...id].astro
└── public/
    ├── favicon.svg                     # 人工维护的网站图标
    └── resource/
        └── .gitkeep                    # 后续公开媒体的输出目录
```

示例图片是真正可打开的 SVG 文件，可直接用浏览器预览，不是改了图片后缀的文本占位。它们仅用于说明文件关系，可以换成自己的 PNG、JPG 或 WebP；如果后缀或文件名改变，同时更新引用。

## 3. 全站统一背景与主页

所有页面，包括文章、skin、项目详情和 404，都通过 `BaseLayout.astro` 使用同一个背景；`ArticleLayout.astro` 复用该布局。

背景原图放入 `resource/background/`。当前 `src/config/site.ts` 中的设置是：

```ts
background: "background/main.svg"
```

此路径相对于 `resource/`，对应 `resource/background/main.svg`。可直接替换该图片；如果改用 `main.webp`，将配置同步改为 `background/main.webp`。目录可以存多张备选图，全站只使用配置选中的一张。

布局后续实现固定全屏背景层、居中覆盖、统一遮罩、半透明内容卡片及图片失败时的纯色回退。详情页不单独设置背景。

自我介绍编辑 `resource/about.md`；站点名称、短简介、头像及社交链接编辑 `src/config/site.ts`。头像路径同样相对于 `resource/`。

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
| 封面及详情缩略图 | 后续由程序生成 | 不需要人工制作或提交 |

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

缺少 `skin.json` 时，计划采用上述默认值，仍以文件夹为一个 skin。图片应放在 `<id>/images/`；`osu_skin/` 根目录不直接放图片。配置路径错误、空图片目录、规范化后重名或无效 JSON 都应在构建时报告具体位置。

### 预期浏览方式

`/osu/` 展示多张 skin 卡片，每张只有标题、封面缩略图和可选简介。点击标题或封面进入 `/osu_skin/<id>/`，展示这套 skin 的全部图片缩略图。

详情页在电脑上双击缩略图打开原图查看器，触屏设备单击打开，并提供键盘 Enter 操作。查看器支持放大、缩小、适应窗口、拖动、上一张、下一张和关闭；支持滚轮或双指缩放、Esc 关闭、焦点恢复及页面滚动锁定。绘画区使用同一个查看器，单击图片打开。

这里区分三次操作：列表点击进入详情，详情双击打开原图，查看器内操作缩放。JavaScript 不可用时保留通向原图的普通链接。

### 添加与更新

1. 复制 `example-skin/`，改成新文件夹名。
2. 替换 `images/` 内的示例图，可放任意多张预览原图。
3. 修改 `skin.json` 的标题、封面、说明和排序。
4. 删除不需要的示例图片；如果删除的是封面，同时更新 `cover`。
5. 提交并推送。后续实现自动构建后，部署成功即可更新列表与详情。

更改标题修改 `title`，更换封面修改 `cover`，增加截图放入 `images/`，暂时隐藏设置 `draft: true`。可用同名文件替换旧原图；生成资源应包含内容哈希或版本标识，使更换后不会继续显示缓存的旧图。

## 5. 绘画、文章插图与代码项目

绘画放入 `resource/drawing/`，支持子文件夹。已有一张示例 SVG，以及同目录、同名的 JSON：

```json
{
  "title": "示例绘画：落日",
  "date": "2026-09-09",
  "description": "用于演示绘画文件与同名说明文件的对应关系，可替换为自己的作品。",
  "alt": "紫色天空下的落日与山形"
}
```

只放图片也应能展示；JSON 为可选。标题默认取文件名，日期优先取 JSON，其次解析文件名开头的 `YYYY-MM-DD`。有日期的作品倒序排列，无日期的在后，同日期按相对路径排序，不使用 Git 检出时会变化的文件修改时间。同目录应避免仅扩展名不同的同名图片，以免说明文件产生歧义。

头像、文章插图和项目截图放入 `resource/images/`。现有 `stock/`、`projects/` 子目录各有示例图片。

每个代码项目使用一份 `resource/projects/**/*.md`，可复制 `example-blog.md`。支持 `title`、`description`、`tags`、`repo`、`demo`、`cover`、`order`、`draft`；缺少仓库、演示地址或封面时，隐藏相应入口。项目 `cover` 相对于 `resource/`，例如 `images/projects/example.svg`。项目按 order 升序、标识排序，未指定 order 的在后。

## 6. 炒股记录与碎碎念

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

后续构建时读取所有 Markdown，`/stock/` 自动列出标题，点击进入对应静态文章页：

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
| `category` | “碎碎念”；可选“炒股记录” |
| `tags` | 空数组 |
| `description` | 从正文提取纯文本摘要 |
| `draft` | false；true 时不生成列表条目和详情页 |

列表按日期倒序，无日期的在后，同日期按文章标识排序，并提供分类筛选。文章标识来自相对路径去掉扩展名，保留子目录，例如 `2026/review.md` 对应 `/stock/2026/review/`；重命名后网址会改变。构建时应检测路由冲突和无效字段并报告源文件。

正文插图优先使用相对于 Markdown 文件的路径，这样在编辑器中也能预览；上例使用 `../images/stock/example.svg`。嵌套目录中的文章需要相应增加 `../`。也可约定 `resource/images/...` 表示仓库根目录下的资源。后续由统一的链接处理器解析源文件位置、校验引用，再转为带站点 base 的公开 URL。

文章和项目计划采用 Astro 构建时内容集合，通过 `glob()` 读取、`getStaticPaths()` 生成详情路由、`render()` 渲染正文，参考 [Astro 内容集合文档](https://docs.astro.build/en/guides/content-collections/)。

## 7. 资源扫描与生成产物约定

`resource/` 是内容源，`public/resource/` 是程序生成的公开媒体目录。本项目统一使用这两个位置，不另设 `public/generated/`，避免维护两份输出。

后续 `prepare-media.mjs` 负责：

1. 扫描绘画和各套 skin 的图片，读取元数据和宽高。
2. 校验封面、插图、重名文件及字段格式。
3. 输出原图、缩略图和公开的背景／插图。
4. 生成 `src/generated/media.json`，供 Astro 页面生成列表和详情。
5. 在开发时监听新增、修改和删除；正式构建时重建专用输出目录，避免残留已删除资源。

计划支持 JPG、JPEG、PNG、WebP、AVIF、GIF，以及仓库中自行维护的 SVG，扩展名大小写统一处理。普通位图生成 WebP 缩略图，GIF 可使用首帧缩略图并保留原动画，SVG 示例可直接复用为缩略图。列表按缩略图加载，打开查看器才加载原图；图片保留比例及宽高信息，屏幕外图片延迟加载。

预期公开目录如下，尚未生成，文件名示例中的哈希由图片内容决定：

```text
public/resource/
├── .gitkeep
├── background/main.<hash>.svg
├── images/...
├── drawing/
│   ├── originals/...
│   └── thumbnails/...
└── osu_skin/
    └── example-skin/
        ├── originals/...
        └── thumbnails/...
```

媒体清单保存原图／缩略图相对 URL、宽高、标题、说明、日期及 skin 标识；背景和插图的源文件与公开 URL 映射也由生成逻辑维护。页面通过清单定位图片，不自行拼接生成文件名。

不直接公开 Markdown 和 JSON 源文件。原始内容只由构建工具读取；公开仓库中的源文件依然可以在 GitHub 查看，因此 `draft` 仅控制网站展示。

当前 `src/generated/media.json` 仅为空清单占位，已被 Git 忽略。新的克隆只保留 `.gitkeep`；后续构建必须先生成清单，再加载页面。清理仅限专用生成目录，保留 `.gitkeep`，不能删除人工维护的 `resource/` 或 `public/favicon.svg`。

## 8. Git 忽略规则

当前 `.gitignore` 已覆盖：

| 类型 | 忽略内容 |
| --- | --- |
| 依赖和缓存 | `node_modules/`、`.astro/`、`.cache/`、`.vite/`、`*.tsbuildinfo` |
| 构建与检查结果 | `dist/`、`coverage/` |
| 自动生成内容 | `src/generated/*`、`public/resource/*`，各自保留 `.gitkeep` |
| 本地配置 | `.env`、`.env.*`、`*.local`，允许提交 `.env.example` |
| 日志与临时文件 | `*.log`、`*.tmp`、`*.temp`、`*.swp`、`*.swo`、`*.bak`、`*~` |
| IDE 与系统文件 | `.idea/`、`.vscode/`、`*.iml`、`.DS_Store`、`Thumbs.db`、`Desktop.ini` |

图片、`.md`、`.json`、`.svg` 没有按后缀全局忽略；`resource/`、源码、`public/favicon.svg`、`package-lock.json` 和工作流应正常提交。现有 IDE 文件保留在本地。

## 9. 开发与 GitHub Actions 部署

### 当前还缺什么

工作流位于 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，已配置实际的检查、构建和发布步骤，但 YAML 不会自动实现网站。

当前 `package.json` 的 scripts 和依赖为空，`package-lock.json` 只记录初始项目；页面与资源脚本仍是 TODO。**直接推送当前版本，会在 `Verify project setup` 步骤提示缺少 check、build 命令和 Astro 依赖，无法获得可测试的新站点。** 这属于项目尚未实现，不是 GitHub Pages 配置或 YAML 缩进错误。

下一阶段需要安装兼容的 Astro、TypeScript、检查及图片处理依赖，由 npm 更新并提交锁文件，同时实现页面和以下命令：

| 计划命令 | 职责与约束 |
| --- | --- |
| `npm run dev` | 准备资源、启动监听及本地开发服务器 |
| `npm run check` | 准备检查所依赖的媒体清单，再检查类型、内容字段、引用路径及重复路由 |
| `npm run build` | 准备资源，再生成完整静态网站到 `dist/` |
| `npm run preview` | 预览已构建的 `dist/` |

`check` 和 `build` 都应能在干净检出的仓库中执行，不能依赖未提交的 `src/generated/media.json`。需要的生成步骤放入各自的 npm 脚本或生命周期钩子中；不要用 `--if-present` 跳过缺失命令。动态详情页还需要实现 `getStaticPaths()`，仅安装依赖仍不足以构建当前占位文件。

### 工作流如何运行

工作流在推送到 `main` 时自动运行，也支持 Actions 页面手动运行；手动选择其他分支时会跳过，避免覆盖主站。工作目录是检出后的仓库根目录，**不要在 YAML 中再加本地外层 `HK-blog/` 或 `Kitazaki-Hinata.github.io/` 路径**。

构建任务按以下顺序执行：

1. 检出源码，设置 Node.js 24，按 `package-lock.json` 缓存 npm 下载内容。
2. 检查 `package.json` 中的 check、build 命令及 Astro 依赖是否已配置。
3. 执行 `npm ci`，按锁文件安装依赖。
4. 配置 GitHub Pages，尽早发现 Pages 尚未启用等问题。
5. 执行 `npm run check`，失败时停止。
6. 执行 `npm run build`，失败时停止。
7. 确认生成了非空的 `dist/index.html`。
8. 将 `dist/` 上传为 Pages 构建产物。

发布任务通过 `needs: build` 等待整个构建任务成功，再将产物发布到 `github-pages` 环境，输出访问网址。只有发布任务拥有 `pages: write` 和 `id-token: write` 权限；构建任务仅拥有仓库和 Pages 配置的读取权限。多个运行共用 `pages` 并发组，保留 `cancel-in-progress: false`，不打断正在进行的发布。

工作流使用已核对的官方 Action：checkout v7、setup-node v7、configure-pages v5、upload-pages-artifact v4、deploy-pages v4。Node.js 24 用于项目构建，符合当前 Astro 的安装要求；本地也建议使用 Node.js 24。参考 [Astro 安装要求](https://docs.astro.build/en/install-and-setup/)、[setup-node 配置](https://github.com/actions/setup-node) 和 [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

### 首次发布与网址测试

以下步骤应在网站具备构建条件后执行：

1. 在仓库 `Settings → Pages → Build and deployment → Source` 中选择 **GitHub Actions**。本项目不需要手动创建 `gh-pages` 分支或个人访问令牌。
2. 在仓库根目录运行下面的本地检查与构建命令，并打开 preview 输出的本地网址。
3. 确认首页、背景、导航和详情路由正常；预览结束后使用 Ctrl+C 停止。
4. 将源码、工作流、`package.json`、`package-lock.json`、README 和 `resource/` 示例一起提交，推送到 `main`。`dist/`、依赖及自动生成图片继续忽略。仅存在本地的未跟踪图片不会被 Actions 读取。
5. 打开仓库 `Actions → Deploy Astro to GitHub Pages`，确认 Build Astro site 和 Deploy GitHub Pages 两个任务均成功。
6. 从 `github-pages` 环境打开输出的网址，预期为 `https://kitazaki-hinata.github.io/`；再测试 `/osu/`、`/drawing/`、`/stock/`、`/projects/` 以及已实现的详情页，直接刷新详情地址也应正常。

```sh
npm ci
npm run check
npm run build
npm run preview
```

以上命令当前会因项目尚未实现而失败，不能把它们当作已经验证可运行的步骤。Windows PowerShell 如果限制 `npm.ps1`，可以把命令里的 `npm` 换成 `npm.cmd`。

`site` 已预留为 `https://kitazaki-hinata.github.io`，`base` 为 `/`，`output` 为 `static`；这个仓库使用用户站点地址，不要把仓库名再次加到 base 中。若以后改用普通项目仓库并部署到 `/<repo>/`，再修改 base，导航和图片 URL 由 `src/lib/urls.ts` 统一处理。参见 [Astro 的 GitHub Pages 部署指南](https://docs.astro.build/en/guides/deploy/github/)。

### 常见失败位置

| 失败位置或现象 | 重点检查 |
| --- | --- |
| 没有触发工作流 | 是否已将 `.github/workflows/deploy.yml` 提交并推送到 main，仓库是否允许 Actions |
| Verify project setup | 是否已配置 Astro 依赖及 check、build 命令；当前骨架预期停在这里 |
| npm ci | `package.json` 和锁文件是否匹配，是否提交了新的锁文件 |
| Configure GitHub Pages | Pages 的 Source 是否设为 GitHub Actions |
| Check project / Build Astro site | 查看第一条错误；确认媒体生成脚本、内容集合、动态路由及资源引用已经实现 |
| Verify website output | 构建是否真的生成了 `dist/index.html`，Astro 输出目录是否被修改 |
| Deploy GitHub Pages | `github-pages` 环境是否允许 main 部署，是否存在等待审核的环境规则 |
| 部署成功但网址或图片 404 | 是否打开了正确网址，site/base 是否正确，图片是否已提交，路径大小写是否一致 |

输出检查只确认首页文件存在且非空，不代表页面内容和所有交互已经正确。GitHub Pages 托管静态文件，新增内容需要提交、推送并等待重新构建部署；浏览器不直接枚举资源目录。网页 URL 统一使用 `/`，资源引用大小写必须与文件一致。

## 10. 后续实现与验收

1. 安装依赖并连接本地开发、检查与构建命令。
2. 实现共享布局、统一背景、导航、主页和自我介绍。
3. 实现 Markdown 集合、标题列表、文章及项目详情。
4. 实现媒体扫描、skin 列表／详情、绘画画廊和图片查看器。
5. 连接 GitHub Pages 发布流程并验证。

验收要点：

- 五个栏目及所有详情页、404 共用同一张背景。
- 添加第二套 skin 后，列表出现独立标题和封面，点击进入各自详情。
- 详情列出对应 images 中的所有图片，电脑双击和触屏单击可打开原图。
- 图片缩放、拖动、切换、关闭与键盘操作正常。
- 新增绘画或 Markdown 后，不修改页面代码即可在下一次构建展示。
- 无元数据 Markdown 可显示标题并进入正文，刷新详情网址正常。
- 删除内容不残留旧列表、详情及对应 skin 图片；草稿不进入公开页面。
- 空栏目显示占位说明，错误配置报告具体文件，构建失败不发布新版本。
- 根路径和项目子路径部署时，导航、图片及文章链接均正确。
- 不提供评论区。

