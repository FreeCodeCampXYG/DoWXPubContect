window.SOURCES = {
  reddit: {
    name: "Reddit",
    type: "rss",
    defaultTarget: "technology",
    buildUrl: (target) => `https://www.reddit.com/r/${target || "technology"}/.rss`
  },
  googlenews: {
    name: "Google News",
    type: "rss",
    defaultTarget: "AI",
    buildUrl: (target) => `https://news.google.com/rss/search?q=${encodeURIComponent(target || "AI")}`
  },
  twitter: {
    name: "Twitter (Nitter)",
    type: "rss",
    defaultTarget: "elonmusk",
    buildUrl: (user) => `https://nitter.net/${user || "elonmusk"}/rss`
  },
  spacex: {
    name: "SpaceX",
    type: "rss",
    defaultTarget: "",
    buildUrl: () => "https://www.spacex.com/feeds/news/"
  }
};
