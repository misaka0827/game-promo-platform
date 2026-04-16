/**
 * api.js — 云端数据层（GitHub Gist）
 * 所有页面共享同一份云端数据，跨网络、跨设备实时同步。
 */

(function () {
  const GIST_ID    = '9c709522bb2b8882d335e81ba028873c';
  const GIST_TOKEN = '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';
  const FILENAME   = 'data.json';
  const API_URL    = `https://api.github.com/gists/${GIST_ID}`;

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

  /** GET Gist → 返回 db 对象，同时更新 cachedDB */
  window.loadDB = async function () {
    try {
      const res = await fetch(API_URL + '?t=' + Date.now(), {
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const gist = await res.json();
      const raw  = gist.files?.[FILENAME]?.content;
      if (!raw) throw new Error('data.json not found in gist');
      const db = JSON.parse(raw);
      _lastVersion = db._version || 0;
      window.cachedDB = _normalize(db);
      return window.cachedDB;
    } catch (e) {
      console.warn('[api.js] loadDB 失败，使用缓存:', e);
      return window.cachedDB;
    }
  };

  /** PATCH Gist → 保存并返回最新 db */
  window.saveDB = async function (db) {
    try {
      const current = await window.loadDB();
      // 版本号递增（防止并发冲突）
      const newVersion = (current._version || _lastVersion || 0) + 1;
      const toSave = Object.assign({}, db, { _version: newVersion });

      const res = await fetch(API_URL, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GIST_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [FILENAME]: { content: JSON.stringify(toSave, null, 2) }
          }
        })
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const gist = await res.json();
      const raw  = gist.files?.[FILENAME]?.content;
      const saved = raw ? JSON.parse(raw) : toSave;
      _lastVersion = saved._version || newVersion;
      window.cachedDB = _normalize(saved);
      return window.cachedDB;
    } catch (e) {
      console.warn('[api.js] saveDB 失败，仍更新本地缓存:', e);
      window.cachedDB = _normalize(db);
      return window.cachedDB;
    }
  };

  /** 每 5 秒轮询版本号，有变化时重新拉取数据并调用 callback(db) */
  window.startSync = function (callback) {
    window.stopSync();
    _syncTimer = setInterval(async () => {
      try {
        const res = await fetch(API_URL + '?t=' + Date.now(), {
          headers: {
            'Authorization': `token ${GIST_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (!res.ok) return;
        const gist    = await res.json();
        const raw     = gist.files?.[FILENAME]?.content;
        if (!raw) return;
        const db      = JSON.parse(raw);
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

  // 页面加载时立即预热 cachedDB
  window.loadDB().catch(() => {});
})();
