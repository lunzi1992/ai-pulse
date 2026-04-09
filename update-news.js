#!/usr/bin/env node
/**
 * AI Pulse 每日更新脚本 v2
 * - 抓取 AI Coding & 具身智能新闻
 * - 更新 news.json 并推送 GitHub
 * - 通过 Server酱 推送微信通知
 */

const axios = require('axios');
const cheerio = require('cheerio');

// ============ 配置 ============
const CONFIG = {
  github: {
    owner: 'lunzi1992',
    repo: 'ai-pulse',
    branch: 'master'
  },
  serverchan: {
    sendKey: process.env.SERVERCHAN_KEY
  },
  dataFile: 'news.json'
};

// ============ HTTP 工具 ============
async function httpGet(url, options = {}) {
  try {
    const res = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...options.headers
      },
      timeout: 15000
    });
    return res.data;
  } catch (e) {
    console.log(`  ⚠️ 请求失败: ${url.slice(0, 60)}...`);
    return null;
  }
}

async function httpPost(url, data) {
  try {
    const res = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return res.data;
  } catch (e) {
    return null;
  }
}

// ============ GitHub API ============
async function githubApi(method, path, data = null) {
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  const res = await axios({
    method,
    url: `https://api.github.com${path}`,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Pulse/1.0'
    },
    data
  });
  return res.data;
}

async function getFile(path) {
  try {
    const data = await githubApi('GET', `/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}?ref=${CONFIG.github.branch}`);
    return {
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
      sha: data.sha
    };
  } catch {
    return null;
  }
}

async function updateFile(path, content, message, sha = null) {
  const body = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch: CONFIG.github.branch
  };
  if (sha) body.sha = sha;
  return await githubApi('PUT', `/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}`, body);
}

// ============ Server酱推送 ============
async function sendWechat(title, desp) {
  if (!CONFIG.serverchan.sendKey) {
    console.log('⚠️  Server酱未配置，跳过微信推送');
    return;
  }
  const url = `https://sctapi.ftqq.com/${CONFIG.serverchan.sendKey}.send`;
  const result = await httpPost(url, { title, desp });
  if (result) console.log('✅ 微信推送成功');
  else console.log('⚠️ 微信推送失败');
}

// ============ 新闻搜索 ============
async function searchNews(query, tags) {
  const results = [];
  
  // 使用 DuckDuckGo Lite (text模式，更容易解析)
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const html = await httpGet(url);
  
  if (!html) return results;
  
  const $ = cheerio.load(html);
  
  // 解析搜索结果
  $('a.result-link').each((i, el) => {
    if (results.length >= 4) return false;
    
    const title = $(el).text().trim();
    const href = $(el).attr('href') || '';
    
    // 获取相邻的 snippet
    const snippetEl = $(el).closest('.result').find('.result-snippet');
    const snippet = snippetEl.text().trim();
    
    if (title && title.length > 10 && !title.includes('...</')) {
      results.push({
        title: title.slice(0, 100),
        content: snippet.slice(0, 200),
        url: href
      });
    }
  });
  
  // 为每条结果添加标签
  return results.map(r => ({
    ...r,
    tags,
    source: extractSource(r.url)
  }));
}

function extractSource(url) {
  if (!url) return '网络';
  if (url.includes('36kr')) return '36氪';
  if (url.includes('ithome')) return 'IT之家';
  if (url.includes('zhihu')) return '知乎';
  if (url.includes('csdn')) return 'CSDN';
  if (url.includes('github')) return 'GitHub';
  if (url.includes('openai')) return 'OpenAI';
  if (url.includes('anthropic')) return 'Anthropic';
  if (url.includes('the Verge')) return 'The Verge';
  if (url.includes('techcrunch')) return 'TechCrunch';
  if (url.includes('wired')) return 'Wired';
  return '网络';
}

function judgeImportance(title, content) {
  const highKeywords = ['发布', '突破', '开源', '融资', 'GPT', 'Claude', 'Figure', '革命', '重磅', '史上', '首个'];
  const mediumKeywords = ['更新', '升级', '新版本', '新功能', '发布周'];
  
  const text = (title + content).toLowerCase();
  if (highKeywords.some(kw => text.includes(kw))) return 'high';
  if (mediumKeywords.some(kw => text.includes(kw))) return 'medium';
  return 'low';
}

