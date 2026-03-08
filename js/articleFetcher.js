function htmlToParagraphText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const paras = [...doc.querySelectorAll("p")]
    .map((p) => p.textContent.trim())
    .filter((p) => p.length >= 50);
  return paras.join("\n\n");
}

window.fetchFullArticle = async function fetchFullArticle(url) {
  if (!url) return "";
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error("全文抓取失败");
  const html = await response.text();
  return htmlToParagraphText(html);
};
