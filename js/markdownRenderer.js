window.renderMarkdown = function renderMarkdown(text) {
  if (window.marked) return window.marked.parse(text || "");
  const escaped = (text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
};
