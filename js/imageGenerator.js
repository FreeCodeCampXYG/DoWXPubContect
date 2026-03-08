function extractKeyword(text) {
  const clean = (text || "").replace(/[#*`>\-]/g, " ").replace(/\s+/g, " ").trim();
  return clean.split(" ").slice(0, 10).join(" ") || "global tech news illustration";
}

window.generateImageUrls = function generateImageUrls(sourceText) {
  const keyword = extractKeyword(sourceText);
  const width = 960;
  const height = 540;
  return [0, 1, 2].map((i) => {
    const seed = Math.floor(Math.random() * 10000) + i;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
  });
};
