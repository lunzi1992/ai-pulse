/**
 * CSDN 自动发布脚本
 * 支持：登录(保存Cookie) / 发布文章
 *
 * 使用方式：
 *   node csdn-publish.js login          # 首次登录（手动操作一次）
 *   node csdn-publish.js publish <md文件路径>  # 发布单篇文章
 *   node csdn-publish.js publish daily/2026-04-22.md  # 发布昨日日报
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, 'csdn-cookies.json');
const CONFIG_FILE = path.join(__dirname, 'csdn-config.json');

// 默认标签
const DEFAULT_TAGS = ['AI', '人工智能', '大模型', 'LLM', '机器学习', '工具'];

// ==================== 配置读写 ====================

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return { username: '', cookies: null };
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// ==================== 登录（保存 Cookie） ====================

async function login() {
  console.log('🔐 开始 CSDN 登录流程...');
  console.log('📝 步骤：在浏览器中完成登录（推荐扫码）');
  console.log('   登录成功后窗口会自动关闭，Cookie 会保存到本地\n');

  const config = loadConfig();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 访问 CSDN 编辑器（会自动跳转到登录页）
  await page.goto('https://mp.csdn.net/edit', { waitUntil: 'networkidle' });

  // 等待用户完成登录（检测登录成功后页面变化）
  try {
    await page.waitForURL(/mp\.csdn\.net\/edit/, { timeout: 120000 });
    console.log('✅ 检测到登录成功！');
  } catch (e) {
    // 等待用户手动关闭窗口后检查
    console.log('⏳ 等待登录中...（请在浏览器中完成登录，然后关闭浏览器）');
    await page.waitForTimeout(120000);
  }

  // 保存 Cookie
  const cookies = await context.cookies();
  config.cookies = cookies;
  config.username = cookies.find(c => c.name === 'UserName')?.value || '';
  config.loginTime = new Date().toISOString();
  saveConfig(config);

  await browser.close();
  console.log(`✅ Cookie 已保存！用户: ${config.username}`);
  console.log(`   保存时间: ${config.loginTime}`);
  console.log('\n💡 提示：Cookie 有效期约 30 天，过期后重新运行 login 即可');
}

// ==================== 核心发布函数 ====================

async function publishArticle(mdFilePath, options = {}) {
  const config = loadConfig();

  if (!config.cookies || config.cookies.length === 0) {
    throw new Error('未登录！请先运行: node csdn-publish.js login');
  }

  // 读取 Markdown 文件
  if (!fs.existsSync(mdFilePath)) {
    throw new Error(`文件不存在: ${mdFilePath}`);
  }
  const mdContent = fs.readFileSync(mdFilePath, 'utf8');

  // 解析 front matter 或从内容提取标题
  const title = extractTitle(mdContent, options.title);
  const tags = options.tags || DEFAULT_TAGS;

  console.log(`📤 准备发布到 CSDN...`);
  console.log(`   标题: ${title}`);
  console.log(`   标签: ${tags.join(', ')}`);
  console.log(`   文件: ${mdFilePath}`);

  // 启动浏览器
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 先设置 Cookie（访问任意 CSDN 页面注入 cookie）
    await context.addCookies(config.cookies);

    // 访问编辑器（带 Cookie 免登录）
    console.log('\n🌐 访问 CSDN 编辑器...');
    await page.goto('https://mp.csdn.net/edit', { waitUntil: 'networkidle', timeout: 30000 });

    // 检测是否真的登录了（页面 URL 或元素判断）
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('passport')) {
      throw new Error('Cookie 已过期，请重新登录: node csdn-publish.js login');
    }
    console.log('✅ 已登录');

    // 等待编辑器加载
    await page.waitForTimeout(2000);

    // ===== 填标题 =====
    console.log('✍️ 填写标题...');
    // 尝试多种选择器定位标题输入框
    const titleSelectors = [
      'input[placeholder*="标题"]',
      '.title-input input',
      '#articleTitle',
      'input.article-title',
      '.editor-title input'
    ];
    let titleInput = null;
    for (const sel of titleSelectors) {
      try {
        titleInput = await page.waitForSelector(sel, { timeout: 3000 });
        if (titleInput) break;
      } catch {}
    }
    if (!titleInput) {
      // 兜底：用 page.click + keyboard
      await page.click('body');
      await page.keyboard.press('Control+a');
      await page.keyboard.type(title);
    } else {
      await titleInput.fill(title);
    }

    // ===== 填内容（切换到 Markdown 编辑模式）=====
    console.log('📝 填入 Markdown 内容...');

    // 找 Markdown 切换按钮（如果有"富文本"/"Markdown"切换）
    const mdToggleSelectors = [
      'text=Markdown',
      'button:has-text("Markdown")',
      '[data-type="markdown"]',
      '.md-mode-btn'
    ];

    for (const sel of mdToggleSelectors) {
      try {
        const btn = await page.waitForSelector(sel, { timeout: 2000 });
        if (btn) {
          await btn.click();
          console.log('✅ 已切换到 Markdown 编辑模式');
          break;
        }
      } catch {}
    }

    await page.waitForTimeout(1000);

    // 找内容编辑区
    const contentSelectors = [
      '.markdown-body',
      '#content',
      '.editor-textarea',
      'textarea[placeholder*="正文"]',
      '.CodeMirror textarea',
      '.prosemirror'
    ];

    let contentArea = null;
    for (const sel of contentSelectors) {
      try {
        contentArea = await page.waitForSelector(sel, { timeout: 3000 });
        if (contentArea) break;
      } catch {}
    }

    if (contentArea) {
      await contentArea.click();
      await contentArea.fill(mdContent);
      console.log('✅ 内容已填入');
    } else {
      // 兜底：直接粘贴
      await page.click('body');
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(mdContent);
    }

    // ===== 填标签 =====
    console.log('🏷️ 设置标签...');
    const tagSelectors = [
      'input[placeholder*="标签"]',
      '.tag-input input',
      '[data-placeholder*="标签"]'
    ];

    for (const tagSel of tagSelectors) {
      try {
        const tagInput = await page.waitForSelector(tagSel, { timeout: 3000 });
        if (tagInput) {
          for (const tag of tags.slice(0, 5)) {
            await tagInput.fill(tag);
            await page.waitForTimeout(300);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(200);
          }
          console.log(`✅ 标签已设置: ${tags.slice(0, 5).join(', ')}`);
          break;
        }
      } catch {}
    }

    // ===== 发布 =====
    console.log('🚀 准备发布...');

    // 找发布按钮
    const publishSelectors = [
      'button:has-text("发布")',
      '.publish-btn',
      '[class*="publish"]',
      'button.primary'
    ];

    for (const sel of publishSelectors) {
      try {
        const btn = await page.waitForSelector(sel, { timeout: 3000 });
        if (btn) {
          const btnText = await btn.textContent();
          // 点确认发布
          await btn.click();
          await page.waitForTimeout(3000);

          // 处理可能的二次确认
          const confirmBtn = await page.$('button:has-text("确定")');
          if (confirmBtn) await confirmBtn.click();

          console.log('✅ 发布成功！');
          break;
        }
      } catch {}
    }

    // 获取最终 URL
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    if (finalUrl.includes('article/details')) {
      console.log(`🔗 文章地址: ${finalUrl}`);
    }

  } catch (err) {
    await browser.close();
    throw err;
  }

  await browser.close();
  console.log('✅ CSDN 发布流程完成！');
}

// ==================== 工具函数 ====================

function extractTitle(mdContent, forceTitle) {
  if (forceTitle) return forceTitle;

  // 尝试从 front matter 提取 title
  const fmMatch = mdContent.match(/^title:\s*(.+)$/m);
  if (fmMatch) return fmMatch[1].trim();

  // 尝试从第一行 # 标题提取
  const h1Match = mdContent.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  // 尝试从文件名提取
  return '';
}

// ==================== CLI 入口 ====================

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'login') {
    await login();
  } else if (cmd === 'publish') {
    const mdFile = args[1];
    if (!mdFile) {
      console.error('用法: node csdn-publish.js publish <md文件路径>');
      process.exit(1);
    }

    // 解析可选参数
    const options = {};
    const remaining = args.slice(2);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] === '--title' && remaining[i + 1]) {
        options.title = remaining[i + 1];
        i++;
      }
      if (remaining[i] === '--tags' && remaining[i + 1]) {
        options.tags = remaining[i + 1].split(',');
        i++;
      }
    }

    try {
      await publishArticle(mdFile, options);
    } catch (err) {
      console.error(`\n❌ 发布失败: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(`
🤖 CSDN 自动发布工具

用法:
  node csdn-publish.js login                   # 登录（首次使用执行一次）
  node csdn-publish.js publish <md文件>         # 发布文章
  node csdn-publish.js publish <md文件> --title "自定义标题"
  node csdn-publish.js publish <md文件> --tags "AI,大模型,LLM"

首次使用:
  1. 运行: node csdn-publish.js login
  2. 在浏览器中扫码登录 CSDN
  3. 登录成功后 Cookie 自动保存
  4. 之后就可以用 publish 命令发布了
    `);
  }
}

main();
