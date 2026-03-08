const dom = {
  platform: document.getElementById("source-platform"),
  target: document.getElementById("source-target"),
  fetchBtn: document.getElementById("fetch-source"),
  sourceList: document.getElementById("source-list"),
  itemTpl: document.getElementById("item-template"),
  apiKey: document.getElementById("api-key"),
  model: document.getElementById("model"),
  rewriteStyle: document.getElementById("rewrite-style"),
  themeStyle: document.getElementById("theme-style"),
  rawInput: document.getElementById("raw-input"),
  aiOutput: document.getElementById("ai-output"),
  markdownPreview: document.getElementById("markdown-preview"),
  imageGrid: document.getElementById("image-grid"),
  rewriteBtn: document.getElementById("rewrite-btn"),
  rewriteNoKeyBtn: document.getElementById("rewrite-no-key-btn"),
  saveBtn: document.getElementById("save-draft-btn"),
  genImagesBtn: document.getElementById("generate-images-btn"),
  formatBtn: document.getElementById("format-wechat-btn"),
  copyBtn: document.getElementById("copy-wechat-btn"),
  htmlOutput: document.getElementById("html-output"),
  wechatPreview: document.getElementById("wechat-preview"),
  status: document.getElementById("status")
};

function setStatus(text, type = "") {
  dom.status.textContent = `状态：${text}`;
  dom.status.className = `status ${type}`.trim();
}

async function withLoading(button, label, fn) {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}

function buildRss2JsonUrl(feedUrl) {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
}

async function fetchRssItems(feedUrl) {
  const res = await fetch(buildRss2JsonUrl(feedUrl));
  if (!res.ok) throw new Error("RSS 抓取失败");
  const json = await res.json();
  return (json.items || []).slice(0, 10).map((i) => ({
    title: i.title || "(无标题)",
    link: i.link,
    summary: (i.contentSnippet || i.description || "").replace(/<[^>]+>/g, "").trim()
  }));
}

function renderSources() {
  dom.platform.innerHTML = "";
  Object.entries(window.SOURCES).forEach(([key, cfg]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = cfg.name;
    dom.platform.appendChild(opt);
  });
}

function onSourcePlatformChange() {
  const cfg = window.SOURCES[dom.platform.value];
  dom.target.value = cfg.defaultTarget || "";
}

async function fillRawFromItem(item) {
  setStatus("正在 deepSearch 全文，请稍候...", "loading");
  let full = "";
  try {
    full = await window.fetchFullArticle(item.link);
  } catch (_error) {
    full = item.summary;
  }
  const picked = (full || item.summary || item.link || "").slice(0, 8000);
  dom.rawInput.value = `标题：${item.title}\n链接：${item.link}\n\n${picked}`;
  setStatus("已获取网页全文并填充到右侧素材区", "success");
}

function renderList(items) {
  dom.sourceList.innerHTML = "";
  items.forEach((item) => {
    const node = dom.itemTpl.content.cloneNode(true);
    const btn = node.querySelector("button");
    btn.textContent = item.title;
    btn.title = item.link;
    btn.onclick = async () => {
      await withLoading(btn, "deepSearch中...", async () => {
        await fillRawFromItem(item);
      });
    };
    dom.sourceList.appendChild(node);
  });
}

async function fetchHotTopics() {
  const source = window.SOURCES[dom.platform.value];
  const target = dom.target.value.trim();
  const feedUrl = source.buildUrl(target);
  const items = await fetchRssItems(feedUrl);
  renderList(items);
  setStatus(`抓取完成，共 ${items.length} 条，已自动拉取首条全文`, "success");
  if (items[0]) await fillRawFromItem(items[0]);
}

async function rewriteContent() {
  const raw = dom.rawInput.value.trim();
  if (!raw) throw new Error("请先抓取或粘贴素材");
  const translated = await window.translateIfNeeded(raw);
  const prompt = window.buildPrompt(translated, dom.rewriteStyle.value);
  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) throw new Error("请填写 OpenRouter API Key");
  const md = await window.callOpenRouter(apiKey, dom.model.value.trim(), prompt);
  dom.aiOutput.value = md;
  dom.markdownPreview.innerHTML = window.renderMarkdown(md);
  setStatus("AI 深度改写完成", "success");
}

function quickRewriteNoKey() {
  const raw = dom.rawInput.value.trim();
  if (!raw) throw new Error("请先抓取素材再改写");
  const article = window.buildNoKeyLongArticle(raw, dom.rewriteStyle.value);
  dom.aiOutput.value = article;
  dom.markdownPreview.innerHTML = window.renderMarkdown(article);
  setStatus("免Key改写完成（约800-1000字）", "success");
}

