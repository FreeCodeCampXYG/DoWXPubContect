const stylePrompts = {
  "硬核科普": "你是一个科技媒体主编。请将输入内容翻译并改写为硬核科普文，强调原理、数据和背景。",
  "毒舌点评": "你是一个犀利科技评论员。请保留事实并给出有观点、有梗的毒舌点评，避免人身攻击。",
  "情感共鸣": "你是一个懂传播的科技博主。请保留事实并加入普通读者视角，增强情绪和共鸣。",
  "推特体总结": "请将内容改写为短句、高信息密度的推特体中文总结，分段清晰。"
};

const dom = {
  platform: document.getElementById("source-platform"),
  target: document.getElementById("source-target"),
  list: document.getElementById("source-list"),
  template: document.getElementById("item-template"),
  apiKey: document.getElementById("api-key"),
  model: document.getElementById("model"),
  styleSelect: document.getElementById("style-select"),
  rawInput: document.getElementById("raw-input"),
  aiOutput: document.getElementById("ai-output"),
  imageKeyword: document.getElementById("image-keyword"),
  imageUrl: document.getElementById("image-url"),
  previewImage: document.getElementById("preview-image"),
  htmlOutput: document.getElementById("html-output"),
  editorOutput: document.getElementById("editor-output"),
  status: document.getElementById("status")
};

function setStatus(text, type = "") {
  if (!dom.status) return;
  dom.status.textContent = `状态：${text}`;
  dom.status.className = `status ${type}`.trim();
}

async function withLoading(button, loadingText, runner) {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;
  try {
    return await runner();
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}

function initStyleOptions() {
  Object.keys(stylePrompts).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    dom.styleSelect.appendChild(opt);
  });
}

function saveLocal() {
  localStorage.setItem("openrouter_key", dom.apiKey.value.trim());
  localStorage.setItem("draft_raw", dom.rawInput.value);
  localStorage.setItem("draft_ai", dom.aiOutput.value);
  setStatus("草稿已保存到 localStorage", "success");
}

function loadLocal() {
  dom.apiKey.value = localStorage.getItem("openrouter_key") || "";
  dom.rawInput.value = localStorage.getItem("draft_raw") || "";
  dom.aiOutput.value = localStorage.getItem("draft_ai") || "";
}

function decodeHtml(text = "") {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value.replace(/\s+/g, " ").trim();
}

function trimText(text = "", max = 360) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function extractLinkFromSource(source) {
  const match = source.match(/https?:\/\/[^\s]+/i);
  return match?.[0] || "";
}

async function fetchJsonWithFallbacks(endpoints, errorPrefix) {
  let lastError = "";
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) return await res.json();
      return JSON.parse(await res.text());
    } catch (error) {
      lastError = `${endpoint} -> ${error.message}`;
    }
  }
  throw new Error(`${errorPrefix}：${lastError}`);
}

function mapRedditChildren(json) {
  if (!json?.data?.children) throw new Error("Reddit 数据格式异常，请更换数据源（如 RSS / Nitter）");
  return json.data.children.map((c) => ({
    title: decodeHtml(c.data.title || ""),
    summary: trimText(decodeHtml(c.data.selftext || c.data.url || "")),
    link: `https://reddit.com${c.data.permalink}`
  }));
}

async function fetchReddit(subreddit) {
  const safeSubreddit = encodeURIComponent(subreddit || "technology");
  const redditJsonUrl = `https://www.reddit.com/r/${safeSubreddit}/top/.json?t=day&limit=10&raw_json=1`;
  const preferProxyOnly = window.location.protocol.startsWith("http") && !["localhost", "127.0.0.1"].includes(window.location.hostname);

  const endpoints = preferProxyOnly
    ? [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(redditJsonUrl)}`,
      `https://r.jina.ai/http://${redditJsonUrl.replace(/^https?:\/\//, "")}`
    ]
    : [
      redditJsonUrl,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(redditJsonUrl)}`,
      `https://r.jina.ai/http://${redditJsonUrl.replace(/^https?:\/\//, "")}`
    ];

  try {
    return mapRedditChildren(await fetchJsonWithFallbacks(endpoints, "Reddit 热点抓取失败（可能是 CORS 或源站拦截）"));
  } catch (_error) {
    return fetchRssViaRss2Json(`https://www.reddit.com/r/${safeSubreddit}/.rss`);
  }
}

