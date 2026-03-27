function splitChunks(text, size = 260) {
  const chunks = [];
  let current = "";
  text.split(/\n+/).forEach((part) => {
    const normalized = part.trim();
    if (!normalized) return;
    if ((current + normalized).length > size) {
      if (current) chunks.push(current);
      current = normalized;
    } else {
      current += (current ? "\n" : "") + normalized;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

async function translateChunk(chunk) {
  const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|zh-CN`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("翻译服务失败");
  const data = await res.json();
  const translated = data?.responseData?.translatedText || chunk;
  if (/QUERY LENGTH LIMIT EXCEEDED/i.test(translated)) throw new Error("翻译长度限制");
  return translated;
}

window.translateIfNeeded = async function translateIfNeeded(content) {
  const hasEnglish = /[a-zA-Z]{4,}/.test(content);
  if (!hasEnglish) return content;
  const chunks = splitChunks(content, 260).slice(0, 16);
  const translated = [];
  for (const c of chunks) {
    try { translated.push(await translateChunk(c)); } catch (_e) { translated.push(c); }
  }
  return translated.join("\n");
};

window.callOpenRouter = async function callOpenRouter(apiKey, model, prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你是高水平中文科技编辑。" },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenRouter 调用失败: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
};

function fallbackNoKeyArticle(sourceText, style) {
  const skill = window.getContentSkill?.("wechat-article");
  if (skill?.buildFallbackArticle) {
    return skill.buildFallbackArticle(sourceText, style);
  }

  const clean = (sourceText || "").replace(/QUERY LENGTH LIMIT EXCEEDED[^\n]*/gi, "").replace(/\s+/g, " ").trim();
  const title = (clean.match(/标题[:：]\s*([^\n]+)/)?.[1] || clean.slice(0, 40) || "本周科技热点深读").slice(0, 40);
  const angle = style === "商业分析" ? "商业与产业" : style === "情感共鸣" ? "用户与社会" : "技术与趋势";

  return [
    `# ${title}`,
    "",
    "> 导语：基于热点与公开信息进行结构化提炼，以下为可直接用于公众号发布的深度稿件。",
    "",
    "## 一、事件脉络",
    `${clean.slice(0, 1000) || "当前事件持续发酵，核心争议围绕产品能力、平台规则与用户预期。"}`,
    "",
    "## 二、关键影响",
    `从${angle}视角看，短期会影响舆情与预期，中期会推动策略调整，长期将改变行业协作与竞争方式。`,
    "",
    "## 三、发布建议",
    "建议采用“事实信息-影响判断-观点输出-互动问题”四段结构，以提升转发率和评论质量。",
    "",
    "## 结语",
    "热点只是入口，真正值得关注的是后续动作和结构性变化。你怎么看？"
  ].join("\n");
}

window.buildNoKeyLongArticle = async function buildNoKeyLongArticle(sourceText, style) {
  const clean = (sourceText || "").replace(/QUERY LENGTH LIMIT EXCEEDED[^\n]*/gi, " ").slice(0, 3500);
  const skill = window.getContentSkill?.("wechat-article");
  const styleHint = window.getRewriteStyleHint?.(style) || style;
  const prompt = [
    skill?.buildNoKeyPrompt
      ? skill.buildNoKeyPrompt(clean, style, styleHint)
      : [
        "你是中文科技自媒体主编。",
        `请把下面素材写成 800-1000 字的深度文章，风格：${style}。`,
        "要求：",
        "1. 使用 Markdown",
        "2. 包含导语、4-6 个小标题、结尾互动问题",
        "3. 不要胡编具体数字，事实不明处要用‘公开信息显示’等稳健表达",
        "4. 语言自然，避免模板腔",
        "素材：",
        clean
      ].join("\n")
  ].join("\n");

  try {
    const endpoint = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&seed=${Date.now()}&json=false`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("免Key模型不可用");
    const text = (await res.text()).trim();
    if (text.length < 400) throw new Error("免Key模型返回过短");
    return text;
  } catch (_error) {
    return fallbackNoKeyArticle(sourceText, style);
  }
};
