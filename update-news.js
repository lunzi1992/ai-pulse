/**
 * AI Pulse - 每日新闻更新脚本 v2
 * 多源 RSS 实时抓取 + 内置精选备用
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ==================== 数据源配置 =========================================

const FEEDS = [
  {
    name: 'IT之家',
    url: 'https://www.ithome.com/rss/',
    category: 'AI Coding',
    keywords: ['AI', '人工智能', '大模型', 'LLM', 'GPT', 'Claude', 'Copilot', '机器人', '具身', '编程', '代码', '开发者', '开源', 'Cursor', 'GitHub', '模型', '智能'],
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        if (i >= 30) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 200);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    name: 'HackerNews-AI',
    url: 'https://hnrss.org/newest?q=AI%20OR%20%22machine%20learning%22%20OR%20robotics%20OR%20%22large%20language%22%20OR%20GPT%20OR%20Claude%20OR%20Copilot&count=20',
    category: 'AI Coding',
    keywords: ['AI', 'machine learning', 'robotics', 'LLM', 'GPT', 'Claude', 'Copilot', 'coding', 'programming', 'open source', 'model'],
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').replace(/Article URL:.*$/, '').trim().substring(0, 200);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  },
  {
    name: '36氪',
    url: 'https://36kr.com/feed',
    category: '大模型',
    keywords: ['AI', '人工智能', '大模型', 'LLM', '机器人', '具身', '融资', '发布', '开源', 'GPT'],
    filterFn: ($) => {
      const items = [];
      $('item').each((i, el) => {
        if (i >= 30) return;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
        const desc = $(el).find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 200);
        const pubDate = new Date($(el).find('pubDate').text().trim()).toISOString().split('T')[0];
        items.push({ title, link, desc, pubDate });
      });
      return items;
    }
  }
];

// ==================== 辅助函数 =========================================

/** 判断标题是否匹配 AI 相关关键词 */
function isAIRelated(title) {
  const keywords = [
    'AI', '人工智能', '大模型', 'LLM', 'GPT', 'Claude', 'Copilot', 'Gemini',
    '机器人', '具身', '智能体', 'Agent', '机器学习', '深度学习', '神经网络',
    '开源', '开源模型', '发布', '编程', '代码', '开发者', 'GitHub', 'Cursor',
    '代码模型', 'Codex', '编程', 'Coding', 'RAG', '向量', 'Embedding',
    'ChatGPT', 'OpenAI', 'Anthropic', 'Google DeepMind', 'Meta AI', 'xAI',
    '人形机器人', '自动驾驶', '智驾', 'Embodied', 'Embodied AI', 'Physical AI',
    '多模态', '视觉模型', '文生图', '视频生成', '图生视频', 'Sora', '稳定扩散',
    '算力', 'GPU', 'H100', '芯片', '融资', '投资', '估值', '上市', '并购',
    '幻觉', '推理', '推理能力', 'Benchmark', '评测', '榜单', '超越',
    'MAI', 'Spud', '土豆', 'Seedance', '智元', '稚晖君', '宇树', '傅利叶',
    'Neuralink', '脑机', 'SpaceX', 'Tesla', 'Figure', '1X', 'Agibot', 'AgiBot'
  ];
  const lower = title.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

/** 判断内容是否相关（标题 + 描述联合判断） */
function isRelevant(item) {
  const text = (item.title + ' ' + item.desc).toLowerCase();
  // 必须匹配的强相关关键词
  const mustMatch = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'large language model', 'llm', 'gpt', 'claude', 'copilot', 'gemini', 'gemini',
    'robot', 'robotics', 'autonomous', 'agent', 'agi', 'agi bot',
    'humanoid', 'embodied', 'physical ai', 'multimodal',
    '人工智能', '大模型', '机器人', '具身', '智能体', '编程', '代码', 'cod',
    'github', 'cursor', 'openai', 'anthropic', 'google deepmind', 'meta ai', 'xai',
    '智元', '稚晖君', '宇树', '傅利叶', 'qclaw', 'figure ai', '1x', 'agibot',
    'neuralink', '脑机', '开源模型', '多模态', '文生', '视频生成',
    '模型', 'model', 'training', 'benchmark', '评测', '榜单',
    'aicoding', 'coding', 'programming'
  ];
  // 必须排除的弱相关词（标题里出现这些但没有强关键词，大概率不相关）
  const mustExclude = [
    '汽车', '电动车', '新能源车', '手机', '平板', '电视', '发布会', '预售',
    '汽车', 'suv', '上市', '售价', '配置', '电池', '续航',
    '抖音', '字节', '游戏', '手游', '演唱会', '综艺',
    '新车', '上市', '发布', '上市', '汽车'
  ];
  
  const hasRelevant = mustMatch.some(k => text.includes(k.toLowerCase()));
  if (!hasRelevant) return false;
  
  // 如果标题很短或全是排除词，也不相关
  const titleLower = item.title.toLowerCase();
  const allExclude = mustExclude.every(e => !titleLower.includes(e));
  
  return hasRelevant && allExclude;
}

