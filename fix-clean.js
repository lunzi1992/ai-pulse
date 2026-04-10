const fs = require('fs');
let content = fs.readFileSync('update-news.js', 'utf8');

// 替换所有 desc 清理为使用 cleanText
const old1 = ".find('description').text().replace(/<[^>]+>/g, '').trim().substring(0, 300)";
const new1 = ".find('description').text()).substring(0, 300)";
const count1 = (content.match(new RegExp(old1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
content = content.split(old1).join(new1);

// 替换 HackerNews 的多行清理 - 把 .replace(...) 链换成 cleanText
const old2 = `const desc = $(el).find('description').text()
          .replace(/<[^>]+>/g, '')
          .replace(/Article URL:.*$/gm, '')
          .replace(/# Comments:.*$/gm, '')
          .replace(/Points:.*$/gm, '')
          .trim().substring(0, 300)`;
const new2 = `const desc = cleanText($(el).find('description').text()).substring(0, 300)`;
content = content.split(old2).join(new2);

fs.writeFileSync('update-news.js', content);
console.log('Done');
