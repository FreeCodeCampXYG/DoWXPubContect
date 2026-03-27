window.generateWeChatHTML = function generateWeChatHTML(contentHTML, style) {
  const colors = {
    "style-tech": { primary: "#2563eb", quote: "#eff6ff", accent: "#dbeafe" },
    "style-business": { primary: "#a16207", quote: "#fffbeb", accent: "#fef3c7" },
    "style-emotion": { primary: "#be185d", quote: "#fdf2f8", accent: "#fbcfe8" }
  };
  const c = colors[style] || colors.style-tech;
  const skill = window.getContentSkill?.("wechat-article");
  const formatter = skill?.buildFormatterOptions ? skill.buildFormatterOptions(style) : {
    title: "今日深度解读",
    summary: "以下内容由 AI 辅助整理，已按公众号阅读习惯进行结构化重写。",
    closing: "欢迎留言讨论：你最关注这条热点的哪个影响面？"
  };

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;padding:16px;color:#1f2937;background:#ffffff;">
  <h1 style="font-size:28px;line-height:1.35;margin:0 0 12px;color:#111827;border:2px solid ${c.primary};border-radius:10px;padding:10px 12px;">${formatter.title}</h1>

  <p style="background:${c.quote};border-left:4px solid ${c.primary};padding:12px;line-height:1.75;border-radius:6px;margin:10px 0 14px;"><strong>本篇导读：</strong>${formatter.summary}</p>

  <div style="line-height:1.9;font-size:16px;background:#fff;border:1px solid ${c.accent};border-radius:8px;padding:14px;">
    ${contentHTML}
  </div>

  <p style="margin-top:16px;padding-top:10px;border-top:1px dashed ${c.accent};color:#64748b;font-size:13px;">${formatter.closing}</p>
</div>`.trim();
};

window.sanitizeForCopy = function sanitizeForCopy(html) {
  return (html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "");
};
