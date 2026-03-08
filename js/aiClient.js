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

window.buildNoKeyLongArticle = function buildNoKeyLongArticle(sourceText, style) {
  const clean = (sourceText || "").replace(/QUERY LENGTH LIMIT EXCEEDED[^\n]*/gi, "").replace(/\s+/g, " ").trim();
  const base = clean.slice(0, 1400);
  const title = (clean.match(/标题[:：]\s*([^\n]+)/)?.[1] || clean.slice(0, 36) || "本周科技热点深读").slice(0, 40);
  const tone = style === "商业分析"
    ? "从商业价值、成本结构与竞争格局切入"
    : style === "情感共鸣"
      ? "从普通用户体验与社会情绪切入"
      : "从技术原理、演进路径与产业化切入";

  const body = [
    `# ${title}`,
    "",
    "> 导语：这篇内容基于热点抓取与全文提炼生成。在公开信息有限的情况下，结合行业背景进行合理推演，帮助你快速形成可发布稿件。",
    "",
    "## 一、事件到底发生了什么",
    `${base || "当前热点显示，相关事件正在持续发酵，核心争议聚焦在产品能力、平台规则与用户感知之间的错位。"}。从时间线来看，最初信号来自社区讨论，随后被媒体放大，再由当事方回应，形成了“事实—情绪—二次解读”的传播链条。`,
    "",
    "## 二、关键角色的真实诉求",
    "从参与方看，平台方追求增长和口碑平衡，内容生产者关心分发和变现，用户关注体验、隐私和价格。表面冲突是一次事件，底层矛盾是平台治理与商业目标之间的长期张力。",
    "",
    "## 三、深层原因与行业结构",
    `${tone}。过去两年，行业在“效率优先”路径上快速推进，导致产品迭代速度快于规则建设。当技术能力突然增强时，旧有运营策略往往不再适配，于是出现争议、回滚、修复、再迭代的循环。`,
    "",
    "## 四、短中长期影响",
    "短期：舆情波动、用户观望、合作方重新评估。\n中期：产品定位和价格策略会调整，组织资源向更高确定性业务倾斜。\n长期：头部平台会通过标准化、透明化和生态合作重建信任，行业门槛将从“功能上线”转向“稳定交付+治理能力”。",
    "",
    "## 五、给内容创作者的发布建议",
    "建议采用“事实摘要—影响判断—个人观点—互动提问”结构。标题要聚焦一个核心冲突，正文尽量给出可验证的信息点，最后设置讨论问题提升读者参与度。",
    "",
    "## 结语",
    "真正决定结果的不是一次热搜，而是后续产品和规则是否持续改进。你更看好“先增长后治理”，还是“先治理后增长”？欢迎留言聊聊。"
  ].join("\n");

  return body;
};
