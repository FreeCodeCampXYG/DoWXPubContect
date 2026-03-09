function parseHtmlToParagraphs(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,iframe,header,footer,nav,aside,form").forEach((n) => n.remove());

  const candidates = [
    ...doc.querySelectorAll("article p"),
    ...doc.querySelectorAll("main p"),
    ...doc.querySelectorAll("[role='main'] p"),
    ...doc.querySelectorAll("p")
  ];

  const lines = [];
  const seen = new Set();
  for (const p of candidates) {
    const text = (p.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length < 50) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    lines.push(text);
    if (lines.length >= 80) break;
  }
  return lines.join("\n\n");
}

async function fetchViaAllOrigins(url) {
  const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("allorigins 抓取失败");
  return res.text();
}

async function fetchViaJina(url) {
  const endpoint = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("jina deepSearch 抓取失败");
  return res.text();
}

window.fetchFullArticle = async function fetchFullArticle(url) {
  if (!url) return "";

  const errors = [];
  try {
    const deepText = await fetchViaJina(url);
    const cleaned = deepText.replace(/\s+/g, " ").trim();
    if (cleaned.length > 500) return cleaned;
  } catch (error) {
    errors.push(error.message);
  }

  try {
    const html = await fetchViaAllOrigins(url);
    const parsed = parseHtmlToParagraphs(html);
    if (parsed.length > 300) return parsed;
  } catch (error) {
    errors.push(error.message);
  }

  throw new Error(`全文抓取失败：${errors.join("; ")}`);
};
