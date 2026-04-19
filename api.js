/**
 * api.js — 云端数据层（Cloudflare Pages Function）
 * 接口走 /api/db（同域，pages.dev），国内直连，数据存 KV 无限量。
 */

(function () {
  const API_URL    = '/api/db';
  const AUTH_TOKEN = 'xhs-game-promo-2026';

  // 公开缓存
  window.cachedDB = {
    tasks: [], signups: [], contents: [],
    cdkPools: {}, pendingActions: []
  };

  let _lastVersion = -1;
  let _syncTimer   = null;

  function _normalize(db) {
    return {
      tasks:          Array.isArray(db.tasks)          ? db.tasks          : [],
      signups:        Array.isArray(db.signups)        ? db.signups        : [],
      contents:       Array.isArray(db.contents)       ? db.contents       : [],
      cdkPools:       (db.cdkPools && typeof db.cdkPools === 'object') ? db.cdkPools : {},
      pendingActions: Array.isArray(db.pendingActions)  ? db.pendingActions  : [],
    };
  }

  /** 读取数据库 */
  window.loadDB = async function () {
    try {
      const res = await fetch(API_URL + '?t=' + Date.now());
      if (!res.ok) throw new Error('API ' + res.status);
      const db = await res.json();
      _lastVersion = db._version || 0;
      window.cachedDB = _normalize(db);
      return window.cachedDB;
    } catch (e) {
      console.warn('[api.js] loadDB 失败，使用缓存:', e);
      return window.cachedDB;
    }
  };

  /** 写入数据库 */
  window.saveDB = async function (db) {
    try {
      const current = await window.loadDB();
      const newVersion = (current._version || _lastVersion || 0) + 1;
      const toSave = Object.assign({}, db, { _version: newVersion });

      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': AUTH_TOKEN
        },
        body: JSON.stringify(toSave)
      });
      if (!res.ok) throw new Error('API PUT ' + res.status);
      _lastVersion = newVersion;
      window.cachedDB = _normalize(toSave);
      return window.cachedDB;
    } catch (e) {
      console.warn('[api.js] saveDB 失败，仍更新本地缓存:', e);
      window.cachedDB = _normalize(db);
      return window.cachedDB;
    }
  };

  /** 每 5 秒轮询版本号，有变化时重新拉取并调用 callback(db) */
  window.startSync = function (callback) {
    window.stopSync();
    _syncTimer = setInterval(async () => {
      try {
        const res     = await fetch(API_URL + '?t=' + Date.now());
        if (!res.ok) return;
        const db      = await res.json();
        const version = db._version || 0;
        if (_lastVersion === -1) { _lastVersion = version; return; }
        if (version !== _lastVersion) {
          _lastVersion = version;
          window.cachedDB = _normalize(db);
          if (typeof callback === 'function') callback(window.cachedDB);
        }
      } catch (e) {
        console.warn('[api.js] sync 轮询失败:', e);
      }
    }, 5000);
  };

  window.stopSync = function () {
    if (_syncTimer !== null) { clearInterval(_syncTimer); _syncTimer = null; }
  };

  // 页面加载时立即预热
  window.loadDB().catch(() => {});
})();