function generateImages() {
  const urls = window.generateImageUrls(dom.aiOutput.value || dom.rawInput.value);
  dom.imageGrid.innerHTML = "";
  urls.forEach((u) => {
    const img = document.createElement("img");
    img.src = u;
    img.alt = "AI 插图";
    img.onerror = () => {
      img.src = `https://images.weserv.nl/?url=${encodeURIComponent(u.replace(/^https?:\/\//, ""))}`;
    };
    dom.imageGrid.appendChild(img);
  });
  setStatus("插图生成完成", "success");
}

function injectImagesIntoHtml(baseHtml) {
  const imgs = [...dom.imageGrid.querySelectorAll("img")].map((img) => img.src);
  if (!imgs.length) return baseHtml;
  const sections = baseHtml.split(/(<h2[^>]*>.*?<\/h2>)/g);
  let idx = 0;
  return sections.map((seg) => {
    if (/^<h2/i.test(seg) && imgs[idx]) {
      const imageHtml = `<p style="text-align:center;"><img src="${imgs[idx]}" style="width:100%;border-radius:12px;margin:12px 0;" /></p>`;
      idx += 1;
      return `${seg}${imageHtml}`;
    }
    return seg;
  }).join("");
}

function formatWechat() {
  const md = dom.aiOutput.value.trim();
  if (!md) throw new Error("请先生成 AI Markdown 内容");
  const html = window.renderMarkdown(md);
  const withTemplate = window.generateWeChatHTML(html, dom.themeStyle.value);
  const withImages = injectImagesIntoHtml(withTemplate);
  dom.htmlOutput.value = withImages;
  dom.wechatPreview.innerHTML = withImages;
  setStatus("公众号 HTML 已生成", "success");
}

async function copyWechat() {
  const safe = window.sanitizeForCopy(dom.htmlOutput.value);
  if (!safe) throw new Error("请先生成公众号 HTML");
  await navigator.clipboard.writeText(safe);
  setStatus("已复制 HTML，可粘贴到公众号后台", "success");
}

function saveDraft() {
  window.StorageService.save("openrouter_key", dom.apiKey.value.trim());
  window.StorageService.save("draft_raw", dom.rawInput.value);
  window.StorageService.save("draft_ai", dom.aiOutput.value);
  window.StorageService.save("theme_style", dom.themeStyle.value);
  setStatus("草稿与设置已保存", "success");
}

function loadDraft() {
  dom.apiKey.value = window.StorageService.load("openrouter_key", "");
  dom.rawInput.value = window.StorageService.load("draft_raw", "");
  dom.aiOutput.value = window.StorageService.load("draft_ai", "");
  dom.themeStyle.value = window.StorageService.load("theme_style", "style-tech");
  document.body.className = dom.themeStyle.value;
  if (dom.aiOutput.value.trim()) dom.markdownPreview.innerHTML = window.renderMarkdown(dom.aiOutput.value);
}

function initEvents() {
  dom.platform.addEventListener("change", onSourcePlatformChange);
  dom.themeStyle.addEventListener("change", () => { document.body.className = dom.themeStyle.value; });

  dom.fetchBtn.addEventListener("click", async () => {
    try {
      await withLoading(dom.fetchBtn, "抓取中...", async () => {
        setStatus("正在抓取热点列表...", "loading");
        await fetchHotTopics();
      });
    } catch (error) {
      setStatus(error.message, "error");
      alert(error.message);
    }
  });

  dom.rewriteBtn.addEventListener("click", async () => {
    try {
      await withLoading(dom.rewriteBtn, "改写中...", async () => {
        setStatus("正在翻译并调用 AI...", "loading");
        await rewriteContent();
      });
    } catch (error) {
      setStatus(error.message, "error");
      alert(error.message);
    }
  });

  dom.rewriteNoKeyBtn.addEventListener("click", async () => {
    try {
      await withLoading(dom.rewriteNoKeyBtn, "生成中...", async () => {
        setStatus("正在免Key扩写长文...", "loading");
        quickRewriteNoKey();
      });
    } catch (error) {
      setStatus(error.message, "error");
      alert(error.message);
    }
  });

  dom.saveBtn.addEventListener("click", saveDraft);
  dom.genImagesBtn.addEventListener("click", () => withLoading(dom.genImagesBtn, "生成中...", async () => {
    setStatus("正在生成插图...", "loading");
    generateImages();
  }));

  dom.formatBtn.addEventListener("click", () => {
    try { formatWechat(); } catch (error) { setStatus(error.message, "error"); alert(error.message); }
  });

  dom.copyBtn.addEventListener("click", async () => {
    try { await copyWechat(); } catch (error) { setStatus(error.message, "error"); alert(error.message); }
  });
}

renderSources();
onSourcePlatformChange();
loadDraft();
initEvents();
setStatus("就绪");
