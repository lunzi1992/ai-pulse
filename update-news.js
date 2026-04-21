/**
 * AI Pulse v4 - 全球 AI 资讯聚合
 * 行业动态 | 技术进展 | 社区洞察 | 工具与应用
 * 国内 / 国际 双轨展示
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 导入配置和工具模块
const config = require('./config');
const utils = require('./utils');
const parsers = require('./parsers');

// ==================== 辅助函数 =========================================

function isAIRelated(item) {
  const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
  return config.AI_KEYWORDS.some(k => text.includes(k.toLowerCase()));
}

function isExcluded(item) {
  const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
  return config.MUST_EXCLUDE.some(e => text.includes(e.toLowerCase()));
}

function classifyModule(item, feedModule) {
  const text = (item.title + ' ' + (item.desc || '')).toLowerCase();
  const scores = { tech: 0, industry: 0, community: 0, tools: 0 };

  for (const [mod, kws] of Object.entries(config.MODULE_KEYWORDS)) {
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
    
    // 确定解析器
    let parser;
    if (feed.url.includes('arxiv.org')) {
      parser = parsers.arxivParser(feed.limit);
    } else if (feed.url.includes('github.com') || feed.url.includes('producthunt.com') || feed.url.includes('reddit.com')) {
      parser = parsers.atomParser(feed.limit);
    } else {
      parser = parsers.rssParser(feed.limit);
    }
    
    // 特殊处理 GitHub Trending
    if (feed.url.includes('github.com/trending.atom')) {
      parser = parsers.githubTrendingParser();
    }

    const resp = await axios.get(feed.url, {
      timeout: 15000,
      headers: {
        'User-Agent': utils.getUserAgent(feed.url),
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
      },
      responseType: 'text'
    });
    
    const $ = cheerio.load(resp.data, { xmlMode: true, decodeEntities: false });
    const items = parser($);
    
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
      if (config.STOPWORDS.has(lw)) return;
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

// ==================== Markdown 日报 =================================

function generateMarkdown(dailyNews, date) {
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const grouped = {};
  dailyNews.forEach(n => {
    if (!grouped[n.module]) grouped[n.module] = [];
    grouped[n.module].push(n);
  });

  let md = `# 🤖 AI Pulse 日报 | ${dateStr}\n\n`;
  md += `> 每日精选全球 AI 领域重要动态（国内 + 国际）\n\n`;
  md += `---\n\n`;

  for (const [mod, items] of Object.entries(grouped)) {
    const meta = config.MODULE_META[mod] || { name: '📰 其他', desc: '' };
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
  for (const feed of config.FEEDS) {
    const items = await fetchFeed(feed);
    allItems.push(...items);
  }
  console.log(`\n✅ 共获取 ${allItems.length} 条原始内容`);

  // 2. 过滤 + 分类
  const seenUrls = new Set();
  const seenTitles = new Set();
  const filtered = [];
  for (const item of allItems) {
    if (!item.title || item.title.length < 5) continue;
    // 去重：优先用 URL 去重（同一链接必是重复），其次用完整标题
    const urlKey = (item.link || '').replace(/\s+/g, '').toLowerCase();
    if (urlKey && seenUrls.has(urlKey)) continue;
    const titleKey = item.title.toLowerCase().replace(/\s+/g, '').replace(/[^\w\u4e00-\u9fa5]/g, '').substring(0, 80);
    if (seenTitles.has(titleKey)) continue;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);

    if (isExcluded(item)) continue;
    if (!isAIRelated(item)) continue;

    item.desc = utils.cleanText(item.desc || '');
    // 过滤 Arxiv 元数据格式暴露的摘要（如 "Announce Type: new Abstract: ..."）
    if (item.desc.startsWith('Announce Type:') || /^(arXiv:|Abstract:|Summary:)\s*\w/i.test(item.desc)) {
      item.desc = '';
    }
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
  const builtin = config.getBuiltinNews().map(b => ({
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