/** 分类新闻 */
function categorize(item) {
  const text = (item.title + ' ' + item.desc).toLowerCase();
  if (/robot|人形|具身|embod|physic|agent|智元|稚晖|宇树|傅利叶|neuralink|脑机|autonomous/i.test(text)) {
    return '具身智能';
  }
  if (/code|编程|github|cursor|copilot|claude|gpt|openai|anthropic|developer/i.test(text)) {
    return 'AI Coding';
  }
  if (/model|llm|多模态|文生|视频|生成|开源模型|gemma|gemini|phi|maas/i.test(text)) {
    return '大模型';
  }
  if (/invest|融资|ipo|上市|并购|acqui|funding|估值|raise/i.test(text)) {
    return '资本';
  }
  return '开源';
}

/** 评估重要性 */
function evalImportance(item) {
  const text = (item.title + ' ' + item.desc).toLowerCase();
  const highKw = ['突破', '超越', '发布', '重磅', '王炸', 'launch', 'release', 'announce', 'breakthrough', 'revolution', 'gpt-6', 'gpt6', 'claude 4', 'agi', 'sora', 'seedance', 'spud', '土豆', '稚晖君', '智元'];
  const medKw = ['开源', '融资', '更新', '新功能', 'update', 'open source', 'funding', 'new', 'launch', 'introduces'];
  if (highKw.some(k => text.includes(k))) return 'high';
  if (medKw.some(k => text.includes(k))) return 'medium';
  return 'low';
}

/** 抓取 RSS 并解析 */
async function fetchFeed(feed) {
  try {
    console.log(`  📡 抓取 ${feed.name}...`);
    const resp = await axios.get(feed.url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIPulse/1.0)' },
      responseType: 'text'
    });
    const $ = cheerio.load(resp.data, { xmlMode: true, decodeEntities: false });
    const items = feed.filterFn($);
    console.log(`     ${feed.name}: 获取 ${items.length} 条，过滤中...`);
    return items;
  } catch (e) {
    console.log(`     ⚠️ ${feed.name} 抓取失败: ${e.message}`);
    return [];
  }
}

// ==================== 今日内置新闻（备用） ==============================

function getBuiltinNews() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      title: 'GPT-6「土豆」定档4月14日，性能全面碾压当前最强模型',
      summary: 'OpenAI下一代旗舰模型代号Spud，代码推理能力较GPT-5.4提升约40%，支持200万Token超长上下文，定价约2.5美元/百万Token，融合ChatGPT+Codex+Atlas打造统一桌面超级智能体平台。',
      category: 'AI Coding',
      source: '36氪/量子位',
      url: 'https://www.36kr.com/p/3754726863012361',
      importance: 'high',
      date: today
    },
    {
      title: '智元AGIBOT「AI发布周」进行中，每日一项物理AI王炸',
      summary: '智元机器人（稚晖君主导）4月7-14日发起AI发布周，每天发布一项具身智能核心技术，涵盖感知、运动控制、端到端学习、操作泛化等方向，推动整个行业加速「物理AI」进化。',
      category: '具身智能',
      source: 'IT之家/凤凰科技',
      url: 'https://www.ithome.com/0/935/660.htm',
      importance: 'high',
      date: today
    },
    {
      title: '微软MAI三件套发布：转录、语音、图像全线覆盖',
      summary: '微软MAI Superintelligence团队发布三款新模型：MAI-Transcribe-1、MAI-Voice-1、MAI-Image-2，已上线Microsoft Foundry平台，速度与质量全面提升。',
      category: '大模型',
      source: 'Houdao AI',
      url: 'https://www.houdao.com',
      importance: 'medium',
      date: today
    },
    {
      title: 'CEAI 2026中国具身智能大会在合肥开幕',
      summary: '第三届中国具身智能大会（CEAI 2026）4月10-12日在合肥举办，国内头部机器人企业、高校研究院集中亮相，赛迪研究院定调2026年为具身智能规模化落地元年。',
      category: '具身智能',
      source: '凤凰安徽',
      url: '',
      importance: 'medium',
      date: today
    },
    {
      title: '衷华脑机发布神经肌电+语音双模仿生手',
      summary: '衷华脑机发布智能仿生手，首创「神经肌电+智能语音」双模协同控制技术，突破传统假肢单一肌电交互局限，配备高仿真人工皮肤，融合高精度传感器与自研算法。',
      category: '具身智能',
      source: 'IT之家',
      url: 'https://www.ithome.com/0/937/494.htm',
      importance: 'medium',
      date: today
    }
  ];
}

// ==================== 微信推送 ==========================================

