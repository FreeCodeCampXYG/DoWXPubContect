window.generateWeChatHTML = function generateWeChatHTML(contentHTML, style) {
  const colors = {
    "style-tech": { primary: "#2563eb", quote: "#eff6ff" },
    "style-business": { primary: "#a16207", quote: "#fffbeb" },
    "style-emotion": { primary: "#be185d", quote: "#fdf2f8" }
  };
  const c = colors[style] || colors["style-tech"];

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;padding:12px;color:#1f2937;">
  <h1 style="font-size:28px;line-height:1.3;margin:0 0 12px;color:#111827;">今日深度解读</h1>
  <p style="background:${c.quote};border-left:4px solid ${c.primary};padding:10px;line-height:1.75;">导语：以下内容由 AI 辅助整理，供公众号发布参考。</p>
  <div style="line-height:1.8;font-size:16px;">${contentHTML}</div>
  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;" />
  <p style="color:#64748b;font-size:13px;">欢迎留言说说你的看法。</p>
</div>`.trim();
};

window.sanitizeForCopy = function sanitizeForCopy(html) {
  return (html || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
};
