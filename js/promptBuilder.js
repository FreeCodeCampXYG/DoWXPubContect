const STYLE_MAP = {
  "硬核科普": "偏技术、解释原理、给出背景信息",
  "商业分析": "偏产业、商业模式、市场影响",
  "情感共鸣": "偏叙事、读者感受、传播友好"
};

window.buildPrompt = function buildPrompt(content, style) {
  return [
    "你是中文科技自媒体主编，请将内容重写为高可读的公众号稿件。",
    `风格要求：${STYLE_MAP[style] || STYLE_MAP["硬核科普"]}`,
    "输出要求：",
    "1) 先写导语（2-3句）",
    "2) 生成3-5个小标题并分段展开",
    "3) 重新组织逻辑，保留核心事实",
    "4) 结尾增加互动提问",
    "5) 全文使用 Markdown 输出",
    "素材如下：",
    content
  ].join("\n");
};
