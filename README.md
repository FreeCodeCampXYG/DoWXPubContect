# GitHub Pages 自媒体热点采集 + AI 深度创作系统

纯前端（HTML/CSS/原生 JS）项目，可直接部署在 GitHub Pages。

## 目录结构

```text
/index.html
/css/style.css
/js/app.js
/js/sources.js
/js/articleFetcher.js
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
- OpenRouter 深度改写（结构化 Markdown）
- 免Key快速改写（短内容自动扩展到约 800-1000 字）
- Markdown 自动渲染（marked.js）
- 公众号样式排版（科技 / 商业 / 情感）
- Pollinations 自动生成 3 张插图并插入
- 一键复制安全 HTML（清理 script）
- localStorage 保存 API Key / 草稿 / 样式

## 使用

直接打开 `index.html`，或本地服务：

```bash
python3 -m http.server 4173
```

访问：`http://localhost:4173`
