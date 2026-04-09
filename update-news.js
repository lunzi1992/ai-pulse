#!/usr/bin/env node
/**
 * AI Pulse 每日更新脚本
 * - 抓取 AI Coding & 具身智能新闻
 * - 更新 news.json
 * - 推送到 GitHub
 * - 通过 Server酱 推送微信通知
 */

const axios = require('axios');
const https = require('https');

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
async function httpGet(url) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 AI-Pulse/1.0' },
      timeout: 10000
    });
    return res.data;
  } catch (e) {
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
  const token = process.env.GITHUB_TOKEN;
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
  await githubApi('PUT', `/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}`, body);
}

// ============ Server酱推送 ============
async function sendWechat(title, desp) {
  if (!CONFIG.serverchan.sendKey) {
    console.log('⚠️  Server酱未配置，跳过微信推送');
    return;
  }
  const url = `https://sctapi.ftqq.com/${CONFIG.serverchan.sendKey}.send`;
  await httpPost(url, { title, desp });
  console.log('✅ 微信推送成功');
}

// ============ 新闻搜索 ============
async function searchNews(query) {
  // 使用 DuckDuckGo HTML 搜索（免费，无需 API key）
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await httpGet(url);
  
  if (!html) return [];
  
  // 简单解析搜索结果
  const results = [];
  const regex = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  
  while ((match = regex.exec(html)) !== null && results.length < 5) {
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    const snippet = match[3].replace(/<[^>]*>/g, '').trim();
    if (title && title.length > 10) {
      results.push({
        title: title.slice(0, 100),
        content: snippet.slice(0, 200),
        url: match[1]
      });
    }
  }
  
  return results;
}

// ============ 主流程 ============
async function main() {
  console.log('🚀 AI Pulse 每日更新开始...\n');
  
  const today = new Date().toISOString().split('T')[0];
  const news = [];
  
  // ========== 搜索新闻 ==========
  const queries = [
    { q: 'AI coding tools Claude Cursor GPT 编程 2026', tags: ['AI Coding'] },
    { q: '具身智能 人形机器人 最新进展 2026', tags: ['具身智能'] },
    { q: '大模型 开源 AI 发布 2026年4月', tags: ['大模型', '开源'] }
  ];
  
  for (const { q, tags } of queries) {
    console.log(`🔍 搜索: ${q}`);
    const results = await searchNews(q);
    
    for (const r of results) {
      // 判断重要性
      let importance = 'low';
      const highKeywords = ['发布', '突破', '开源', '融资', 'GPT', 'Claude', 'Figure'];
      const mediumKeywords = ['新版本', '更新', '升级', '发布周'];
      
      if (highKeywords.some(kw => r.title.includes(kw))) importance = 'high';
      else if (mediumKeywords.some(kw => r.title.includes(kw))) importance = 'medium';
      
      // 判断来源
      let source = '';
      if (r.url.includes('36kr')) source = '36氪';
      else if (r.url.includes('ithome')) source = 'IT之家';
      else if (r.url.includes('zhihu')) source = '知乎';
      else if (r.url.includes('csdn')) source = 'CSDN';
      else if (r.url.includes('github')) source = 'GitHub';
      else if (r.url.includes('openai')) source = 'OpenAI';
      else if (r.url.includes('anthropic')) source = 'Anthropic';
      else source = '网络';
      
      news.push({
        id: `${today}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: today,
        title: r.title,
        content: r.content,
        tags,
        source,
        importance,
        url: r.url
      });
    }
  }
  
  // 去重（根据标题相似度）
  const uniqueNews = [];
  for (const n of news) {
    const isDup = uniqueNews.some(u => 
      u.title.split(' ').slice(0, 3).join('') === 
      n.title.split(' ').slice(0, 3).join('')
    );
    if (!isDup) uniqueNews.push(n);
  }
  
  // 限制数量
  const finalNews = uniqueNews.slice(0, 8);
  
  console.log(`\n📰 获取到 ${finalNews.length} 条新闻\n`);
  finalNews.forEach((n, i) => {
    console.log(`  ${i + 1}. [${n.importance}] ${n.title.slice(0, 60)}`);
  });
  
  // ========== 更新 news.json ==========
  console.log('\n📥 获取当前 news.json...');
  let currentData = { meta: {}, hotKeywords: [], weekFocus: [], news: [] };
  let sha = null;
  
  const existing = await getFile(CONFIG.dataFile);
  if (existing) {
    currentData = JSON.parse(existing.content);
    sha = existing.sha;
    // 移除今天的旧数据
    currentData.news = currentData.news.filter(n => n.date !== today);
  }
  
  // 合并
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
  
  // ========== 推送到 GitHub ==========
  console.log('\n📤 推送更新到 GitHub...');
  const jsonContent = JSON.stringify(newData, null, 2);
  
  await updateFile(
    CONFIG.dataFile,
    jsonContent,
    `📰 更新 ${today} AI 日报：${finalNews.length} 条新动态`,
    sha
  );
  console.log('✅ GitHub 更新成功');
  
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
  console.error('❌ 更新失败:', e.message);
  process.exit(1);
});
