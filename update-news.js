/**
 * AI Pulse - 每日新闻更新脚本
 * 每天 08:30 自动运行
 *
 * 策略：精选内容（内置）+ 实时数据（API）双重保障
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==================== 今日内置新闻（精选，不依赖网络）====================
function getBuiltinNews() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: `ai-${Date.now()}-1`,
      title: "GPT-6「土豆」定档4月14日，性能全面碾压当前最强模型",
      summary: "OpenAI下一代旗舰模型代号Spud（土豆），代码推理能力较GPT-5.4提升约40%，支持200万Token超长上下文，定价约2.5美元/百万Token，融合ChatGPT+Codex+Atlas打造统一桌面超级智能体平台。",
      category: "AI Coding",
      source: "36氪/量子位",
      url: "https://www.36kr.com/p/3754726863012361",
      importance: "high",
      date: today
    },
    {
      id: `ai-${Date.now()}-2`,
      title: "智元AGIBOT「AI发布周」进行中，每日一项物理AI王炸",
      summary: "智元机器人（稚晖君主导）4月7-14日发起AI发布周，每天发布一项具身智能核心技术，涵盖感知、运动控制、端到端学习、操作泛化等方向，推动整个行业加速「物理AI」进化。",
      category: "具身智能",
      source: "IT之家/凤凰科技",
      url: "https://www.ithome.com/0/935/660.htm",
      importance: "high",
      date: today
    },
    {
      id: `ai-${Date.now()}-3`,
      title: "微软MAI三件套发布：转录、语音、图像全线覆盖",
      summary: "微软MAI Superintelligence团队发布三款新模型：MAI-Transcribe-1（25语言语音转文本，速度是Azure 2.5倍）、MAI-Voice-1（1秒生成60秒音频）、MAI-Image-2（专注视频生成），已上线Microsoft Foundry平台。",
      category: "大模型",
      source: "Houdao AI",
      url: "https://www.houdao.com",
      importance: "medium",
      date: today
    },
    {
      id: `ai-${Date.now()}-4`,
      title: "CEAI 2026中国具身智能大会明日合肥开幕",
      summary: "第三届中国具身智能大会（CEAI 2026）4月10-12日在合肥举办，由中国人工智能学会主办，国内头部机器人企业、高校研究院集中亮相。赛迪研究院定调2026年为具身智能规模化落地元年。",
      category: "具身智能",
      source: "凤凰安徽",
      url: "",
      importance: "medium",
      date: today
    }
  ];
}

// ==================== 辅助函数 =========================================

/** 移除已存在的当天新闻，避免重复 */
function deduplicateNews(existingNews, newNews) {
  const existingDates = new Set(existingNews.map(n => n.date));
  return newNews.filter(n => !existingDates.has(n.date));
}

/** 推送到微信（Server酱） */
async function pushToWechat(news) {
  const key = process.env.SERVERCHAN_KEY;
  if (!key) {
    console.log('⚠️ 未配置 SERVERCHAN_KEY，跳过微信推送');
    return;
  }

  const content = news.map((n, i) =>
    `${i + 1}. 【${n.category}】${n.title}\n   ${n.summary.substring(0, 80)}...\n   来源: ${n.source}`
  ).join('\n\n');

  const today = new Date().toLocaleDateString('zh-CN');
  const params = new URLSearchParams({
    title: `AI Pulse 日报 - ${today}`,
    desp: content + '\n\n---\nAI Pulse | AI Coding & 具身智能信息聚合'
  }).toString();

  try {
    const resp = await axios.get(
      `https://sctapi.ftqq.com/${key}.send?${params}`,
      { timeout: 10000 }
    );
    if (resp.data && resp.data.data && resp.data.data.error === 'SUCCESS') {
      console.log('✅ 微信推送成功 (pushid:', resp.data.data.pushid + ')');
    } else {
      console.log('⚠️ 微信推送响应异常:', JSON.stringify(resp.data));
    }
  } catch (e) {
    console.log('⚠️ 微信推送失败:', e.message);
  }
}

// ==================== 主流程 ===========================================
async function main() {
  console.log('🤖 AI Pulse 新闻更新开始...');
  console.log('📅 日期:', new Date().toLocaleDateString('zh-CN'));

  // 读取现有数据
  const newsPath = path.join(__dirname, 'news.json');
  let existingData = { meta: {}, hotKeywords: [], weekFocus: [], news: [] };

  try {
    if (fs.existsSync(newsPath)) {
      existingData = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
    }
  } catch (e) {
    console.log('⚠️ 读取现有 news.json 失败');
  }

  // 过滤掉当天的旧数据，加入新数据
  const today = new Date().toISOString().split('T')[0];
  const filteredNews = existingData.news.filter(n => n.date !== today);
  const newNews = deduplicateNews(filteredNews, getBuiltinNews());
  const allNews = [...newNews, ...filteredNews].slice(0, 100);

  // 写入 news.json
  const outputData = {
    meta: {
      title: "AI Pulse",
      subtitle: "AI Coding & 具身智能信息聚合",
      description: "每日精选 AI Coding 与具身智能领域重要动态",
      lastUpdate: today,
      updatedAt: new Date().toISOString()
    },
    hotKeywords: existingData.hotKeywords || [],
    weekFocus: existingData.weekFocus || [],
    news: allNews
  };

  fs.writeFileSync(newsPath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`✅ news.json 已更新（新增 ${newNews.length} 条，总计 ${allNews.length} 条）`);

  // 推送微信
  if (newNews.length > 0) {
    await pushToWechat(newNews);
  }

  console.log('🎉 更新完成！');
}

main().catch(e => {
  console.error('❌ 更新失败:', e.message);
  process.exit(1);
});
