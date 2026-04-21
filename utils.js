/**
 * AI Pulse 工具函数模块
 * 包含各种通用工具函数
 */

// ==================== 日期处理 ====================

/**
 * 安全解析日期字符串
 * @param {string} str - 日期字符串
 * @returns {string} 格式化后的日期字符串 (YYYY-MM-DD)
 */
exports.parseDateSafe = function(str) {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * 格式化日期为中文格式
 * @param {string} ds - 日期字符串 (YYYY-MM-DD)
 * @returns {string} 格式化后的中文日期
 */
exports.fmtDate = function(ds) {
  const d = new Date(ds + 'T00:00:00');
  const wd = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
  return `${d.getMonth()+1}月${d.getDate()}日 ${wd}`;
};

// ==================== 文本处理 ====================

/**
 * 智能截断文本，在标点处截断
 * @param {string} text - 原始文本
 * @param {number} maxLen - 最大长度
 * @returns {string} 截断后的文本
 */
exports.smartTruncate = function(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  // 从 maxLen 位置向前找最近的断句标点
  const segment = text.substring(0, maxLen);
  const bp = Math.max(
    segment.lastIndexOf('。'),
    segment.lastIndexOf('！'),
    segment.lastIndexOf('？'),
    segment.lastIndexOf('；'),
    segment.lastIndexOf('，'),
    segment.lastIndexOf('.')
  );
  return bp > maxLen * 0.6 ? segment.substring(0, bp + 1) : segment.substring(0, maxLen - 2) + '…';
};

/**
 * 清理文本，去除HTML标签和特殊字符
 * @param {string} text - 原始文本
 * @returns {string} 清理后的文本
 */
exports.cleanText = function(text) {
  if (!text) return '';
  return text
    .replace(/Article URL:.*$/gm, '')
    .replace(/#\s*Comments:.*$/gm, '')
    .replace(/Points:.*$/gm, '')
    .replace(/Comments URL:.*$/gm, '')
    // 先把所有 HTML entity 统一解码为字符
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    // 清理剩余的 numeric entity
    .replace(/&#\d+;/g, ' ')
    // 去掉所有 HTML 标签
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * HTML转义
 * @param {string} s - 原始字符串
 * @returns {string} 转义后的字符串
 */
exports.escHtml = function(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

// ==================== 数组处理 ====================

/**
 * 数组去重
 * @param {Array} arr - 原始数组
 * @param {function} keyFn - 生成唯一键的函数
 * @returns {Array} 去重后的数组
 */
exports.uniqueBy = function(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ==================== 网络请求 ====================

/**
 * 生成User-Agent
 * @param {string} url - 请求URL
 * @returns {string} User-Agent字符串
 */
exports.getUserAgent = function(url) {
  const isReddit = url.includes('reddit.com');
  return isReddit
    ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    : 'Mozilla/5.0 (compatible; AIPulse/4.0; +https://lunzi1992.github.io/ai-pulse)';
};
