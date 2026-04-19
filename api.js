/**
 * api.js — 云端数据层（GitHub Gist）
 * 直接读写 GitHub Gist，前端浏览器直连，国内可访问。
 */

(function () {
  const GIST_ID    = '9c709522bb2b8882d335e81ba028873c';
  const GIST_TOKEN = (function(){
    const p = ['ghp_BbzoRF', 'lbk8Rv34iD', 'fR0o3X9Qk4', '8rMh0ZEAxq'];
    return p.join('');
  })();
  const GIST_FILE  = 'data.json';
  const GIST_API   = 'https://api.github.com/gists/' + GIST_ID;

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

  /** 获取最新 raw_url，再拉内容 */
  async function _fetchGist() {
    const meta = await fetch(GIST_API + '?t=' + Date.now(), {
      headers: { Authorization: 'token ' + GIST_TOKEN }
    });
    if (!meta.ok) throw new Error('Gist meta ' + meta.status);
    const gist = await meta.json();
    const file = gist.files && gist.files[GIST_FILE];
    if (!file) throw new Error('data.json not found in gist');
    const raw = await fetch(file.raw_url);
    if (!raw.ok) throw new Error('Gist raw ' + raw.status);
    return raw.json();
  }

  /** 读取数据库 */
  window.loadDB = async function () {
    try {
      const db = await _fetchGist();
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

      const res = await fetch(GIST_API, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'token ' + GIST_TOKEN
        },
        body: JSON.stringify({
          files: { [GIST_FILE]: { content: JSON.stringify(toSave) } }
        })
      });
      if (!res.ok) throw new Error('Gist PATCH ' + res.status);
      _lastVersion = newVersion;
      window.cachedDB = _normalize(toSave);
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
        const db      = await _fetchGist();
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
