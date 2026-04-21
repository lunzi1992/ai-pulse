/**
 * AI Pulse 解析器模块
 * 包含各种RSS/Atom解析器
 */

const { smartTruncate, cleanText, parseDateSafe } = require('./utils');

// ==================== 解析器工厂 ====================

/**
 * RSS格式解析器工厂
 * @param {number} limit - 最大解析数量
 * @returns {function} 解析函数
 */
exports.rssParser = function(limit) {
  return ($) => {
    const items = [];
    $('item').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
      const desc = smartTruncate(cleanText($(el).find('description').text()), 400);
      const pubDate = parseDateSafe($(el).find('pubDate').text().trim());
      if (title) items.push({ title, link, desc, pubDate });
    });
    return items;
  };
};

/**
 * Atom格式解析器工厂
 * @param {number} limit - 最大解析数量
 * @returns {function} 解析函数
 */
exports.atomParser = function(limit) {
  return ($) => {
    const items = [];
    $('entry').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').attr('href') || '';
      const desc = smartTruncate(cleanText($(el).find('content,summary').first().text()), 400);
      const pubDate = parseDateSafe($(el).find('updated,published').first().text().trim());
      if (title) items.push({ title, link, desc, pubDate });
    });
    return items;
  };
};

/**
 * Arxiv格式解析器工厂
 * @param {number} limit - 最大解析数量
 * @returns {function} 解析函数
 */
exports.arxivParser = function(limit) {
  return ($) => {
    const items = [];
    $('item').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find('title').text().trim().replace(/\n/g, ' ');
      const link = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
      const desc = smartTruncate(cleanText($(el).find('description').text()), 500);
      const pubDate = parseDateSafe($(el).find('pubDate').text().trim());
      if (title) items.push({ title, link, desc, pubDate });
    });
    return items;
  };
};

/**
 * GitHub Trending解析器
 * @returns {function} 解析函数
 */
exports.githubTrendingParser = function() {
  return ($) => {
    const items = [];
    $('entry').each((i, el) => {
      if (i >= 20) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').attr('href') || '';
      const desc = smartTruncate(
        $(el).find('summary,content').first().text().replace(/<[^>]+>/g, '').trim(),
        300
      );
      const pubDate = parseDateSafe($(el).find('updated').text().trim());
      items.push({ title, link, desc, pubDate });
    });
    return items;
  };
};
