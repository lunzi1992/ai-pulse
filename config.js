/**
 * AI Pulse 配置文件
 * 包含数据源、关键词、模块等配置
 */

// ==================== 数据源配置 ====================

exports.FEEDS = [
  // ── 国内·行业动态 ──────────────────────────────────────────────────────
  {
    module: 'industry', region: 'cn',
    name: 'IT之家',
    url: 'https://www.ithome.com/rss/',
    limit: 50
  },
  {
    module: 'industry', region: 'cn',
    name: '36氪',
    url: 'https://36kr.com/feed',
    limit: 50
  },
  {
    module: 'industry', region: 'cn',
    name: '虎嗅',
    url: 'https://www.huxiu.com/rss/0.xml',
    limit: 30
  },
  {
    module: 'industry', region: 'cn',
    name: '腾讯科技',
    url: 'https://tech.qq.com/rss.xml',
    limit: 30
  },
  {
    module: 'industry', region: 'cn',
    name: '机器之心',
    url: 'https://syncedreview.com/feed/',
    limit: 30
  },

  // ── 国内·技术进展 ─────────────────────────────────────────────────────
  {
    module: 'tech', region: 'cn',
    name: '量子位',
    url: 'https://qbitai.com/feed',
    limit: 30
  },

  // ── 国际·技术进展 ─────────────────────────────────────────────────────
  {
    module: 'tech', region: 'global',
    name: 'HackerNews-AI',
    url: 'https://hnrss.org/newest?q=AI%20OR%20%22machine%20learning%22%20OR%20%22large%20language%22%20OR%20GPT%20OR%20Claude%20OR%20LLM%20OR%20%22deep%20learning%22%20OR%20%22neural%20network%22%20OR%20robotics&count=50',
    limit: 50
  },
  {
    module: 'tech', region: 'global',
    name: 'HackerNews-Dev',
    url: 'https://hnrss.org/newest?q=programming%20OR%20developer%20OR%20cursor%20OR%20%22claude%20code%22%20OR%20%22vibe%20coding%22%20OR%20%22ai%20agent%22&count=30',
    limit: 30
  },
  {
    module: 'tech', region: 'global',
    name: 'MIT Tech Review',
    url: 'https://www.technologyreview.com/feed/',
    limit: 20
  },
  {
    module: 'tech', region: 'global',
    name: 'The Verge AI',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    limit: 20
  },
  {
    module: 'tech', region: 'global',
    name: 'Arxiv AI',
    url: 'https://arxiv.org/rss/cs.AI',
    limit: 20
  },
  {
    module: 'tech', region: 'global',
    name: 'Arxiv LG',
    url: 'https://arxiv.org/rss/cs.LG',
    limit: 15
  },

  // ── 国际·行业动态 ─────────────────────────────────────────────────────
  {
    module: 'industry', region: 'global',
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    limit: 20
  },
  {
    module: 'industry', region: 'global',
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/feed/',
    limit: 20
  },

  // ── 国际·社区洞察 ─────────────────────────────────────────────────────
  {
    module: 'community', region: 'global',
    name: 'Reddit-MachineLearning',
    url: 'https://old.reddit.com/r/MachineLearning/new.rss',
    limit: 20
  },
  {
    module: 'community', region: 'global',
    name: 'Reddit-LocalLLaMA',
    url: 'https://old.reddit.com/r/LocalLLaMA/new.rss',
    limit: 20
  },
  {
    module: 'community', region: 'global',
    name: 'Reddit-Artificial',
    url: 'https://old.reddit.com/r/Artificial/new.rss',
    limit: 20
  },

  // ── 国际·工具与应用 ────────────────────────────────────────────────────
  {
    module: 'tools', region: 'global',
    name: 'ProductHunt',
    url: 'https://www.producthunt.com/feed',
    limit: 20
  },
  {
    module: 'tools', region: 'global',
    name: 'GitHub Trending',
    url: 'https://github.com/trending.atom',
    limit: 20
  }
];

// ==================== 停用词表（热词过滤）=====================

