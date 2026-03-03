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
  editorOutput: document.getElementById("editor-output")
};

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
  alert("已保存到 localStorage");
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

async function fetchJsonWithFallbacks(endpoints, errorPrefix) {
  let lastError = "";
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await res.json();
      }
      const text = await res.text();
      return JSON.parse(text);
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
  const preferProxyOnly = window.location.protocol.startsWith("http")
    && !["localhost", "127.0.0.1"].includes(window.location.hostname);

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
    const json = await fetchJsonWithFallbacks(endpoints, "Reddit 热点抓取失败（可能是 CORS 或源站拦截）");
    return mapRedditChildren(json);
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
  alert("排版已复制，请直接粘贴至公众号后台！");
}

async function rewriteWithOpenRouter() {
  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) {
    alert("请先输入 OpenRouter API Key，或使用“免Key快速改写”按钮");
    return;
  }

  const style = dom.styleSelect.value;
  const source = dom.rawInput.value.trim();
  if (!source) {
    alert("请先输入或选择原始素材");
    return;
  }

  const userPrompt = `${stylePrompts[style]}\n\n要求：保留核心事实，加入中文互联网热梗，字数控制在800字左右，并生成一个吸引人的标题。\n\n素材如下：\n${source}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: dom.model.value.trim(),
      messages: [
        { role: "system", content: "你是一个科技自媒体大V，擅长中文传播。" },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter 调用失败: ${text}`);
  }

  const data = await res.json();
  dom.aiOutput.value = data.choices?.[0]?.message?.content || "(空响应)";
}

async function translateTextFree(input) {
  if (!input.trim()) return "";
  const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=en|zh-CN`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("免费翻译服务不可用");
  const json = await res.json();
  return json?.responseData?.translatedText || input;
}

async function quickRewriteNoKey() {
  const source = dom.rawInput.value.trim();
  if (!source) {
    alert("请先输入或选择原始素材");
    return;
  }

  let zh = source;
  try {
    zh = await translateTextFree(source);
  } catch (_error) {
    // 翻译失败时使用原文模板兜底
  }

  const lines = zh.split("\n").map((v) => v.trim()).filter(Boolean);
  const titleLine = lines.find((line) => line.startsWith("标题")) || lines[0] || "今日科技热点速览";
  const core = lines.slice(1).join("\n");

  dom.aiOutput.value = [
    `【${titleLine.replace(/^标题[:：]?\s*/, "") || "今日科技热点速览"}】`,
    "",
    "先说结论：这条消息背后反映的是产业节奏变化，短期看是事件，长期看是趋势。",
    "",
    `核心信息：${core || zh}`,
    "",
    "延展点评：从传播角度看，这类新闻更适合用“事实+影响+观点”三段式表达，便于公众号读者快速抓重点。"
  ].join("\n");
}

document.getElementById("fetch-source").addEventListener("click", async () => {
  try {
    const platform = dom.platform.value;
    const target = dom.target.value.trim();
    const items = platform === "reddit"
      ? await fetchReddit(target || "technology")
      : await fetchRssViaRss2Json(target || "https://nitter.net/elonmusk/rss");
    renderSourceList(items);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("rewrite-btn").addEventListener("click", async () => {
  try {
    await rewriteWithOpenRouter();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("rewrite-no-key-btn").addEventListener("click", async () => {
  try {
    await quickRewriteNoKey();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("save-draft-btn").addEventListener("click", saveLocal);

document.getElementById("generate-image-btn").addEventListener("click", () => {
  const keyword = dom.imageKeyword.value.trim() || "space technology breaking news";
  const url = generateImage(keyword);
  dom.imageUrl.value = url;
  dom.previewImage.src = url;
  dom.previewImage.onerror = () => {
    const proxyUrl = toImageProxyUrl(url);
    dom.imageUrl.value = proxyUrl;
    dom.previewImage.src = proxyUrl;
  };
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
});

document.getElementById("copy-wechat-btn").addEventListener("click", copyToWechat);

initStyleOptions();
loadLocal();