async function fetchRssViaRss2Json(feedUrl) {
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const res = await fetch(api);
  if (!res.ok) throw new Error("RSS 转换失败，请检查 RSS 地址或稍后重试");
  const json = await res.json();
  return (json.items || []).slice(0, 10).map((i) => ({
    title: decodeHtml(i.title || ""),
    summary: trimText(decodeHtml(i.contentSnippet || i.description || "")),
    link: i.link
  }));
}

async function fetchArticleText(link) {
  if (!link) return "";
  const endpoints = [
    `https://r.jina.ai/http://${link.replace(/^https?:\/\//, "")}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(link)}`
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const text = decodeHtml(await res.text()).replace(/[#>*_`\[\]()]/g, " ");
      if (text.length > 240) return text;
    } catch (_error) {
      // ignore fallback
    }
  }
  return "";
}

function summarizeText(text, maxSentences = 6) {
  const cleaned = decodeHtml(text).replace(/\s+/g, " ");
  const sentences = cleaned.split(/(?<=[。！？.!?])\s+/).filter((s) => s.length > 30);
  if (!sentences.length) return trimText(cleaned, 900);
  return sentences.slice(0, maxSentences).join(" ");
}

function chunkText(text, maxLen = 320) {
  const chunks = [];
  let current = "";
  for (const part of text.split(/\n+/)) {
    if ((current + part).length > maxLen) {
      if (current) chunks.push(current);
      current = part;
    } else {
      current += (current ? "\n" : "") + part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(chunk) {
  const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|zh-CN`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("免费翻译服务不可用");
  const json = await res.json();
  return json?.responseData?.translatedText || chunk;
}

async function translateLongTextFree(text) {
  const chunks = chunkText(text, 320).slice(0, 8);
  const translated = [];
  for (const chunk of chunks) {
    try {
      translated.push(await translateChunk(chunk));
    } catch (_error) {
      translated.push(chunk);
    }
  }
  return translated.join("\n");
}

function renderSourceList(items) {
  dom.list.innerHTML = "";
  items.forEach((item) => {
    const fragment = dom.template.content.cloneNode(true);
    const btn = fragment.querySelector("button");
    btn.textContent = item.title;
    btn.title = item.link;
    btn.onclick = () => {
      dom.rawInput.value = `标题：${item.title}\n链接：${item.link}\n\n${item.summary}`;
      dom.imageKeyword.value = item.title;
      setStatus("已载入选中热点，可继续深度改写", "success");
    };
    dom.list.appendChild(fragment);
  });
}

const generateImage = (keyword) => {
  const width = 800;
  const height = 450;
  const seed = Math.floor(Math.random() * 1000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
};

function toImageProxyUrl(url) {
  return `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ""))}`;
}

function buildWechatHtml(content, imageUrl) {
  const title = (content.split("\n")[0] || "今日科技热点").slice(0, 60);
  const paragraphs = content
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="line-height:1.75;font-size:16px;color:#1f2937;margin:12px 0;">${p}</p>`)
    .join("\n");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;padding:12px;">
  <h1 style="font-size:28px;line-height:1.3;color:#111827;margin:12px 0;">${title}</h1>
  <p style="background:#eff6ff;border-left:4px solid #2563eb;padding:10px;line-height:1.75;color:#1e3a8a;">导语：以下内容由 AI 辅助改写，已保留核心事实并增强可读性。</p>
  ${imageUrl ? `<p style="text-align:center;"><img src="${imageUrl}" style="max-width:100%;border-radius:12px;"/></p>` : ""}
  <h2 style="font-size:22px;border-left:4px solid #2563eb;padding-left:8px;margin-top:18px;">正文</h2>
  ${paragraphs}
</div>`.trim();
}

function copyToWechat() {
  const content = document.getElementById("editor-output");
  const range = document.createRange();
  range.selectNode(content);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  document.execCommand("copy");
  setStatus("排版已复制，请粘贴至公众号后台", "success");
}

async function rewriteWithOpenRouter() {
  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) throw new Error("请先输入 OpenRouter API Key，或使用“免Key快速改写”按钮");
  const style = dom.styleSelect.value;
  const source = dom.rawInput.value.trim();
  if (!source) throw new Error("请先输入或选择原始素材");

  const userPrompt = `${stylePrompts[style]}\n\n要求：保留核心事实，加入中文互联网热梗，字数控制在800字左右，并生成一个吸引人的标题。\n\n素材如下：\n${source}`;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: dom.model.value.trim(),
      messages: [
        { role: "system", content: "你是一个科技自媒体大V，擅长中文传播。" },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!res.ok) throw new Error(`OpenRouter 调用失败: ${await res.text()}`);
  const data = await res.json();
  dom.aiOutput.value = data.choices?.[0]?.message?.content || "(空响应)";
}

async function quickRewriteNoKey() {
  const source = dom.rawInput.value.trim();
  if (!source) throw new Error("请先输入或选择原始素材");

  setStatus("正在提取链接并深度抓取正文...", "loading");
  const link = extractLinkFromSource(source);
  const articleText = await fetchArticleText(link);

  const seed = [source, articleText].filter(Boolean).join("\n\n");
  const summary = summarizeText(seed, 7);

  setStatus("正在分段翻译与生成中文改写...", "loading");
  const zh = await translateLongTextFree(summary);
  const titleLine = source.split("\n").find((line) => line.startsWith("标题：")) || "标题：今日科技热点深读";

  dom.aiOutput.value = [
    `【${titleLine.replace(/^标题[:：]\s*/, "") || "今日科技热点深读"}】`,
    "",
    "导语：基于热点条目与原链接内容提取，以下为可直接用于公众号的中文改写稿。",
    "",
    "一、事件核心",
    trimText(zh, 1200),
    "",
    "二、影响解读",
    "这件事短期影响舆论和相关公司预期，中期会体现在产品策略与监管沟通，长期看将影响行业竞争格局。",
    "",
    "三、可发布观点",
    "对于自媒体写作，建议采用“事实脉络 + 利益相关方 + 趋势判断”的三段结构，兼顾信息密度与可读性。"
  ].join("\n");

  setStatus("免Key深度改写完成", "success");
}

document.getElementById("fetch-source").addEventListener("click", async (event) => {
  try {
    await withLoading(event.currentTarget, "抓取中...", async () => {
      setStatus("正在抓取热点，请稍候...", "loading");
      const platform = dom.platform.value;
      const target = dom.target.value.trim();
      const items = platform === "reddit"
        ? await fetchReddit(target || "technology")
        : await fetchRssViaRss2Json(target || "https://nitter.net/elonmusk/rss");
      renderSourceList(items);
      setStatus(`抓取完成，共 ${items.length} 条`, "success");
    });
  } catch (error) {
    setStatus(error.message, "error");
    alert(error.message);
  }
});

document.getElementById("rewrite-btn").addEventListener("click", async (event) => {
  try {
    await withLoading(event.currentTarget, "生成中...", async () => {
      setStatus("正在调用 OpenRouter 生成改写...", "loading");
      await rewriteWithOpenRouter();
      setStatus("AI 洗稿完成", "success");
    });
  } catch (error) {
    setStatus(error.message, "error");
    alert(error.message);
  }
});

document.getElementById("rewrite-no-key-btn").addEventListener("click", async (event) => {
  try {
    await withLoading(event.currentTarget, "深度改写中...", quickRewriteNoKey);
  } catch (error) {
    setStatus(error.message, "error");
    alert(error.message);
  }
});

document.getElementById("save-draft-btn").addEventListener("click", saveLocal);

document.getElementById("generate-image-btn").addEventListener("click", (event) => {
  withLoading(event.currentTarget, "生成中...", async () => {
    setStatus("正在生成插图地址...", "loading");
    const keyword = dom.imageKeyword.value.trim() || "space technology breaking news";
    const url = generateImage(keyword);
    dom.imageUrl.value = url;
    dom.previewImage.src = url;
    dom.previewImage.onerror = () => {
      const proxyUrl = toImageProxyUrl(url);
      dom.imageUrl.value = proxyUrl;
      dom.previewImage.src = proxyUrl;
      setStatus("原图加载失败，已切换代理预览", "loading");
    };
    setStatus("插图地址已生成", "success");
  });
});

document.getElementById("render-wechat-btn").addEventListener("click", () => {
  const content = dom.aiOutput.value.trim() || dom.rawInput.value.trim();
  if (!content) {
    alert("请先准备内容");
    return;
  }
  const html = buildWechatHtml(content, dom.imageUrl.value.trim());
  dom.htmlOutput.value = html;
  dom.editorOutput.innerHTML = html;
  setStatus("公众号 HTML 已生成", "success");
});

document.getElementById("copy-wechat-btn").addEventListener("click", copyToWechat);

initStyleOptions();
loadLocal();
setStatus("就绪");
