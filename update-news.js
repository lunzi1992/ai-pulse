#!/usr/bin/env node
/**
 * AI Pulse 每日更新脚本
 * - 抓取 AI Coding & 具身智能新闻
 * - 更新 news.json
 * - 推送到 GitHub
 * - 通过 Server酱 推送微信通知
 */

const https = require('https');
const http = require('http');

// ============ 配置 ============
const CONFIG = {
  // GitHub 配置
  github: {
    owner: 'lunzi1992',
    repo: 'ai-pulse',
    branch: 'master',
    token: process.env.GITHUB_TOKEN // 从环境变量读取
  },
  
  // Server酱 配置
  serverchan: {
    sendKey: process.env.SERVERCHAN_KEY, // 从环境变量读取
    pushUrl: 'https://sctapi.ftqq.com'
  },
  
  // 数据文件路径（相对于脚本目录）
  dataFile: 'news.json'
};

// ============ HTTP 请求工具 ============
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'AI-Pulse/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function httpPost(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const client = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============ GitHub API ============
async function getFileContent(path) {
  const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}?ref=${CONFIG.github.branch}`;
  const data = await httpGet(url);
  if (data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return null;
}

async function updateFile(path, content, message, sha) {
  const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}`;
  const body = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch: CONFIG.github.branch
  };
  if (sha) {
    body.sha = sha;
  }
  
  return httpPost(url, body, {
    'Authorization': `token ${CONFIG.github.token}`,
    'User-Agent': 'AI-Pulse/1.0'
  });
}

// ============ Server酱推送 ============
async function sendServerChan(title, content) {
  if (!CONFIG.serverchan.sendKey) {
    console.log('⚠️ Server酱未配置，跳过微信推送');
    return;
  }
  
  const url = `${CONFIG.serverchan.pushUrl}/${CONFIG.serverchan.sendKey}.send`;
  await httpPost(url, {
    title,
    desp: content
  });
  console.log('✅ 微信推送成功');
}

// ============ 新闻数据处理 ============
function formatNewsForJson(news) {
  const today = new Date().toISOString().split('T')[0];
  return news.map((item, idx) => ({
    id: `${today}-${idx + 1}`,
    date: today,
    title: item.title,
    content: item.content,
    tags: item.tags || [],
    source: item.source,
    importance: item.importance || 'medium'
  }));
}

// ============ 主流程 ============
async function main() {
  console.log('🚀 AI Pulse 每日更新开始...\n');
  
  const today = new Date().toISOString().split('T')[0];
  
  // 1. 获取当前 news.json
  console.log('📥 获取当前 news.json...');
  let currentData = { meta: {}, hotKeywords: [], weekFocus: [], news: [] };
  let fileSha = null;
  
  try {
    const currentContent = await getFileContent(CONFIG.dataFile);
    if (currentContent) {
      currentData = JSON.parse(currentContent);
      // 获取文件 SHA 用于更新
      const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${CONFIG.dataFile}?ref=${CONFIG.github.branch}`;
      const fileInfo = await httpGet(url);
      fileSha = fileInfo.sha;
    }
  } catch (e) {
    console.log('📄 news.json 不存在，将创建新文件');
  }
  
  // 2. 过滤掉今天的旧数据（重新生成今天的）
  const otherDayNews = currentData.news.filter(n => n.date !== today);
  
  // 3. 模拟新闻数据（实际会从搜索结果中提取，这里用占位示例）
  // 真实场景下，这里会调用 web_search 获取新闻
  const newNews = generateMockNews();
  
  // 4. 合并数据
  const allNews = [...newNews, ...otherDayNews];
  
  // 5. 更新热词统计
  const hotKeywords = updateHotKeywords(allNews, currentData.hotKeywords);
  
  // 6. 更新本周关注
  const weekFocus = updateWeekFocus(newNews, currentData.weekFocus);
  
  // 7. 构建新数据
  const newData = {
    meta: currentData.meta || {
      title: 'AI Pulse',
      subtitle: 'AI Coding & 具身智能信息聚合',
      description: '每日精选 AI Coding 与具身智能领域重要动态'
    },
    hotKeywords,
    weekFocus,
    news: allNews
  };
  
  // 8. 保存到文件
  const jsonContent = JSON.stringify(newData, null, 2);
  
  // 9. 推送到 GitHub
  console.log('\n📤 推送更新到 GitHub...');
  if (!CONFIG.github.token) {
    console.log('❌ GITHUB_TOKEN 未配置，无法推送');
    console.log('请设置环境变量 GITHUB_TOKEN');
    process.exit(1);
  }
  
  const result = await updateFile(
    CONFIG.dataFile,
    jsonContent,
    `📰 更新 ${today} AI 日报：${newNews.length} 条新动态`,
    fileSha
  );
  
  if (result.status === 200 || result.status === 201) {
    console.log('✅ GitHub 更新成功');
  } else {
    console.log('❌ GitHub 更新失败:', result.data);
  }
  
  // 10. 推送微信通知
  console.log('\n📱 发送微信通知...');
  const newsSummary = newNews.map(n => `• ${n.title}`).join('\n');
  await sendServerChan(
    `⚡ AI Pulse · ${today}`,
    `今日精选 ${newNews.length} 条动态：\n\n${newsSummary}\n\n🔗 查看完整日报：https://lunzi1992.github.io/ai-pulse`
  );
  
  console.log('\n✅ AI Pulse 每日更新完成！');
}

// ============ 辅助函数 ============
function generateMockNews() {
  // 这里需要传入真实的新闻数据
  // 实际运行时由主程序提供
  return [];
}

function updateHotKeywords(news, existing) {
  const counts = {};
  const keywords = ['GPT-6', 'Claude', '智元', 'Figure', '具身智能', '机器人', '开源', '融资', 'AI Coding', '大模型'];
  
  keywords.forEach(kw => {
    counts[kw] = news.filter(n => 
      n.title.includes(kw) || (n.content && n.content.includes(kw))
    ).length;
  });
  
  return Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword, count]) => ({ keyword, count }));
}

function updateWeekFocus(newNews, existing) {
  // 取最重要（high）的3条作为本周关注
  const highPriority = newNews
    .filter(n => n.importance === 'high')
    .slice(0, 3)
    .map(n => ({
      title: n.title,
      desc: n.content ? n.content.slice(0, 50) + '...' : ''
    }));
  
  return highPriority.length > 0 ? highPriority : existing.slice(0, 3);
}

// ============ 启动 ============
main().catch(console.error);
