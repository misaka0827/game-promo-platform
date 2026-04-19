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
