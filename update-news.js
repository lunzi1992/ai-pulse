/**
 * AI Pulse v4 - 全球 AI 资讯聚合
 * 行业动态 | 技术进展 | 社区洞察 | 工具与应用
 * 国内 / 国际 双轨展示
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ==================== 停用词表（热词过滤）===================================

const STOPWORDS = new Set([
  // 英文停用词
  'the','and','for','with','this','that','from','are','was','were','has','have',
  'had','will','would','could','should','can','may','might','shall','does','did',
  'but','not','also','all','any','its','our','your','their','they','them','these',
  'those','each','been','being','more','some','into','over','then','than','such',
  'out','new','use','one','two','three','get','set','let','via','per','way','how',
  'who','what','when','where','why','just','now','only','both','about','after',
  // 技术噪音词
  'utm','amp','feed','atom','href','posts','https','http','www','com','org','net',
  'producthunt','github','rss','xml','json','html','css','url','img','src',
  // 其它无意义词
  'more','less','here','there','much','many','most','other','long','also','even',
  'back','first','last','same','next','good','best','high','low','old','big','great'
]);

// ==================== 数据源配置 =========================================

const FEEDS = [
  // ── 国内·行业动态 ──────────────────────────────────────────────────────
  {
    module: 'industry', region: 'cn',
    name: 'IT之家',
    url: 'https://www.ithome.com/rss/',
    filterFn: rssParser(50)
  },
  {
    module: 'industry', region: 'cn',
    name: '36氪',
    url: 'https://36kr.com/feed',
    filterFn: rssParser(50)
  },
  {
    module: 'industry', region: 'cn',
    name: '虎嗅',
    url: 'https://www.huxiu.com/rss/0.xml',
    filterFn: rssParser(30)
  },
  {
    module: 'industry', region: 'cn',
    name: '腾讯科技',
    url: 'https://tech.qq.com/rss.xml',
    filterFn: rssParser(30)
  },
  {
    module: 'industry', region: 'cn',
    name: '机器之心',
    url: 'https://syncedreview.com/feed/',
    filterFn: rssParser(30)
  },

  // ── 国内·技术进展 ─────────────────────────────────────────────────────
  {
    module: 'tech', region: 'cn',
    name: '量子位',
    url: 'https://qbitai.com/feed',
    filterFn: rssParser(30)
  },

  // ── 国际·技术进展 ─────────────────────────────────────────────────────
  {
    module: 'tech', region: 'global',
    name: 'HackerNews-AI',
    url: 'https://hnrss.org/newest?q=AI%20OR%20%22machine%20learning%22%20OR%20%22large%20language%22%20OR%20GPT%20OR%20Claude%20OR%20LLM%20OR%20%22deep%20learning%22%20OR%20%22neural%20network%22%20OR%20robotics&count=50',
    filterFn: rssParser(50)
  },
  {
    module: 'tech', region: 'global',
    name: 'HackerNews-Dev',
    url: 'https://hnrss.org/newest?q=programming%20OR%20developer%20OR%20cursor%20OR%20%22claude%20code%22%20OR%20%22vibe%20coding%22%20OR%20%22ai%20agent%22&count=30',
    filterFn: rssParser(30)
  },
  {
    module: 'tech', region: 'global',
    name: 'MIT Tech Review',
    url: 'https://www.technologyreview.com/feed/',
    filterFn: rssParser(20)
  },
  {
    module: 'tech', region: 'global',
    name: 'The Verge AI',
    url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
    filterFn: rssParser(20)
  },
  {
    module: 'tech', region: 'global',
    name: 'Arxiv AI',
    url: 'https://arxiv.org/rss/cs.AI',
    filterFn: arxivParser(20)
  },
  {
    module: 'tech', region: 'global',
    name: 'Arxiv LG',
    url: 'https://arxiv.org/rss/cs.LG',
    filterFn: arxivParser(15)
  },

  // ── 国际·行业动态 ─────────────────────────────────────────────────────
  {
    module: 'industry', region: 'global',
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    filterFn: rssParser(20)
  },
  {
    module: 'industry', region: 'global',
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/feed/',
    filterFn: rssParser(20)
  },

  // ── 国际·社区洞察 ─────────────────────────────────────────────────────
  {
    module: 'community', region: 'global',
    name: 'Reddit-MachineLearning',
    url: 'https://www.reddit.com/r/MachineLearning/new.rss',
    filterFn: atomParser(20)
  },
  {
    module: 'community', region: 'global',
    name: 'Reddit-LocalLLaMA',
    url: 'https://www.reddit.com/r/LocalLLaMA/new.rss',
    filterFn: atomParser(20)
  },
  {
    module: 'community', region: 'global',
    name: 'Reddit-Artificial',
    url: 'https://www.reddit.com/r/Artificial/new.rss',
    filterFn: atomParser(20)
  },

  // ── 国际·工具与应用 ────────────────────────────────────────────────────
  {
    module: 'tools', region: 'global',
    name: 'ProductHunt',
    url: 'https://www.producthunt.com/feed',
    filterFn: atomParser(20)
  },
  {
    module: 'tools', region: 'global',
    name: 'GitHub Trending',
    url: 'https://github.com/trending.atom',
    filterFn: ($) => {
      const items = [];
      $('entry').each((i, el) => {
        if (i >= 20) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').attr('href') || '';
        const desc = $(el).find('summary,content').first().text()
          .replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = parseDateSafe($(el).find('updated').text().trim());
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  }
];

// ==================== 解析器工厂 =========================================

function rssParser(limit) {
  return ($) => {
    const items = [];
    $('item').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
      const desc = cleanText($(el).find('description').text()).substring(0, 400);
      const pubDate = parseDateSafe($(el).find('pubDate').text().trim());
      if (title) items.push({ title, link, desc, pubDate });
    });
    return items;
  };
}

function atomParser(limit) {
  return ($) => {
    const items = [];
    $('entry').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').attr('href') || '';
      const desc = cleanText($(el).find('content,summary').first().text()).substring(0, 400);
      const pubDate = parseDateSafe($(el).find('updated,published').first().text().trim());
      if (title) items.push({ title, link, desc, pubDate });
    });
    return items;
  };
}

function arxivParser(limit) {
  return ($) => {
    const items = [];
    $('item').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find('title').text().trim().replace(/\n/g, ' ');
      const link = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
      const desc = cleanText($(el).find('description').text()).substring(0, 500);
      const pubDate = parseDateSafe($(el).find('pubDate').text().trim());
      if (title) items.push({ title, link, desc, pubDate });
    });
    return items;
  };
}

function parseDateSafe(str) {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

// ==================== AI 相关关键词库 =====================================

const AI_KEYWORDS = [
  // 模型与公司
  'ai', 'artificial intelligence', '人工智能', '大模型', 'llm', 'gpt', 'claude', 'gemini',
  'copilot', 'chatgpt', 'openai', 'anthropic', 'google deepmind', 'meta ai', 'xai',
  'microsoft ai', 'nvidia', 'llama', 'mistral', 'qwen', 'deepseek', 'phi', 'grok',
  'gemma', 'falcon', 'yi ', 'baichuan', 'minimax', 'moonshot', 'kimi', '通义', '文心',
  '讯飞', '混元', '豆包', '智谱', '零一万物',
  // 技术概念
  'machine learning', 'deep learning', 'neural network', 'transformer', 'diffusion',
  'rag', 'embedding', 'fine-tune', 'fine tuning', '微调', 'rlhf', 'inference',
  'multimodal', '多模态', '文生图', '文生视频', 'text to image', 'text to video',
  'moe', 'mixture of experts', 'attention', 'scaling law',
  // AI 应用场景
  'agent', '智能体', 'robot', '机器人', '具身', 'embodied', 'autonomous', '自动驾驶',
  'coding assistant', 'cursor', 'github copilot', 'devin', 'swe-agent',
  // 行业
  'paper', 'arxiv', '论文', 'benchmark', 'sota', 'state-of-the-art', '开源', 'open source',
  'hugging face', 'huggingface', 'pytorch', 'tensorflow', 'jax',
  // 商业
  'ai startup', 'ai company', 'ai funding', 'ai investment', 'ai ipo',
  '融资', '估值', '收购', '并购', '人形机器人', '大语言模型'
];

const MUST_EXCLUDE = [
  // 汽车/消费电子
  '新能源车', 'suv', '续航里程', '发动机', '变速箱', '新车上市', '预售价', '配置单',
  '手机发布会', '平板电脑', '电视', '显示器', '耳机',
  // 娱乐/生活
  '演唱会', '综艺', '电影票房', '直播带货', '抖音带货',
  // 纯财经
  '房价', '炒房', '彩票', '抽奖', '优惠券'
];

// ==================== 辅助函数 =========================================

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/Article URL:.*$/gm, '')
    .replace(/#\s*Comments:.*$/gm, '')
    .replace(/Points:.*$/gm, '')
    .replace(/Comments URL:.*$/gm, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ').replace(/&\w+;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAIRelated(item) {
  const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
  return AI_KEYWORDS.some(k => text.includes(k.toLowerCase()));
}

function isExcluded(item) {
  const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
  return MUST_EXCLUDE.some(e => text.includes(e.toLowerCase()));
}

const MODULE_KEYWORDS = {
  tech: [
    'paper', 'arxiv', '论文', 'model', 'benchmark', 'sota', 'open source', 'github',
    'train', 'fine-tune', '微调', 'rlhf', 'inference', 'multimodal', '多模态',
    'architecture', 'transformer', 'diffusion', 'moe', 'scaling', 'gemma', 'llama',
    'mistral', 'qwen', 'deepseek', 'phi', 'grok', 'breakthrough', 'huggingface',
    'cursor', 'coding', 'devin', 'agent', 'function call', 'mcp', 'api',
    'embedding', 'rag', 'vector'
  ],
  industry: [
    '融资', 'ipo', '上市', '投资', '并购', '收购', '估值', 'funding', 'acquisition',
    'launch', 'announce', 'openai', 'anthropic', 'google deepmind', 'meta ai', 'xai',
    'microsoft', 'nvidia', 'tesla', '宇树', '智元', '稚晖君', '政策', '监管',
    '白皮书', '报告', '工信部', '发布会', 'startup', 'series'
  ],
  community: [
    'discussion', 'debate', 'opinion', 'trend', 'review', 'comparison', '测评',
    'how to', 'tutorial', '最佳实践', '争议', '热议', 'tips', 'ask hn', 'show hn',
    'reddit', 'community'
  ],
  tools: [
    'tool', 'app', 'platform', 'plugin', 'extension', 'sdk', 'library', 'framework',
    'product hunt', 'beta', 'alpha', 'assistant', 'chatbot', 'workflow', 'automation',
    'integration', 'saas', 'free', '免费', 'open source', 'cli', 'vscode', 'obsidian'
  ]
};

function classifyModule(item, feedModule) {
  const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
  const scores = { tech: 0, industry: 0, community: 0, tools: 0 };

  for (const [mod, kws] of Object.entries(MODULE_KEYWORDS)) {
    kws.forEach(k => { if (text.includes(k.toLowerCase())) scores[mod] += 1; });
  }

  // Arxiv 内容强制归技术
  if (item.link && item.link.includes('arxiv.org')) scores.tech += 5;
  // 融资/并购 → 行业
  if (/融资|ipo|上市|收购|并购|funding|acquisition|raise|invest|series [a-e]/i.test(text)) scores.industry += 4;
  // 技术突破 → 技术
  if (/breakthrough|sota|超越|突破|state-of-the-art|arxiv/i.test(text)) scores.tech += 3;
  // 产品发布 → 工具
  if (/product hunt|launch today|beta|alpha|open source release|免费开源/i.test(text)) scores.tools += 2;
  // 社区讨论 → 社区
  if (/^(ask|show|tell)\s+hn|discussion|debate|測評|对比/i.test(text)) scores.community += 2;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  // 如果得分相同或为0，回退到 feed 定义的 module
  return best[1] > 0 ? best[0] : feedModule;
}

function evalImportance(item) {
  const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
  const highKw = [
    '突破', '重磅', '王炸', 'breakthrough', 'revolution', 'gpt-6', 'agi',
    '收购', '并购', '大规模融资', 'acquisition', 'acquire', 'ipo', '上市',
    'openai', 'anthropic launch', 'google deepmind', '发布', 'release', 'launch',
    'claude 4', 'gpt-5', 'gemini ultra', 'llama 4', 'deepseek v3', 'qwen3'
  ];
  const medKw = [
    '开源', 'update', 'open source', 'funding', 'introduces', '论文', 'benchmark',
    '评测', 'new model', 'fine-tuning', '新功能', 'paper', 'arxiv', 'series'
  ];
  if (highKw.some(k => text.includes(k))) return 'high';
  if (medKw.some(k => text.includes(k))) return 'medium';
  return 'low';
}

async function fetchFeed(feed) {
  try {
    console.log(`  📡 ${feed.name} [${feed.region}·${feed.module}]...`);
    const resp = await axios.get(feed.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIPulse/4.0; +https://lunzi1992.github.io/ai-pulse)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
      },
      responseType: 'text'
    });
    const $ = cheerio.load(resp.data, { xmlMode: true, decodeEntities: false });
    const items = feed.filterFn($);
    console.log(`     → ${items.length} 条`);
    return items.map(item => ({ ...item, module: feed.module, region: feed.region, source: feed.name }));
  } catch (e) {
    console.log(`     ⚠️ 失败: ${e.message}`);
    return [];
  }
}

// ==================== 热词提取（过滤停用词）=====================================

function extractHotKeywords(news, topN = 20) {
  const wordCount = {};
  const minLen = 3;

  // 有意义的 AI 相关词优先统计
  const preferredWords = new Set([
    'AI', 'LLM', 'GPT', 'Claude', 'Gemini', 'Llama', 'DeepSeek', 'Qwen',
    'Agent', 'RAG', 'MoE', 'RLHF', 'LoRA', 'MCP', 'AGI', 'Arxiv',
    'Cursor', 'GitHub', 'OpenAI', 'Anthropic', 'NVIDIA', 'HuggingFace',
    'Transformer', 'Diffusion', 'Multimodal', 'Benchmark', 'Inference',
    'Robot', 'Embodied', 'Autonomous', 'Training', 'Fine-tune'
  ]);

  news.forEach(n => {
    const text = n.title + ' ' + (n.summary || '');
    // 提取英文单词
    const enWords = text.match(/[A-Za-z][A-Za-z\-]{2,}/g) || [];
    enWords.forEach(w => {
      const lw = w.toLowerCase();
      if (w.length < minLen) return;
      if (STOPWORDS.has(lw)) return;
      // 数字、URL 残留跳过
      if (/^\d+$/.test(w) || lw.includes('utm') || lw.includes('href')) return;
      const display = preferredWords.has(w) ? w : w.toUpperCase();
      wordCount[display] = (wordCount[display] || 0) + 1;
    });
    // 提取中文词（2字以上）
    const zhWords = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
    zhWords.forEach(w => {
      const noiseZh = ['的', '了', '是', '在', '和', '与', '或', '但', '一个', '这个', '其他', '相关', '内容', '更多', '文章', '作者', '发布'];
      if (noiseZh.includes(w)) return;
      wordCount[w] = (wordCount[w] || 0) + 1;
    });
  });

  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }));
}

// ==================== 内置新闻（兜底保证有内容）================================

function getBuiltinNews() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      title: 'GPT-6「土豆」定档4月14日，性能全面碾压当前最强模型',
      summary: 'OpenAI下一代旗舰模型代号Spud，代码推理能力较GPT-5.4提升约40%，支持200万Token超长上下文，定价约2.5美元/百万Token，融合ChatGPT+Codex+Atlas打造统一桌面超级智能体平台。',
      module: 'tech', region: 'global',
      source: '36氪/量子位',
      url: 'https://www.36kr.com/p/3754726863012361',
      importance: 'high', date: today
    },
    {
      title: 'CEAI 2026中国具身智能大会在合肥开幕',
      summary: '第三届中国具身智能大会（CEAI 2026）4月10-12日在合肥举办，国内头部机器人企业、高校研究院集中亮相，赛迪研究院定调2026年为具身智能规模化落地元年。',
      module: 'industry', region: 'cn',
      source: '凤凰安徽',
      url: '', importance: 'high', date: today
    },
    {
      title: '智元AGIBOT「AI发布周」进行中，每日一项物理AI王炸',
      summary: '智元机器人（稚晖君主导）4月7-14日发起AI发布周，每天发布一项具身智能核心技术，涵盖感知、运动控制、端到端学习、操作泛化等方向。',
      module: 'tech', region: 'cn',
      source: 'IT之家',
      url: 'https://www.ithome.com/0/935/660.htm',
      importance: 'high', date: today
    },
    {
      title: '阿里领投生数科技3亿美元融资，AI视频生成持续吸金',
      summary: '阿里巴巴领投AI视频生成公司生数科技新一轮3亿美元融资，估值进一步攀升。',
      module: 'industry', region: 'cn',
      source: '36氪',
      url: 'https://36kr.com/newsflashes/3760251105411588',
      importance: 'medium', date: today
    },
    {
      title: 'Cursor推出多Agent协作模式，编程效率再翻倍',
      summary: 'Cursor IDE新版引入多Agent并行编程模式，支持自然语言描述需求后自动拆解任务、分配Agent、协同编码。',
      module: 'tools', region: 'global',
      source: 'ProductHunt',
      url: 'https://www.cursor.com',
      importance: 'high', date: today
    }
  ];
}

// ==================== Markdown 日报 =================================

function generateMarkdown(dailyNews, date) {
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const MODULE_META = {
    industry: { name: '🏢 行业动态', desc: '高频更新，广度优先' },
    tech:     { name: '🔬 技术进展', desc: '论文·模型·开源·专业深度' },
    community:{ name: '💬 社区洞察', desc: '热点趋势·用户讨论·舆情' },
    tools:    { name: '🛠️ 工具与应用', desc: '落地场景·效率工具·案例' }
  };

  const grouped = {};
  dailyNews.forEach(n => {
    if (!grouped[n.module]) grouped[n.module] = [];
    grouped[n.module].push(n);
  });

  let md = `# 🤖 AI Pulse 日报 | ${dateStr}\n\n`;
  md += `> 每日精选全球 AI 领域重要动态（国内 + 国际）\n\n`;
  md += `---\n\n`;

  for (const [mod, items] of Object.entries(grouped)) {
    const meta = MODULE_META[mod] || { name: '📰 其他', desc: '' };
    const cnItems = items.filter(n => n.region === 'cn');
    const globalItems = items.filter(n => n.region === 'global');

    md += `## ${meta.name}\n\n`;
    md += `*${meta.desc}*\n\n`;

    if (cnItems.length > 0) {
      md += `### 🇨🇳 国内\n\n`;
      cnItems.forEach((n, i) => {
        md += `**${i + 1}. ${n.title}**\n\n`;
        if (n.summary) md += `${n.summary}\n\n`;
        md += `📍 ${n.source}`;
        if (n.url) md += ` | [原文](${n.url})`;
        md += `\n\n`;
      });
    }

    if (globalItems.length > 0) {
      md += `### 🌍 国际\n\n`;
      globalItems.forEach((n, i) => {
        md += `**${i + 1}. ${n.title}**\n\n`;
        if (n.summary) md += `${n.summary}\n\n`;
        md += `📍 ${n.source}`;
        if (n.url) md += ` | [原文](${n.url})`;
        md += `\n\n`;
      });
    }
  }

  md += `---\n\n`;
  md += `📌 **完整存档**: https://lunzi1992.github.io/ai-pulse\n\n`;
  md += `*AI Pulse 自动采集 | 手动审核发布*\n`;

  return md;
}

// ==================== 微信推送 ==========================================

async function pushToWechat(news) {
  const key = process.env.SERVERCHAN_KEY;
  if (!key) { console.log('⚠️ 未配置 SERVERCHAN_KEY'); return; }

  const highNews = news.filter(n => n.importance === 'high').slice(0, 5);
  const otherNews = news.filter(n => n.importance !== 'high').slice(0, 3);
  const topNews = [...highNews, ...otherNews].slice(0, 8);

  const lines = topNews.map((n, i) => {
    const regionTag = n.region === 'cn' ? '🇨🇳' : '🌍';
    return `${i + 1}. ${regionTag}【${n.module}】${n.title}\n   ${(n.summary || '').substring(0, 80)}...`;
  });

  const today = new Date().toLocaleDateString('zh-CN');
  const desp = lines.join('\n\n') + '\n\n---\n📌 https://lunzi1992.github.io/ai-pulse';

  try {
    const resp = await axios.get(
      `https://sctapi.ftqq.com/${key}.send?title=AI Pulse 日报 - ${today}&desp=${encodeURIComponent(desp)}`,
      { timeout: 10000 }
    );
    if (resp.data?.data?.error === 'SUCCESS') {
      console.log('✅ 微信推送成功');
    }
  } catch (e) {
    console.log('⚠️ 微信推送失败:', e.message);
  }
}

// ==================== 主流程 ===========================================

async function main() {
  console.log('🤖 AI Pulse v4 全球 AI 资讯聚合开始...');
  console.log('📅', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));

  const today = new Date().toISOString().split('T')[0];
  const allItems = [];

  // 1. 抓取所有 RSS
  console.log('\n📡 多源采集...');
  for (const feed of FEEDS) {
    const items = await fetchFeed(feed);
    allItems.push(...items);
  }
  console.log(`\n✅ 共获取 ${allItems.length} 条原始内容`);

  // 2. 过滤 + 分类
  const seen = new Set();
  const filtered = [];
  for (const item of allItems) {
    if (!item.title || item.title.length < 5) continue;
    // 去重（标题相似度简单去重）
    const titleKey = item.title.substring(0, 30).toLowerCase().replace(/\s+/g, '');
    if (seen.has(titleKey)) continue;
    seen.add(titleKey);

    if (isExcluded(item)) continue;
    if (!isAIRelated(item)) continue;

    item.desc = cleanText(item.desc || '');
    if (item.desc.length < 5 && !item.title) continue;

    const module = classifyModule(item, item.module);
    const importance = evalImportance(item);
    const id = `v4-${Buffer.from((item.link || item.title).substring(0, 50)).toString('base64').substring(0, 16)}`;

    filtered.push({
      id,
      title: item.title.substring(0, 200),
      summary: item.desc.substring(0, 500),
      module,
      region: item.region || 'global',
      source: item.source,
      url: item.link || '',
      importance,
      date: item.pubDate || today
    });
  }

  console.log(`✅ 过滤后剩余 ${filtered.length} 条`);
  console.log('📊 地域分布:', {
    cn: filtered.filter(n => n.region === 'cn').length,
    global: filtered.filter(n => n.region === 'global').length
  });
  console.log('📊 模块分布:', {
    industry: filtered.filter(n => n.module === 'industry').length,
    tech: filtered.filter(n => n.module === 'tech').length,
    community: filtered.filter(n => n.module === 'community').length,
    tools: filtered.filter(n => n.module === 'tools').length
  });

  // 3. 合并内置新闻
  const builtin = getBuiltinNews().map(b => ({
    id: `builtin-${Buffer.from(b.title).toString('base64').substring(0, 16)}`,
    ...b
  }));

  const combined = [...builtin, ...filtered]
    .sort((a, b) => {
      const impOrder = { high: 0, medium: 1, low: 2 };
      if (impOrder[a.importance] !== impOrder[b.importance]) {
        return impOrder[a.importance] - impOrder[b.importance];
      }
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 120);

  // 4. 今日新闻
  const todayNews = combined.filter(n => n.date === today);
  console.log(`📅 今日精选: ${todayNews.length} 条`);

  // 5. 热词统计（过滤停用词）
  const hotKeywords = extractHotKeywords(combined, 20);
  console.log('🔥 热词 Top5:', hotKeywords.slice(0, 5).map(k => k.name).join(', '));

  // 6. 写入 news.json
  const output = {
    meta: {
      title: 'AI Pulse',
      subtitle: '全球 AI 资讯每日聚合',
      description: '国内 + 国际 | 行业动态 | 技术进展 | 社区洞察 | 工具与应用',
      lastUpdate: today,
      updatedAt: new Date().toISOString(),
      version: '4.0'
    },
    hotKeywords,
    news: combined
  };

  const newsPath = path.join(__dirname, 'news.json');
  fs.writeFileSync(newsPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ news.json 已写入（总计 ${combined.length} 条）`);

  // 7. 生成 Markdown 日报
  if (todayNews.length > 0) {
    const md = generateMarkdown(todayNews, today);
    const dailyDir = path.join(__dirname, 'daily');
    if (!fs.existsSync(dailyDir)) fs.mkdirSync(dailyDir, { recursive: true });
    const mdPath = path.join(dailyDir, `${today}.md`);
    fs.writeFileSync(mdPath, md, 'utf8');
    console.log(`✅ Markdown 日报: daily/${today}.md`);
  }

  // 8. 微信推送
  if (todayNews.length > 0) {
    await pushToWechat(todayNews.slice(0, 8));
  }

  console.log('\n🎉 AI Pulse v4 更新完成！');
}

main().catch(e => {
  console.error('❌ 失败:', e.message);
  process.exit(1);
});
