# AI Pulse

> AI Coding & 具身智能信息聚合站

每日自动更新，聚焦 AI Coding 与具身智能领域重要动态。

## 🌐 在线访问

访问地址：https://lunzi1992.github.io/ai-pulse

## 📡 数据结构

数据存储在 `news.json`，包含：

```json
{
  "meta": { "title": "", "subtitle": "", "description": "" },
  "hotKeywords": [{ "keyword": "关键词", "count": 次数 }],
  "weekFocus": [{ "title": "标题", "desc": "描述" }],
  "news": [
    {
      "id": "唯一ID",
      "date": "2026-04-09",
      "title": "新闻标题",
      "content": "新闻内容",
      "tags": ["AI Coding", "具身智能"],
      "source": "来源",
      "importance": "high/medium/low"
    }
  ]
}
```

## ⚙️ 自动化

- 每日 08:30 自动抓取新闻，更新 `news.json`
- 自动推送到 GitHub，触发 GitHub Pages 部署
- 同步通过 Server酱推送到个人微信

## 🛠️ 本地开发

```bash
# 克隆仓库
git clone https://github.com/lunzi1992/ai-pulse.git

# 直接用浏览器打开 index.html 即可
open index.html
```

## 📝 更新数据

编辑 `news.json` 文件，遵循上述数据结构即可。
