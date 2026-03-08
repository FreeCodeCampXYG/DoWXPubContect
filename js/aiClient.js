function splitChunks(text, size = 320) {
  const chunks = [];
  let current = "";
  text.split(/\n+/).forEach((part) => {
    if ((current + part).length > size) {
      if (current) chunks.push(current);
      current = part;
    } else {
      current += (current ? "\n" : "") + part;
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
  return data?.responseData?.translatedText || chunk;
}

window.translateIfNeeded = async function translateIfNeeded(content) {
  const hasEnglish = /[a-zA-Z]{4,}/.test(content);
  if (!hasEnglish) return content;
  const chunks = splitChunks(content, 320).slice(0, 10);
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
