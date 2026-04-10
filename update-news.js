/**
 * AI Pulse v3 - 多维度信息聚合
 * 行业动态 | 技术进展 | 社区洞察 | 工具与应用
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ==================== 数据源配置 =========================================

const FEEDS = [
  // ── 行业动态 ──────────────────────────────────────────────────────────
  {
    module: 'industry',  // 行业动态
    name: 'IT之家',
    url: 'https://www.ithome.com/rss/',
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        if (i >= 50) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    module: 'industry',
    name: '36氪',
    url: 'https://36kr.com/feed',
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        if (i >= 50) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    module: 'industry',
    name: '虎嗅',
    url: 'https://www.huxiu.com/rss/0.xml',
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        if (i >= 30) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    module: 'industry',
    name: '腾讯科技',
    url: 'https://tech.qq.com/rss.xml',
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        if (i >= 30) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    module: 'industry',
    name: 'PingWest',
    url: 'https://cn.pingwest.com/feed',
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        if (i >= 30) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },

  // ── 技术进展 ──────────────────────────────────────────────────────────
  {
    module: 'tech',
    name: 'HackerNews-AI',
    url: 'https://hnrss.org/newest?q=AI%20OR%20%22machine%20learning%22%20OR%20robotics%20OR%20%22large%20language%22%20OR%20GPT%20OR%20Claude%20OR%20Copilot%20OR%20%22open%20source%22%20OR%20%22deep%20learning%22%20OR%20%22neural%20network%22&count=50',
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text()
          .replace(/<[^>]+>/g, '')
          .replace(/Article URL:.*$/gm, '')
          .replace(/# Comments:.*$/gm, '')
          .replace(/Points:.*$/gm, '')
          .trim().substring(0, 300);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    module: 'tech',
    name: 'HackerNews-Programming',
    url: 'https://hnrss.org/newest?q=programming%20OR%20developer%20OR%20%22software%20engineering%22%20OR%20cursor%20OR%20%22claude%20code%22%20OR%20github&count=30',
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text()
          .replace(/<[^>]+>/g, '')
          .replace(/Article URL:.*$/gm, '')
          .replace(/# Comments:.*$/gm, '')
          .replace(/Points:.*$/gm, '')
          .trim().substring(0, 300);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    module: 'tech',
    name: 'GitHub Trending',
    url: 'https://github.com/trending.atom',
    filterFn: ($) => {
      const items = [];
      $('entry').each((i, el) => {
        if (i >= 20) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').attr('href') || '';
        const desc = $(el).find('summary').text().replace(/<[^>]+>/g, '').trim().substring(0, 300) ||
                     $(el).find('content').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('updated').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },

  // ── 社区洞察 ──────────────────────────────────────────────────────────
  {
    module: 'community',
    name: 'Reddit-Artificial',
    url: 'https://www.reddit.com/r/Artificial/new.rss',
    filterFn: ($) => {
      const items = [];
      $('entry').each((i, el) => {
        if (i >= 20) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').attr('href') || '';
        const desc = $(el).find('content').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('updated').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    module: 'community',
    name: 'Reddit-MachineLearning',
    url: 'https://www.reddit.com/r/MachineLearning/new.rss',
    filterFn: ($) => {
      const items = [];
      $('entry').each((i, el) => {
        if (i >= 20) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').attr('href') || '';
        const desc = $(el).find('content').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('updated').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },

  // ── 工具与应用 ──────────────────────────────────────────────────────────
  {
    module: 'tools',
    name: 'ProductHunt',
    url: 'https://www.producthunt.com/feed',
    filterFn: ($) => {
      const items = [];
      $('entry').each((i, el) => {
        if (i >= 20) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').attr('href') || '';
        const desc = $(el).find('content').text().replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pubDate = new Date($(el).find('updated').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  }
];

// ==================== AI 相关关键词库 =====================================

const MODULE_KEYWORDS = {
  industry: [  // 行业动态：融资、公司动态、政策、市场
    'ai', '人工智能', '大模型', 'llm', 'gpt', 'claude', 'copilot', 'gemini',
    'robot', '具身', '智能体', 'agent', '人形机器人', 'embodied', 'physical ai',
    '融资', 'ipo', '上市', '投资', '并购', '收购', '估值', 'funding', 'acquisition',
    '发布', 'launch', 'announce', 'release', 'openai', 'anthropic', 'google deepmind',
    'meta ai', 'xai', 'microsoft', 'nvidia', 'tesla', 'figure', '宇树', '智元', '稚晖君',
    '监管', '政策', '标准', '白皮书', '报告', '皮书', '工信部', '信通院'
  ],
  tech: [  // 技术进展：论文、模型、开源、技术突破
    'paper', 'arxiv', '论文', '模型', 'model', 'benchmark', '评测', '榜单',
    '开源', 'open source', 'github', 'release', 'github.com',
    'train', 'training', 'fine-tune', '微调', 'rlhf', 'inference', '推理',
    'multimodal', '多模态', '文生', '视频', '图像', 'audio', '语音',
    'embedding', 'rag', 'vector', '向量', '知识库',
    'architecture', 'transformer', 'diffusion', 'moe', 'scaling',
    'gemma', 'llama', 'mistral', 'qwen', 'deepseek', 'phi', 'grok',
    'breakthrough', '超越', 'state-of-the-art', 'sota',
    'cursor', 'code', '编程', 'copilot', 'coding', 'software',
    'agent', 'tool', 'function call', 'mcp', 'api'
  ],
  community: [  // 社区洞察：讨论、趋势、观点
    'reddit', 'twitter', 'x.com', 'hacker news', 'discussion',
    'opinion', 'thoughts', 'perspective', 'trend', '趋势',
    'debate', 'controversy', '争议', '热议', '爆火', '刷屏',
    '用户', '社区', '开发者社区', '生态', 'ecosystem',
    'adoption', '应用', '落地', 'use case', '案例',
    'tips', 'tutorial', '教程', '最佳实践', 'how to',
    'review', '测评', '对比', 'comparison', 'vs'
  ],
  tools: [  // 工具与应用：产品、工具、效率
    'tool', 'app', 'product', 'platform', 'service', 'saas',
    'studio', 'dashboard', 'interface', 'plugin', 'extension', 'extension',
    'cli', 'sdk', 'library', 'framework', 'package',
    'product hunt', 'launch', 'startup', 'beta', 'alpha',
    'copilot', 'assistant', 'chatbot', 'bot',
    'notion', 'obsidian', 'slack', 'figma', 'vscode',
    'api', 'integration', 'workflow', 'automation',
    'open source', 'gratis', 'free', '免费', '付费', 'pricing'
  ]
};

const MUST_EXCLUDE = [
  // 汽车/消费电子/娱乐 - 这些领域的噪音
  '汽车', '电动车', '新能源车', 'suv', '上市 售价', '电池 续航', '手机 发布会',
  '平板', '电视', '显示器', '相机', '镜头', '耳机',
  '抖音', '直播带货', '演唱会', '综艺', '电影', '游戏', '手游', 'Steam',
  '新车', '上市', '预售价', '配置单', '发动机', '变速箱',
  // 纯商业财经噪音
  '房价', '股市', '基金', '期货', '汇率', '黄金',
  '彩票', '抽奖', '优惠券', '打折'
];

// ==================== 辅助函数 =========================================

function cleanHNText(text) {
  return text
    .replace(/Article URL:.*$/gm, '')
    .replace(/#\s*Comments:.*$/gm, '')
    .replace(/Points:.*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAIRelated(item) {
  const text = (item.title + ' ' + item.desc).toLowerCase();
  const allKeywords = [
    ...MODULE_KEYWORDS.industry,
    ...MODULE_KEYWORDS.tech,
    ...MODULE_KEYWORDS.community,
    ...MODULE_KEYWORDS.tools
  ];
  return allKeywords.some(k => text.includes(k.toLowerCase()));
}

function isExcluded(item) {
  const text = (item.title + ' ' + item.desc).toLowerCase();
  return MUST_EXCLUDE.some(e => text.includes(e.toLowerCase()));
}

function classifyModule(item) {
  const text = (item.title + ' ' + item.desc).toLowerCase();

  // 按优先级匹配模块
  const scores = {
    tech: 0,
    industry: 0,
    community: 0,
    tools: 0
  };

  for (const [mod, kws] of Object.entries(MODULE_KEYWORDS)) {
    kws.forEach(k => {
      if (text.includes(k.toLowerCase())) scores[mod] += 1;
    });
  }

  // 技术突破优先
  if (/breakthrough|sota|超越|突破|state-of-the-art|arxiv|gemma|llama|qwen|deepseek/i.test(text)) {
    scores.tech += 3;
  }
  // 融资并购 → 行业
  if (/融资|ipo|上市|收购|并购|funding|acquisition|raise|invest/i.test(text)) {
    scores.industry += 3;
  }
  // 工具类产品 → 工具
  if (/product hunt|launch|beta|alpha|open source|免费|pricing|vscode|plugin|extension/i.test(text)) {
    scores.tools += 2;
  }
  // 社区讨论 → 社区
  if (/discussion|debate|review|测评|对比|how to|tutorial|最佳实践|争议|热议/i.test(text)) {
    scores.community += 2;
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'industry';
}

function evalImportance(item) {
  const text = (item.title + ' ' + item.desc).toLowerCase();
  const highKw = ['突破', '重磅', '王炸', 'launch', 'release', 'announce', 'breakthrough', 'revolution', 'gpt-6', 'agi', 'sora', 'seedance', '稚晖君', '智元', '收购', '并购', '融资', 'ipo'];
  const medKw = ['开源', '更新', '新功能', 'update', 'open source', 'funding', 'new', 'introduces', '论文', 'benchmark', '评测'];
  if (highKw.some(k => text.includes(k))) return 'high';
  if (medKw.some(k => text.includes(k))) return 'medium';
  return 'low';
}

async function fetchFeed(feed) {
  try {
    console.log(`  📡 ${feed.name} [${feed.module}]...`);
    const resp = await axios.get(feed.url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIPulse/3.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      responseType: 'text'
    });
    const $ = cheerio.load(resp.data, { xmlMode: true, decodeEntities: false });
    const items = feed.filterFn($);
    console.log(`     → ${items.length} 条`);
    return items.map(item => ({ ...item, module: feed.module, source: feed.name }));
  } catch (e) {
    console.log(`     ⚠️ 失败: ${e.message}`);
    return [];
  }
}

// ==================== 今日内置新闻 =====================================

function getBuiltinNews() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      title: 'GPT-6「土豆」定档4月14日，性能全面碾压当前最强模型',
      summary: 'OpenAI下一代旗舰模型代号Spud，代码推理能力较GPT-5.4提升约40%，支持200万Token超长上下文，定价约2.5美元/百万Token，融合ChatGPT+Codex+Atlas打造统一桌面超级智能体平台。',
      module: 'tech',
      source: '36氪/量子位',
      url: 'https://www.36kr.com/p/3754726863012361',
      importance: 'high',
      date: today
    },
    {
      title: 'CEAI 2026中国具身智能大会在合肥开幕',
      summary: '第三届中国具身智能大会（CEAI 2026）4月10-12日在合肥举办，国内头部机器人企业、高校研究院集中亮相，赛迪研究院定调2026年为具身智能规模化落地元年。',
      module: 'industry',
      source: '凤凰安徽',
      url: '',
      importance: 'high',
      date: today
    },
    {
      title: '智元AGIBOT「AI发布周」进行中，每日一项物理AI王炸',
      summary: '智元机器人（稚晖君主导）4月7-14日发起AI发布周，每天发布一项具身智能核心技术，涵盖感知、运动控制、端到端学习、操作泛化等方向。',
      module: 'tech',
      source: 'IT之家/凤凰科技',
      url: 'https://www.ithome.com/0/935/660.htm',
      importance: 'high',
      date: today
    },
    {
      title: '衷华脑机发布神经肌电+语音双模仿生手',
      summary: '首创「神经肌电+智能语音」双模协同控制技术，突破传统假肢单一肌电交互局限，配备高仿真人工皮肤，融合高精度传感器与自研算法。',
      module: 'tech',
      source: 'IT之家',
      url: 'https://www.ithome.com/0/937/494.htm',
      importance: 'medium',
      date: today
    },
    {
      title: '微软MAI三件套发布：转录、语音、图像全线覆盖',
      summary: '微软MAI Superintelligence团队发布三款新模型：MAI-Transcribe-1、MAI-Voice-1、MAI-Image-2，已上线Microsoft Foundry平台。',
      module: 'tech',
      source: 'Houdao AI',
      url: 'https://www.houdao.com',
      importance: 'medium',
      date: today
    },
    {
      title: '阿里领投生数科技3亿美元融资，AI视频生成持续吸金',
      summary: '阿里巴巴领投AI视频生成公司生数科技新一轮3亿美元融资，估值进一步攀升。',
      module: 'industry',
      source: '36氪',
      url: 'https://36kr.com/newsflashes/3760251105411588',
      importance: 'medium',
      date: today
    },
    {
      title: 'Cursor推出多Agent协作模式，编程效率再翻倍',
      summary: 'Cursor IDE新版引入多Agent并行编程模式，支持自然语言描述需求后自动拆解任务、分配Agent、协同编码。',
      module: 'tools',
      source: 'ProductHunt',
      url: 'https://www.cursor.com',
      importance: 'high',
      date: today
    }
  ];
}

// ==================== Markdown 生成 =================================

function generateMarkdown(dailyNews, date) {
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('zh-CN', {
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

  let md = '';
  md += `# 🤖 AI Pulse 日报 | ${dateStr}\n\n`;
  md += `> 每日精选 AI Coding 与具身智能领域重要动态\n\n`;
  md += `---\n\n`;

  for (const [mod, items] of Object.entries(grouped)) {
    const meta = MODULE_META[mod] || { name: '📰 其他', desc: '' };
    md += `## ${meta.name}\n\n`;
    md += `*${meta.desc}*\n\n`;

    items.forEach((n, i) => {
      md += `**${i + 1}. ${n.title}**\n\n`;
      if (n.summary) md += `${n.summary}\n\n`;
      md += `📍 ${n.source}`;
      if (n.url) md += ` | [原文](${n.url})`;
      md += `\n\n`;
    });
  }

  md += `---\n\n`;
  md += `📌 **完整存档**: https://lunzi1992.github.io/ai-pulse\n\n`;
  md += `---\n\n`;
  md += `*AI Pulse 自动采集 | 手动审核发布*\n`;

  return md;
}

// ==================== 微信推送 ==========================================

async function pushToWechat(news) {
  const key = process.env.SERVERCHAN_KEY;
  if (!key) { console.log('⚠️ 未配置 SERVERCHAN_KEY'); return; }

  const lines = news.slice(0, 8).map((n, i) =>
    `${i + 1}. 【${n.module}】${n.title}\n   ${(n.summary || '').substring(0, 80)}...`
  );

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
  console.log('🤖 AI Pulse v3 多维度更新开始...');
  console.log('📅', new Date().toLocaleDateString('zh-CN'));

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
  const filtered = [];
  for (const item of allItems) {
    if (!item.title || item.title.length < 8) continue;
    if (isExcluded(item)) continue;
    if (!isAIRelated(item)) continue;

    // 清理 HN 噪音
    item.desc = cleanHNText(item.desc);
    if (item.desc.length < 10) continue;

    // 自动分类
    const module = classifyModule(item);
    const importance = evalImportance(item);
    const id = `v3-${Buffer.from(item.link || item.title).toString('base64').substring(0, 16)}`;

    filtered.push({
      id,
      title: item.title.substring(0, 200),
      summary: item.desc,
      module,
      source: item.source,
      url: item.link || '',
      importance,
      date: item.pubDate || today
    });
  }

  console.log(`✅ 过滤后剩余 ${filtered.length} 条`);
  console.log('📊 各模块分布:', {
    industry: filtered.filter(n => n.module === 'industry').length,
    tech: filtered.filter(n => n.module === 'tech').length,
    community: filtered.filter(n => n.module === 'community').length,
    tools: filtered.filter(n => n.module === 'tools').length
  });

  // 3. 合并内置新闻（保证每天有内容）
  const builtin = getBuiltinNews().map(b => ({
    id: `builtin-${Buffer.from(b.title).toString('base64').substring(0, 16)}`,
    ...b,
    date: today
  }));

  const combined = [...builtin, ...filtered]
    .sort((a, b) => {
      const impOrder = { high: 0, medium: 1, low: 2 };
      if (impOrder[a.importance] !== impOrder[b.importance]) {
        return impOrder[a.importance] - impOrder[b.importance];
      }
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 80);

  // 4. 今日新闻
  const todayNews = combined.filter(n => n.date === today);
  console.log(`📅 今日精选: ${todayNews.length} 条`);

  // 5. 热词统计
  const wordCount = {};
  combined.forEach(n => {
    const words = (n.title + ' ' + n.summary).match(/[A-Za-z]{3,}/gi) || [];
    words.forEach(w => {
      const lw = w.toLowerCase();
      wordCount[lw] = (wordCount[lw] || 0) + 1;
    });
  });
  const hotKeywords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name: name.toUpperCase(), count }));

  // 6. 写入 news.json
  const output = {
    meta: {
      title: 'AI Pulse',
      subtitle: 'AI Coding & 具身智能信息聚合',
      description: '行业动态 | 技术进展 | 社区洞察 | 工具与应用',
      lastUpdate: today,
      updatedAt: new Date().toISOString(),
      version: '3.0'
    },
    hotKeywords,
    news: combined
  };

  const newsPath = path.join(__dirname, 'news.json');
  fs.writeFileSync(newsPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ news.json 已写入（总计 ${combined.length} 条）`);

  // 7. 生成 Markdown
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

  console.log('🎉 更新完成！');
}

main().catch(e => {
  console.error('❌ 失败:', e.message);
  process.exit(1);
});
