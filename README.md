# 全球视野自媒体工作台

纯前端工具：抓取国际热点、AI 改写、生图、微信排版。

## 使用

直接打开 `index.html`，或启动本地服务：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 功能

- Reddit / RSS（含 Nitter）热点抓取（自动清洗摘要，静态部署自动避开 Reddit 直连并回退 RSS）
- OpenRouter 免费模型改写
- Pollinations 免费生图 URL 生成
- 微信公众号富文本 HTML 生成与一键复制
- localStorage 保存 API Key 和草稿

- 新增「免Key快速改写」按钮（免费翻译服务 + 模板改写兜底）
- 生图预览失败时自动切换图片代理（images.weserv.nl）
