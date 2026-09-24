INSERT INTO `feed_sources` (`id`, `name`, `type`, `url`, `language`, `since`, `enabled`) VALUES
  ('google-news-top', 'Google News (トップ)', 'rss', 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', NULL, NULL, 1),
  ('google-news-tech', 'Google News (テクノロジー)', 'rss', 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ja&gl=JP&ceid=JP:ja', NULL, NULL, 1),
  ('github-trending', 'GitHub Trending', 'github-trending', NULL, NULL, 'daily', 1),
  ('hacker-news', 'Hacker News', 'rss', 'https://hnrss.org/frontpage', NULL, NULL, 1),
  ('zenn-trend', 'Zenn トレンド', 'rss', 'https://zenn.dev/feed', NULL, NULL, 1);
