# AI Pulse

> 全球 AI 资讯每日聚合

每日自动更新，聚焦全球 AI 领域重要动态，包括行业动态、技术进展、社区洞察和工具与应用。

## 🌐 在线访问

访问地址：https://lunzi1992.github.io/ai-pulse

## 📡 数据结构

数据存储在 `news.json`，包含：

```json
{
  "meta": {
    "title": "AI Pulse",
    "subtitle": "全球 AI 资讯每日聚合",
    "description": "国内 + 国际 | 行业动态 | 技术进展 | 社区洞察 | 工具与应用",
    "lastUpdate": "2026-04-21",
    "updatedAt": "2026-04-21T09:16:33.083Z",
    "version": "4.0"
  },
  "hotKeywords": [
    { "name": "关键词", "count": 次数 }
  ],
  "news": [
    {
      "id": "唯一ID",
      "date": "2026-04-21",
      "title": "新闻标题",
      "summary": "新闻摘要",
      "module": "industry/tech/community/tools",
      "region": "cn/global",
      "source": "来源",
      "url": "原文链接",
      "importance": "high/medium/low"
    }
  ]
}
```

## 📁 项目结构

```
ai-pulse/
├── config.js         # 配置文件（RSS源、关键词、模块元数据）
├── utils.js          # 工具函数（日期处理、文本清理、HTML转义）
├── parsers.js        # 解析器（RSS、Atom、GitHub Trending）
├── update-news.js    # 主脚本（数据采集、过滤、分类、生成）
├── index.html        # 前端页面
├── news.json         # 生成的数据文件
├── daily/            # Markdown 日报存档
├── package.json      # 项目配置
└── README.md         # 项目说明
```

## ⚙️ 自动化

- 每日 08:30 自动抓取新闻，更新 `news.json`
- 自动推送到 GitHub，触发 GitHub Pages 部署
- 同步通过 Server酱推送到个人微信

## 🛠️ 本地开发

```bash
# 克隆仓库
git clone https://github.com/lunzi1992/ai-pulse.git

# 安装依赖
npm install

# 运行数据更新脚本
node update-news.js

# 启动本地服务器
python3 -m http.server 8000

# 访问 http://localhost:8000
```

## 🔥 核心功能

1. **多源采集**：从多个 RSS 源自动抓取 AI 相关新闻
2. **智能过滤**：基于关键词过滤和分类新闻
3. **热词提取**：自动提取每日热词
4. **Markdown 生成**：生成每日 Markdown 日报
5. **微信推送**：通过 Server酱推送到个人微信
6. **前端缓存**：使用本地存储缓存，提高页面加载速度
7. **响应式设计**：适配不同设备屏幕

## 📝 技术栈

- **后端**：Node.js、axios、cheerio
- **前端**：HTML5、CSS3、JavaScript
- **部署**：GitHub Pages、GitHub Actions

## 🤝 贡献

欢迎提交 Issue 和 Pull Request，一起改进 AI Pulse！
