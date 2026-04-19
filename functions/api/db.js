/**
 * Cloudflare Pages Function — /api/db
 * 替代原 workers.dev Worker，走 pages.dev 域名，国内直连。
 * KV binding: GAME_PROMO_DB (id: 81370c22ec4b4e56b57d92f89eeae1f5)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
};

const AUTH_TOKEN = 'xhs-game-promo-2026';

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // GET — 读取数据库
  if (request.method === 'GET') {
    const data = await env.GAME_PROMO_DB.get('db');
    if (!data) {
      return new Response(
        JSON.stringify({ tasks: [], signups: [], contents: [], cdkPools: {}, pendingActions: [], _version: 0 }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(data, {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // POST /api/db?action=clean — 清理 contents 中的 base64 字段（一次性操作）
  if (request.method === 'POST') {
    const token = request.headers.get('X-Auth-Token');
    if (token !== AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
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
    // 普通 POST — 写入数据库（兼容旧逻辑）
    const body = await request.text();
    try { JSON.parse(body); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    await env.GAME_PROMO_DB.put('db', body);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // PUT — 写入数据库
  if (request.method === 'PUT') {
    const token = request.headers.get('X-Auth-Token');
    if (token !== AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    const body = await request.text();
    try { JSON.parse(body); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    await env.GAME_PROMO_DB.put('db', body);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Not found', { status: 404, headers: CORS_HEADERS });
}
