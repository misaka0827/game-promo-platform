/**
 * Cloudflare Pages Function — /api/db
 * KV binding: GAME_PROMO_DB
 * 截图独立存储到 KV screenshot_{id}，不混入主库
 * 每次写入后自动备份到 GitHub Gist
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
};

const AUTH_TOKEN = 'xhs-game-promo-2026';
const GITHUB_REPO = 'misaka0827/game-promo-platform';
const BACKUP_PATH = 'backup/db_latest.json';

/** 异步备份到 GitHub 仓库（不阻塞主流程） */
async function backupToGist(db) {
  try {
    const now = new Date().toISOString();
    const accountsClean = (db.accounts || []).map(({ screenshot, ...rest }) => rest);
    const backupData = {
      backup_time: now,
      kv_version: db._version,
      tasks: db.tasks || [],
      signups: db.signups || [],
      contents: db.contents || [],
      cdkPools: db.cdkPools || {},
      accounts: accountsClean,
    };
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(backupData, null, 2))));

    // 先获取文件的 SHA（更新文件需要）
    let sha = '';
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_PATH}`, {
      headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'User-Agent': 'game-promo-backup' }
    });
    if (getRes.ok) {
      const info = await getRes.json();
      sha = info.sha || '';
    }

    await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${BACKUP_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'game-promo-backup'
      },
      body: JSON.stringify({
        message: `backup v${db._version} ${now}`,
        content,
        ...(sha ? { sha } : {})
      })
    });
  } catch (e) {
    console.warn('GitHub 备份失败:', e.message);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // GET — 读取截图 或 读取数据库
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const screenshotKey = url.searchParams.get('screenshotKey');
    // 读取截图（独立 KV key）
    if (screenshotKey) {
      const img = await env.GAME_PROMO_DB.get(screenshotKey);
      if (!img) return new Response('Not found', { status: 404, headers: CORS_HEADERS });
      return new Response(img, { headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' } });
    }
    // 读取主数据库
    const data = await env.GAME_PROMO_DB.get('db');
    if (!data) {
      return new Response(
        JSON.stringify({ tasks:[], signups:[], contents:[], cdkPools:{}, pendingActions:[], accounts:[], _version:0 }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(data, { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }

  // PATCH — 安全追加单个账号（截图独立存储）
  if (request.method === 'PATCH') {
    const token = request.headers.get('X-Auth-Token');
    if (token !== AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    let account;
    try { account = await request.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    const raw = await env.GAME_PROMO_DB.get('db');
    const db = raw ? JSON.parse(raw) : { tasks:[], signups:[], contents:[], cdkPools:{}, pendingActions:[], accounts:[], _version:0 };
    if (!Array.isArray(db.accounts)) db.accounts = [];

    // 如果带 _update:true，则更新已有账号字段（用于个人中心保存截图等）
    if (account._update) {
      const existing = db.accounts.find(a => a.username === account.username);
      if (!existing) {
        return new Response(JSON.stringify({ error: 'ACCOUNT_NOT_FOUND' }), {
          status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
      const { _update, ...fields } = account;
      Object.assign(existing, fields);
      db._version = (db._version || 0) + 1;
      await env.GAME_PROMO_DB.put('db', JSON.stringify(db));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 新注册：必须有 id
    if (!account.id || !account.username) {
      return new Response(JSON.stringify({ error: 'Missing id or username' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 用户名唯一性
    if (db.accounts.find(a => a.username === account.username)) {
      return new Response(JSON.stringify({ error: 'USERNAME_EXISTS' }), {
        status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    // UID 唯一性（防仿冒）
    if (account.uid && db.accounts.find(a => a.uid && a.uid === account.uid && a.passwordHash)) {
      return new Response(JSON.stringify({ error: 'UID_EXISTS' }), {
        status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 截图单独存到独立 KV key，主库只存引用
    if (account.screenshot) {
      const screenshotKey = `screenshot_${account.id}`;
      await env.GAME_PROMO_DB.put(screenshotKey, account.screenshot);
      account.screenshotKey = screenshotKey;
      delete account.screenshot;
    }

    db.accounts.push(account);
    db._version = (db._version || 0) + 1;
    await env.GAME_PROMO_DB.put('db', JSON.stringify(db));

    // 异步备份，不阻塞注册响应
    context.waitUntil(backupToGist(db));

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // POST — 兼容旧逻辑 / clean 操作
  if (request.method === 'POST') {
    const token = request.headers.get('X-Auth-Token');
    if (token !== AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    const url = new URL(request.url);
    if (url.searchParams.get('action') === 'clean') {
      const raw = await env.GAME_PROMO_DB.get('db');
      const db = raw ? JSON.parse(raw) : {};
      let cleaned = 0;
      (db.contents || []).forEach(c => {
        if (c.liveshotBase64) { c.liveshotUrl = c.liveshotUrl || ''; delete c.liveshotBase64; cleaned++; }
        if (c.datashotBase64) { c.datashotUrl = c.datashotUrl || ''; delete c.datashotBase64; cleaned++; }
      });
      await env.GAME_PROMO_DB.put('db', JSON.stringify(db));
      return new Response(JSON.stringify({ success: true, cleanedFields: cleaned }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    // signup_check — 校验账号是否可以报名（不需要 auth token）
    if (url.searchParams.get('action') === 'signup_check') {
      let body;
      try { body = await request.json(); } catch {
        return new Response(JSON.stringify({ allowed: false, reason: '参数错误' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
      const { username } = body;
      if (!username) return new Response(JSON.stringify({ allowed: false, reason: '未登录' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
      const raw = await env.GAME_PROMO_DB.get('db');
      const db = raw ? JSON.parse(raw) : {};
      const account = (db.accounts || []).find(a => a.username === username);
      if (!account) return new Response(JSON.stringify({ allowed: false, reason: '账号不存在，请先注册' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const body = await request.text();
    try { JSON.parse(body); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    await env.GAME_PROMO_DB.put('db', body);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // PUT — 写入数据库（accounts 合并保护 + 自动备份）
  if (request.method === 'PUT') {
    const token = request.headers.get('X-Auth-Token');
    if (token !== AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    let incoming;
    try { incoming = JSON.parse(await request.text()); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 合并 accounts：有密码的账号不被旧缓存覆盖
    const raw = await env.GAME_PROMO_DB.get('db');
    if (raw) {
      try {
        const existing = JSON.parse(raw);
        const existingAccounts = Array.isArray(existing.accounts) ? existing.accounts : [];
        const incomingAccounts = Array.isArray(incoming.accounts) ? incoming.accounts : [];
        const accountMap = new Map();
        for (const a of existingAccounts) { if (a.username) accountMap.set(a.username, a); }
        for (const a of incomingAccounts) {
          if (!a.username) continue;
          const cur = accountMap.get(a.username);
          if (!cur || (!cur.passwordHash && a.passwordHash)) accountMap.set(a.username, a);
        }
        incoming.accounts = Array.from(accountMap.values());
      } catch (_) {}
    }

    // 防止截图 base64 混入主库
    incoming.accounts = (incoming.accounts || []).map(a => {
      if (a.screenshot) {
        const { screenshot, ...rest } = a;
        return rest;
      }
      return a;
    });

    await env.GAME_PROMO_DB.put('db', JSON.stringify(incoming));

    // 每 10 个版本备份一次，避免频繁调用 Gist API
    if ((incoming._version || 0) % 10 === 0) {
      context.waitUntil(backupToGist(incoming));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Not found', { status: 404, headers: CORS_HEADERS });
}
