# GitHub Pages 自媒体热点采集 + AI 深度创作系统

纯前端（HTML/CSS/原生 JS）项目，可直接部署在 GitHub Pages。

## 目录结构

```text
/index.html
/css/style.css
/js/app.js
/js/sources.js
/js/articleFetcher.js
/js/skills.js
/js/promptBuilder.js
/js/aiClient.js
/js/markdownRenderer.js
/js/wechatFormatter.js
/js/imageGenerator.js
/js/storage.js
```

## 功能

- 多平台热点采集（Reddit / Google News / Nitter / SpaceX）
- RSS 转 JSON + 热点列表渲染
- 点击热点后自动 deepSearch 全文抓取（r.jina.ai 优先 + allorigins 回退）
- 英文自动翻译（分段，避免单次长度限制）
- 公众号文章 Skill 化处理（默认按“结果先行 → 痛点展开 → 步骤说明 → FAQ → CTA”生成）
- OpenRouter 深度改写（结构化 Markdown，适配公众号文章节奏）
- 免Key快速改写（优先生成 1200-1800 字公众号长文，失败时回退结构化模板）
- Markdown 自动渲染（marked.js）
- 公众号样式排版（科技 / 商业 / 情感，标题与导读随文章风格调整）
- Pollinations 自动生成 3 张插图并插入
- 一键复制安全 HTML（清理 script，可直接粘贴到公众号后台）
- localStorage 保存 API Key / 草稿 / 样式

## 使用

直接打开 `index.html`，或本地服务：

```bash
python3 -m http.server 4173
```

访问：`http://localhost:4173`