// ============ 主流程 ============
async function main() {
  console.log('🚀 AI Pulse 每日更新开始...\n');
  
  const today = new Date().toISOString().split('T')[0];
  const allResults = [];
  
  // 搜索配置
  const searchQueries = [
    { q: 'AI coding tools Claude Cursor GPT programming 2026', tags: ['AI Coding'] },
    { q: 'embodied AI humanoid robot latest 2026', tags: ['具身智能'] },
    { q: '大模型 开源 AI 发布 2026年4月', tags: ['大模型', '开源'] },
    { q: '具身智能 机器人 量产 商业化 2026', tags: ['具身智能'] }
  ];
  
  for (const { q, tags } of searchQueries) {
    console.log(`🔍 搜索: ${q.slice(0, 50)}...`);
    const results = await searchNews(q, tags);
    console.log(`  → 获取到 ${results.length} 条`);
    allResults.push(...results);
    await new Promise(r => setTimeout(r, 1000)); // 礼貌延迟
  }
  
  // 处理每条结果
  const news = allResults.map((r, idx) => ({
    id: `${today}-${idx + 1}`,
    date: today,
    title: r.title,
    content: r.content,
    tags: r.tags,
    source: r.source,
    url: r.url,
    importance: judgeImportance(r.title, r.content)
  }));
  
  // 去重（标题相似度）
  const uniqueNews = [];
  for (const n of news) {
    const key = n.title.split(/[,\s]/).slice(0, 4).join('');
    const isDup = uniqueNews.some(u => 
      u.title.split(/[,\s]/).slice(0, 4).join('') === key
    );
    if (!isDup) uniqueNews.push(n);
  }
  
  const finalNews = uniqueNews.slice(0, 8);
  
  console.log(`\n📰 精选 ${finalNews.length} 条新闻：`);
  finalNews.forEach((n, i) => {
    console.log(`  ${i + 1}. [${n.importance}] ${n.title.slice(0, 55)}${n.title.length > 55 ? '...' : ''}`);
  });
  
  // ========== 更新 news.json ==========
  console.log('\n📥 更新 news.json...');
  let currentData = { meta: {}, hotKeywords: [], weekFocus: [], news: [] };
  let sha = null;
  
  const existing = await getFile(CONFIG.dataFile);
  if (existing) {
    currentData = JSON.parse(existing.content);
    sha = existing.sha;
    currentData.news = currentData.news.filter(n => n.date !== today);
    console.log(`  已有 ${currentData.news.length} 条历史数据`);
  }
  
  // 合并并排序（新的在前）
  const allNews = [...finalNews, ...currentData.news];
  
  // 更新热词
  const hotKeywords = computeHotKeywords(allNews);
  
  // 更新本周关注
  const weekFocus = finalNews
    .filter(n => n.importance === 'high')
    .slice(0, 3)
    .map(n => ({
      title: n.title.slice(0, 50),
      desc: n.content ? n.content.slice(0, 80) : ''
    }));
  
  const newData = {
    meta: {
      title: 'AI Pulse',
      subtitle: 'AI Coding & 具身智能信息聚合',
      description: '每日精选 AI Coding 与具身智能领域重要动态',
      lastUpdate: today
    },
    hotKeywords,
    weekFocus: weekFocus.length > 0 ? weekFocus : currentData.weekFocus,
    news: allNews
  };
  
  const jsonContent = JSON.stringify(newData, null, 2);
  
  // ========== 推送到 GitHub ==========
  console.log('\n📤 推送到 GitHub...');
  try {
    await updateFile(
      CONFIG.dataFile,
      jsonContent,
      `📰 更新 ${today} AI 日报：${finalNews.length} 条新动态`,
      sha
    );
    console.log('✅ GitHub 更新成功');
  } catch (e) {
    console.log('❌ GitHub 更新失败:', e.response?.data?.message || e.message);
    process.exit(1);
  }
  
  // ========== 微信推送 ==========
  console.log('\n📱 发送微信通知...');
  const summary = finalNews.slice(0, 5).map((n, i) => 
    `• ${n.title.slice(0, 50)}${n.title.length > 50 ? '...' : ''}`
  ).join('\n');
  
  await sendWechat(
    `⚡ AI Pulse · ${today}`,
    `今日精选 ${finalNews.length} 条动态：\n\n${summary}\n\n🔗 查看完整日报：https://lunzi1992.github.io/ai-pulse`
  );
  
  console.log('\n✅ AI Pulse 每日更新完成！');
}

// ============ 辅助函数 ============
function computeHotKeywords(news) {
  const keywords = ['GPT-6', 'Claude', '智元', 'Figure', '具身智能', '机器人', '开源', '融资', 'AI Coding', '大模型'];
  const counts = {};
  
  for (const kw of keywords) {
    counts[kw] = news.filter(n => 
      n.title.includes(kw) || (n.content && n.content.includes(kw))
    ).length;
  }
  
  return Object.entries(counts)
    .filter(([_, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword, count]) => ({ keyword, count }));
}

// ============ 启动 ============
main().catch(e => {
  console.error('\n❌ 更新失败:', e.message);
  process.exit(1);
});
