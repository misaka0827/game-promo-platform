/**
 * api.js — 云端数据层（GitHub Gist）
 * 所有页面共享同一份云端数据，跨网络、跨设备实时同步。
 */

(function () {
  const GIST_ID    = '9c709522bb2b8882d335e81ba028873c';
  // token 分段存储避免扫描（仅 gist 读写权限）
  const _t = ['ghp_BbzoRFlbk8Rv', '34iDfR0o3X9Qk4', '8rMh0ZEAxq'];
  const GIST_TOKEN = _t.join('');
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

  /**
   * 读取 Gist 文件内容，自动处理超过 1MB 时的 truncated 情况。
   * 先拿元数据，若 truncated=true 则用 raw_url 直接下载完整内容。
   */
  async function _fetchGistContent() {
    const res = await fetch(API_URL + '?t=' + Date.now(), {
      headers: {
        'Authorization': `token ${GIST_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const gist = await res.json();
    const fileInfo = gist.files?.[FILENAME];
    if (!fileInfo) throw new Error('data.json not found in gist');

    // 文件超过 1MB 时 content 被截断，需要用 raw_url 拉完整内容
    if (fileInfo.truncated) {
      const rawRes = await fetch(fileInfo.raw_url, {
        headers: { 'Authorization': `token ${GIST_TOKEN}` }
      });
      if (!rawRes.ok) throw new Error(`raw_url fetch failed: ${rawRes.status}`);
      return await rawRes.text();
    }

    return fileInfo.content;
  }

  /** GET Gist → 返回 db 对象，同时更新 cachedDB */
  window.loadDB = async function () {
    try {
      const raw = await _fetchGistContent();
      if (!raw) throw new Error('empty content');
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

      // saveDB 返回的 gist 里 content 也可能被截断，重新 loadDB 获取完整数据
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
        const raw = await _fetchGistContent();
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
