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
  console.log('🔐 开始 CSDN 登录流程...\n');
  console.log('📝 步骤：');
  console.log('   1. 浏览器会打开 CSDN 编辑器页面');
  console.log('   2. 如果跳转到登录页，请扫码登录');
  console.log('   3. 登录成功后手动关闭浏览器窗口\n');

  const config = loadConfig();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 访问 CSDN 编辑器
  await page.goto('https://editor.csdn.net/md/?not_checkout=1', { waitUntil: 'networkidle' });

  // 等待用户手动登录并关闭浏览器
  // 检测页面 URL：登录后 URL 会变成 mp.csdn.net/edit
  console.log('⏳ 等待登录中...（登录后请关闭浏览器窗口）');

  let attempts = 0;
  while (attempts < 60) {
    const url = page.url();
    if (url.includes('editor.csdn.net/md') && !url.includes('passport') && !url.includes('login')) {
      // 已到达编辑器页，认为登录成功
      break;
    }
    await page.waitForTimeout(2000);
    attempts++;
    if (attempts % 15 === 0) {
      console.log(`   ⏳ 等待中...（${attempts * 2}秒）若已登录可直接关闭浏览器`);
    }
  }

  // 保存 Cookie
  const cookies = await context.cookies();
  if (cookies.length === 0) {
    console.log('⚠️ 未检测到 Cookie，请确认是否成功登录');
  }
  config.cookies = cookies;
  config.username = cookies.find(c => c.name === 'UserName')?.value ||
                    cookies.find(c => c.name === 'UN')?.value || '';
  config.loginTime = new Date().toISOString();
  saveConfig(config);

  await browser.close();
  console.log(`\n✅ Cookie 已保存！用户: ${config.username || '未知'}`);
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
    await page.goto('https://editor.csdn.net/md/?not_checkout=1', { waitUntil: 'networkidle', timeout: 30000 });

    // 检测是否真的登录了（页面 URL 或元素判断）
    const currentUrl = page.url();
    if (currentUrl.includes('passport') || currentUrl.includes('login')) {
      throw new Error('Cookie 已过期，请重新登录: node csdn-publish.js login');
    }
    console.log('✅ 已登录');

    // 等待编辑器加载
    await page.waitForTimeout(2000);

    // ===== 填标题 =====
    console.log('✍️ 填写标题...');
    const titleInput = await page.waitForSelector(
      'input.article-bar__title, input[placeholder*="标题"]',
      { timeout: 10000 }
    );
    await titleInput.fill('');
    await titleInput.fill(title);
    console.log('✅ 标题已填入');

    // ===== 填内容（Markdown 模式，contenteditable PRE） =====
    console.log('📝 填入 Markdown 内容...');

    // 找到 Markdown 编辑区
    const editorEl = await page.waitForSelector(
      'PRE.editor__inner.markdown-highlighting',
      { timeout: 10000 }
    );

    // 清空现有内容
    await editorEl.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(300);

    // 用 CodeMirror 自己的 setValue 方法（最可靠的方案）
    const setResult = await page.evaluate((md) => {
      const pre = document.querySelector('PRE.editor__inner.markdown-highlighting');
      if (!pre) return 'PRE not found';

      // 尝试找 CodeMirror 实例
      // CodeMirror 通常把自己的实例绑定在父元素或作为属性上
      let cm = null;
      const parent = pre.parentElement;
      if (parent) {
        cm = parent.cm || parent.CodeMirror;
        const grandparent = parent.parentElement;
        if (grandparent && !cm) {
          cm = grandparent.cm || grandparent.CodeMirror;
        }
      }

      if (cm && typeof cm.setValue === 'function') {
        cm.setValue(md);
        cm.refresh();
        return 'CodeMirror setValue ok';
      }

      // 尝试用 CodeMirror 的静态方法
      const allEditors = window.CodeMirror?.my || window.CodeMirror?.editors;
      if (allEditors && allEditors.length > 0) {
        allEditors[0].setValue(md);
        return 'CodeMirror.editors ok';
      }

      return 'CodeMirror not found, fallback to innerText';
    }, mdContent);

    console.log('填入方式:', setResult);
    await page.waitForTimeout(2000);

    // 如果 CodeMirror 方式失败，使用 innerText + 事件触发
    if (setResult.includes('fallback')) {
      console.log('⚠️ 使用 fallback 填入...');
      await page.evaluate((md) => {
        const pre = document.querySelector('PRE.editor__inner.markdown-highlighting');
        if (pre) {
          // 清空内容
          pre.innerHTML = '';
          // 插入纯文本（保持 Markdown 原文）
          const textNode = document.createTextNode(md);
          pre.appendChild(textNode);
          // 触发更新事件
          for (const ev of ['input', 'change', 'blur', 'keyup']) {
            pre.dispatchEvent(new Event(ev, { bubbles: true, cancelable: true }));
          }
        }
      }, mdContent);
      await page.waitForTimeout(2000);
    }

    const editorText = await page.evaluate(() => {
      const pre = document.querySelector('PRE.editor__inner.markdown-highlighting');
      return pre?.innerText?.substring(0, 100) || '';
    });
    console.log('编辑器内容预览:', editorText.substring(0, 80) + '...');
    console.log('✅ 内容已填入');

    // ===== 填标签（找标签输入框）=====
    console.log('🏷️ 设置标签...');
    try {
      // CSDN 标签输入框在右侧栏，可能需要滚动或等待
      const tagInput = await page.waitForSelector(
        'input[placeholder*="标签"],.tag-input input,.article-tag input',
        { timeout: 5000 }
      );
      if (tagInput) {
        for (const tag of tags.slice(0, 5)) {
          await tagInput.fill(tag);
          await page.waitForTimeout(300);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(200);
        }
        console.log(`✅ 标签已设置: ${tags.slice(0, 5).join(', ')}`);
      }
    } catch {
      console.log('⚠️ 标签输入框未找到（可能需要手动设置）');
    }

    // ===== 保存草稿 =====
    console.log('💾 保存草稿...');
    try {
      const saveBtn = await page.waitForSelector(
        'button:has-text("保存草稿"), button.btn-save',
        { timeout: 5000 }
      );
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ 草稿已保存');
    } catch {
      console.log('⚠️ 保存草稿失败（继续尝试发布）');
    }

    // ===== 发布 =====
    console.log('🚀 发布文章...');
    try {
      const publishBtn = await page.waitForSelector(
        'button.btn-publish, button:has-text("发布文章")',
        { timeout: 5000 }
      );
      await publishBtn.click();
      await page.waitForTimeout(3000);

      // 处理可能的"我知道了"弹窗
      try {
        const okBtn = await page.waitForSelector('button:has-text("我知道了")', { timeout: 3000 });
        if (okBtn) await okBtn.click();
      } catch {}

      console.log('✅ 发布成功！');
    } catch (e) {
      console.log('⚠️ 发布按钮点击失败:', e.message);
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