async function pushToWechat(news) {
  const key = process.env.SERVERCHAN_KEY;
  if (!key) { console.log('⚠️ 未配置 SERVERCHAN_KEY'); return; }

  const lines = news.slice(0, 10).map((n, i) =>
    `${i + 1}. 【${n.category}】${n.title}\n   ${n.summary.substring(0, 100)}...\n   🔗 ${n.url || '无链接'}`
  );

  const today = new Date().toLocaleDateString('zh-CN');
  const desp = lines.join('\n\n') + '\n\n---\n📌 AI Pulse | https://lunzi1992.github.io/ai-pulse';

  try {
    const resp = await axios.get(
      `https://sctapi.ftqq.com/${key}.send?title=AI Pulse 日报 - ${today}&desp=${encodeURIComponent(desp)}`,
      { timeout: 10000 }
    );
    if (resp.data?.data?.error === 'SUCCESS') {
      console.log('✅ 微信推送成功 (pushid:', resp.data.data.pushid + ')');
    } else {
      console.log('⚠️ 微信推送响应:', JSON.stringify(resp.data));
    }
  } catch (e) {
    console.log('⚠️ 微信推送失败:', e.message);
  }
}

// ==================== 主流程 ===========================================

async function main() {
  console.log('🤖 AI Pulse 新闻更新开始...');
  console.log('📅 日期:', new Date().toLocaleDateString('zh-CN'));

  // 1. 读取现有数据
  const newsPath = path.join(__dirname, 'news.json');
  let existingIds = new Set();
  let existingWeekFocus = [];
  let existingKeywords = [];

  try {
    if (fs.existsSync(newsPath)) {
      const data = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
      existingIds = new Set(data.news.map(n => n.id));
      existingWeekFocus = data.weekFocus || [];
      existingKeywords = data.hotKeywords || [];
    }
  } catch (e) { /* 新建 */ }

  const today = new Date().toISOString().split('T')[0];

  // 2. 抓取所有 RSS 源
  console.log('\n📡 开始抓取 RSS 数据源...');
  const allItems = [];

  for (const feed of FEEDS) {
    const items = await fetchFeed(feed);
    for (const item of items) {
      if (!item.title || !item.link) continue;
      // 过滤已存在的 ID
      const id = `rss-${Buffer.from(item.link).toString('base64').substring(0, 16)}`;
      if (existingIds.has(id)) continue;
      // 过滤不相关
      if (!isRelevant(item)) continue;
      // 分类和重要性
      const category = categorize(item);
      const importance = evalImportance(item);
      allItems.push({
        id,
        title: item.title.substring(0, 200),
        summary: item.desc || '',
        category,
        source: feed.name,
        url: item.link,
        importance,
        date: item.pubDate || today
      });
    }
  }

  console.log(`\n✅ 抓取到 ${allItems.length} 条有效新闻`);

  // 3. 合并内置新闻（作为备用，保证每天有内容）
  const builtin = getBuiltinNews().filter(b => !existingIds.has(`builtin-${b.title.substring(0, 20)}`));
  const builtinMapped = builtin.map(b => ({
    id: `builtin-${Buffer.from(b.title).toString('base64').substring(0, 16)}`,
    ...b
  }));

  // 4. 合并排序（重要性高的在前）
  const combined = [...builtinMapped, ...allItems]
    .sort((a, b) => {
      const impOrder = { high: 0, medium: 1, low: 2 };
      if (impOrder[a.importance] !== impOrder[b.importance]) {
        return impOrder[a.importance] - impOrder[b.importance];
      }
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 50); // 保留50条历史

  // 5. 今日新闻单独取前10条
  const todayNews = combined.filter(n => n.date === today);
  console.log(`📅 今日新闻: ${todayNews.length} 条`);

  // 6. 生成热词
  const wordCount = {};
  combined.forEach(n => {
    const words = [n.title, n.summary].join(' ').match(/[A-Za-z]{4,}/gi) || [];
    words.forEach(w => {
      const lw = w.toLowerCase();
      wordCount[lw] = (wordCount[lw] || 0) + 1;
    });
  });
  const hotKeywords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.toUpperCase(), count }));

  // 7. 写入 news.json
  const output = {
    meta: {
      title: 'AI Pulse',
      subtitle: 'AI Coding & 具身智能信息聚合',
      description: '每日精选 AI Coding 与具身智能领域重要动态',
      lastUpdate: today,
      updatedAt: new Date().toISOString(),
      version: '2.0'
    },
    hotKeywords,
    weekFocus: existingWeekFocus.length ? existingWeekFocus : [
      { title: 'GPT-6「土豆」定档4月14日', desc: '性能+40%、200万Token上下文，冲刺AGI最后20%' },
      { title: '智元AGIBOT AI发布周进行中', desc: '每日一项物理AI王炸突破，4月7-14日密集发布' },
      { title: '具身智能规模化落地元年', desc: '赛迪研究院定调，CEAI 2026大会合肥举办' }
    ],
    news: combined
  };

  fs.writeFileSync(newsPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ news.json 已写入（总计 ${combined.length} 条）`);

  // 8. 推送微信
  if (todayNews.length > 0) {
    await pushToWechat(todayNews.slice(0, 10));
  } else {
    console.log('ℹ️ 今日无新新闻，跳过推送');
  }

  console.log('🎉 更新完成！');
}

main().catch(e => {
  console.error('❌ 更新失败:', e.message);
  process.exit(1);
});
