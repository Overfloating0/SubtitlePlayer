window.DP = window.DP || {};

// 视频注册表：记录每个视频最后活跃时间，用于过期清理
DP.touchVideo = function(videoName) {
  if (!videoName) return;
  try {
    let reg = {};
    const raw = localStorage.getItem('dp_video_registry');
    if (raw) reg = JSON.parse(raw);
    reg[videoName] = Date.now();
    localStorage.setItem('dp_video_registry', JSON.stringify(reg));
  } catch(e) {}
};

// 清理过期数据（session 7 天，视频 30 天）
DP.collectGarbage = function() {
  try {
    const now = Date.now();
    let deleted = 0;

    // --- session 清理（7 天，最多 20 个） ---
    let sReg = {};
    try { const raw = localStorage.getItem('dp_session_registry'); if (raw) sReg = JSON.parse(raw); } catch(e) {}
    sReg[DP.sessionId] = now;
    const sEntries = Object.keys(sReg).map(function(k) { return { id: k, time: sReg[k] }; })
      .sort(function(a, b) { return b.time - a.time; });
    const sKeep = {};
    for (let i = 0; i < sEntries.length; i++) {
      if (i >= 20 || (now - sEntries[i].time > 7 * 24 * 3600 * 1000 && sEntries[i].id !== DP.sessionId)) {
        const prefix = 'dp_' + sEntries[i].id + '_';
        const keys = Object.keys(localStorage);
        for (let j = 0; j < keys.length; j++) {
          if (keys[j].indexOf(prefix) === 0) { localStorage.removeItem(keys[j]); deleted++; }
        }
      } else { sKeep[sEntries[i].id] = sEntries[i].time; }
    }
    localStorage.setItem('dp_session_registry', JSON.stringify(sKeep));

    // --- 视频清理（30 天未访问 → 删除字幕和笔记） ---
    let vReg = {};
    try { const raw2 = localStorage.getItem('dp_video_registry'); if (raw2) vReg = JSON.parse(raw2); } catch(e) {}
    const vKeep = {};
    for (const vName in vReg) {
      if (now - vReg[vName] > 30 * 24 * 3600 * 1000) {
        localStorage.removeItem('dp_sub_' + vName);
        localStorage.removeItem('dp_notes_' + vName);
        localStorage.removeItem('dp_vol_' + vName);
        localStorage.removeItem('dp_pos_' + vName);
        deleted++;
      } else { vKeep[vName] = vReg[vName]; }
    }
    localStorage.setItem('dp_video_registry', JSON.stringify(vKeep));

    // --- IndexedDB 清理（删除过期 session 的句柄） ---
    DP.openIDB().then(function(db) {
      try {
        const tx = db.transaction(DP.IDB_STORE, 'readwrite');
        const store = tx.objectStore(DP.IDB_STORE);
        // 删除不在 keep 列表中的 session 句柄
        for (let i = 0; i < sEntries.length; i++) {
          if (!sKeep[sEntries[i].id]) {
            store.delete('dp_' + sEntries[i].id + '_video');
            store.delete('dp_' + sEntries[i].id + '_subtitle');
            store.delete('dp_' + sEntries[i].id + '_video_file');
            deleted++;
          }
        }
      } catch(e) {}
    }).catch(function() {});

    if (deleted > 0) console.log('🧹 已清理 ' + deleted + ' 条过期数据');
  } catch(e) { /* ignore */ }
};

DP.init = function() {
  DP.initResizeHandle();
  DP.initNotesResizeHandle();
  DP.initCCDrag();
  DP.restoreSession();
  DP.collectGarbage();

  console.log('📝 字幕播放器已就绪！');
  console.log('   快捷键: 空格=播放/暂停, ⬅➡=快退/快进5s, 长按➡=3×倍速');
  console.log('   C=开关字幕, ⬆⬇=音量');
  console.log('   支持格式: SRT, WebVTT');
  console.log('   溢浮零牢师 我还记得你');
  console.log('   搜索框里 发现我的小秘密');
};

document.addEventListener('DOMContentLoaded', DP.init);
