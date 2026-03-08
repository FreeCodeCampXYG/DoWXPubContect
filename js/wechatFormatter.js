window.generateWeChatHTML = function generateWeChatHTML(contentHTML, style) {
  const colors = {
    "style-tech": { primary: "#2563eb", quote: "#eff6ff", accent: "#dbeafe" },
    "style-business": { primary: "#a16207", quote: "#fffbeb", accent: "#fef3c7" },
    "style-emotion": { primary: "#be185d", quote: "#fdf2f8", accent: "#fbcfe8" }
  };
  const c = colors[style] || colors.style-tech;

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;padding:16px;color:#1f2937;background:#ffffff;">
  <div style="border:2px solid ${c.primary};border-radius:12px;padding:12px 14px;background:linear-gradient(180deg,#fff,${c.quote});margin-bottom:12px;">
    <h1 style="font-size:28px;line-height:1.35;margin:0;color:#111827;">今日深度解读</h1>
    <p style="margin:8px 0 0;color:#475569;font-size:14px;">Global Insight · AI 辅助写作稿</p>
  </div>

  <p style="background:${c.quote};border-left:5px solid ${c.primary};padding:12px;line-height:1.75;border-radius:8px;">导语：以下内容由 AI 辅助整理，已按公众号阅读习惯进行结构化重写。</p>

  <div style="line-height:1.9;font-size:16px;background:#fff;border:1px solid ${c.accent};border-radius:10px;padding:14px;">
    ${contentHTML}
  </div>

  <div style="margin-top:16px;padding-top:10px;border-top:2px dashed ${c.accent};color:#64748b;font-size:13px;">
    欢迎留言讨论：你最关注这条热点的哪个影响面？
  </div>
</div>`.trim();
};

window.sanitizeForCopy = function sanitizeForCopy(html) {
  return (html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "");
};