exports.STOPWORDS = new Set([
  // 英文停用词
  'the','and','for','with','this','that','from','are','was','were','has','have',
  'had','will','would','could','should','can','may','might','shall','does','did',
  'but','not','also','all','any','its','our','your','their','they','them','these',
  'those','each','been','being','more','some','into','over','then','than','such',
  'out','new','use','one','two','three','get','set','let','via','per','way','how',
  'who','what','when','where','why','just','now','only','both','about','after',
  'here','there','much','many','most','other','long','even','back','first','last',
  'same','next','good','best','high','low','old','big','great','little','small',
  'only','very','just','really','so','if','then','else','when','where','while',
  // 技术噪音词
  'utm','amp','feed','atom','href','posts','https','http','www','com','org','net',
  'io','app','ly','rss','xml','json','html','css','url','img','src','github',
  'producthunt','reddit','hackernews','arxiv',
  // 媒体/网站噪音词
  '消息','新闻','报道','来源','日前','今日','昨日','近日','该公司','本刊',
  '之家','氪','腾讯','新浪','网易','搜狐','凤凰',
  // 英文单复数/大小写噪音（统一归一后变成同一词）
  'type','abstract','reasoning','paper','show','announce','new','update','update'
]);

// ==================== AI 相关关键词库 =====================

exports.AI_KEYWORDS = [
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

// ==================== 必须排除的关键词 =====================

exports.MUST_EXCLUDE = [
  // 汽车/消费电子
  '新能源车', 'suv', '续航里程', '发动机', '变速箱', '新车上市', '预售价', '配置单',
  '手机发布会', '平板电脑', '电视', '显示器', '耳机',
  // 娱乐/生活
  '演唱会', '综艺', '电影票房', '直播带货', '抖音带货',
  // 纯财经
  '房价', '炒房', '彩票', '抽奖', '优惠券'
];

// ==================== 模块关键词 =====================

exports.MODULE_KEYWORDS = {
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

// ==================== 模块元数据 =====================

exports.MODULE_META = {
  industry: { icon: '🏢', name: '行业动态', desc: '融资·并购·政策·市场', color: 'var(--industry)' },
  tech:     { icon: '🔬', name: '技术进展', desc: '论文·模型·开源·研究', color: 'var(--tech)' },
  community:{ icon: '💬', name: '社区洞察', desc: '讨论·趋势·观点·评测', color: 'var(--community)' },
  tools:    { icon: '🛠️', name: '工具与应用', desc: '产品·效率·开源工具', color: 'var(--tools)' }
};

// ==================== 内置新闻（兜底保证有内容）=====================

exports.getBuiltinNews = function() {
  return [
    {
      title: 'GPT-6「土豆」定档4月14日，性能全面碾压当前最强模型',
      summary: 'OpenAI下一代旗舰模型代号Spud，代码推理能力较GPT-5.4提升约40%，支持200万Token超长上下文，定价约2.5美元/百万Token，融合ChatGPT+Codex+Atlas打造统一桌面超级智能体平台。',
      module: 'tech', region: 'global',
      source: '36氪/量子位',
      url: 'https://www.36kr.com/p/3754726863012361',
      importance: 'high', date: '2026-04-14'
    },
    {
      title: 'CEAI 2026中国具身智能大会在合肥开幕',
      summary: '第三届中国具身智能大会（CEAI 2026）4月10-12日在合肥举办，国内头部机器人企业、高校研究院集中亮相，赛迪研究院定调2026年为具身智能规模化落地元年。',
      module: 'industry', region: 'cn',
      source: '凤凰安徽',
      url: '', importance: 'high', date: '2026-04-12'
    },
    {
      title: '智元AGIBOT「AI发布周」进行中，每日一项物理AI王炸',
      summary: '智元机器人（稚晖君主导）4月7-14日发起AI发布周，每天发布一项具身智能核心技术，涵盖感知、运动控制、端到端学习、操作泛化等方向。',
      module: 'tech', region: 'cn',
      source: 'IT之家',
      url: 'https://www.ithome.com/0/935/660.htm',
      importance: 'high', date: '2026-04-07'
    },
    {
      title: '阿里领投生数科技3亿美元融资，AI视频生成持续吸金',
      summary: '阿里巴巴领投AI视频生成公司生数科技新一轮3亿美元融资，估值进一步攀升。',
      module: 'industry', region: 'cn',
      source: '36氪',
      url: 'https://36kr.com/newsflashes/3760251105411588',
      importance: 'medium', date: '2026-04-16'
    },
    {
      title: 'Cursor推出多Agent协作模式，编程效率再翻倍',
      summary: 'Cursor IDE新版引入多Agent并行编程模式，支持自然语言描述需求后自动拆解任务、分配Agent、协同编码。',
      module: 'tools', region: 'global',
      source: 'ProductHunt',
      url: 'https://www.cursor.com',
      importance: 'high', date: '2026-04-18'
    }
  ];
};
