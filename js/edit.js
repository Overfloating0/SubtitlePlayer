(function() {
  window.DP = window.DP || {};
  const DP = window.DP;

  // ==================== 撤销支持 ====================

  DP.pushUndo = function pushUndo() {
    DP.editUndoStack.push(DP.subtitles.map(s => ({ start: s.start, end: s.end, text: s.text })));
    if (DP.editUndoStack.length > 20) DP.editUndoStack.shift();
    DP.editRedoStack = []; // 新操作清空重做栈
  };

  // ==================== 核心函数 ====================

  DP.generateSRT = function generateSRT() {
    let srt = '';
    DP.subtitles.forEach((sub, i) => {
      const startH = new Date(sub.start * 1000).toISOString().slice(11, 23).replace('.', ',');
      const endH   = new Date(sub.end * 1000).toISOString().slice(11, 23).replace('.', ',');
      srt += `${i + 1}\n${startH} --> ${endH}\n${sub.text}\n\n`;
    });
    return srt;
  };

  DP.restoreSubtitlesFromSnapshot = function restoreSubtitlesFromSnapshot(snapshot) {
    DP.subtitles = snapshot.map((s, i) => ({
      id: i, start: s.start, end: s.end, text: s.text, element: null
    }));
    DP.rebuildTranscript();
    DP.rebuildTimelineMarkers();
    DP.updateSubCount();
    DP.editDirty = true;
    DP.saveSubtitlesToStorage();
  };

  // ==================== 事件处理器 ====================

  // 编辑模式开关
  DP.btnEdit.addEventListener('click', () => {
    if (!DP.video.src) { DP.showToast('⚠ 请先上传视频'); return; }
    DP.editMode = !DP.editMode;
    DP.btnEdit.textContent = DP.editMode ? '✏️ 编辑中' : '✏️ 编辑';
    DP.btnEdit.style.opacity = DP.editMode ? '1' : '';
    DP.editToolbar.classList.toggle('visible', DP.editMode);
    if (!DP.editMode) { DP.deselectSub(); DP.editDirty = false; DP.editUndoStack = []; DP.editRedoStack = []; }
    // 如果没字幕，初始化空列表
    if (DP.editMode && DP.subtitles.length === 0) {
      DP.subtitles = [];
      DP.rebuildTranscript();
      DP.updateSubCount();
    }
  });

  // 新建字幕
  DP.btnEditNew.addEventListener('click', () => {
    if (!DP.editMode) return;
    DP.pushUndo();
    const t = DP.video.currentTime || 0;
    const end = Math.min(t + 3, DP.video.duration || (t + 3));
    const newSub = { start: t, end: end, text: '[新字幕]', element: null };
    // 按时间顺序插入
    let insIdx = DP.subtitles.length;
    for (let i = 0; i < DP.subtitles.length; i++) {
      if (DP.subtitles[i].start > t) { insIdx = i; break; }
    }
    DP.subtitles.splice(insIdx, 0, newSub);
    // 重新分配 id
    DP.subtitles.forEach((s, i) => { s.id = i; });
    DP.rebuildTranscript();
    DP.rebuildTimelineMarkers();
    DP.updateSubCount();
    DP.editDirty = true;
    // 自动选中并进入编辑
    DP.selectSub(insIdx);
    const textEl = newSub.element?.querySelector('.sub-text');
    if (textEl) {
      DP.pushUndo(); // 保存带默认文本的状态，方便撤销文字修改
      textEl.contentEditable = 'true';
      textEl.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(textEl);
      sel.addRange(range);
    }
    DP.showToast(`➕ 已在 ${DP.formatTime(t)} 新建字幕`);
  });

  // 撤销
  DP.btnEditUndo.addEventListener('click', () => {
    if (!DP.editMode || DP.editUndoStack.length === 0) { DP.showToast('⚠ 没有可撤销的操作'); return; }
    DP.deselectSub();
    // 当前状态推入重做栈
    DP.editRedoStack.push(DP.subtitles.map(s => ({ start: s.start, end: s.end, text: s.text })));
    DP.restoreSubtitlesFromSnapshot(DP.editUndoStack.pop());
    DP.showToast(`↩ 已撤销（剩余 ${DP.editUndoStack.length} 步）`);
  });

  // 重做
  DP.btnEditRedo.addEventListener('click', () => {
    if (!DP.editMode || DP.editRedoStack.length === 0) { DP.showToast('⚠ 没有可重做的操作'); return; }
    DP.deselectSub();
    // 当前状态推入撤销栈
    DP.editUndoStack.push(DP.subtitles.map(s => ({ start: s.start, end: s.end, text: s.text })));
    DP.restoreSubtitlesFromSnapshot(DP.editRedoStack.pop());
    DP.showToast(`↪ 已重做（剩余 ${DP.editRedoStack.length} 步）`);
  });

  // 保存到文件
  DP.btnEditSave.addEventListener('click', async () => {
    if (!DP.editMode) return;
    // 提交所有正在编辑的文本
    document.querySelectorAll('.sub-text[contenteditable="true"]').forEach(el => {
      el.contentEditable = 'false';
      const idx = parseInt(el.closest('.sub-entry')?.dataset.subIdx);
      if (idx >= 0 && idx < DP.subtitles.length) {
        const newText = el.textContent.trim();
        if (newText && newText !== DP.subtitles[idx].text) {
          DP.subtitles[idx].text = newText;
        }
      }
    });
    DP.saveSubtitlesToStorage();
    DP.editDirty = false;

    // 保存：统一用 showSaveFilePicker，稳定无 .crswap
    async function doSaveToFile() {
      if (DP.subFileHandle) {
        const name = (await DP.subFileHandle.getFile()).name;
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: '字幕文件', accept: { 'text/plain': ['.srt'] } }],
          startIn: DP.subFileHandle,
        });
        DP.subFileHandle = handle;
      } else if (DP.currentVideoName) {
        const name = DP.currentVideoName.replace(/\.[^.]+$/, '') + '.srt';
        DP.subFileHandle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: '字幕文件', accept: { 'text/plain': ['.srt'] } }],
          startIn: DP.lastVideoHandle || 'videos',
        });
      } else {
        return false;
      }
      const writable = await DP.subFileHandle.createWritable();
      try { await writable.write(DP.generateSRT()); } finally { await writable.close(); }
      DP.saveSubHandle(DP.subFileHandle);
      return true;
    }

    try {
      const ok = await doSaveToFile();
      if (ok) {
        DP.showToast('💾 已保存到文件');
      } else {
        DP.showToast('💾 已保存到浏览器（需导出到文件）');
      }
    } catch(e) {
      if (e.name === 'AbortError') { DP.showToast('⚠ 已取消保存'); return; }
      DP.showToast('💾 已保存到浏览器（需导出到文件）');
    }
  });

  // 导出为 .srt 文件（浏览器下载）
  DP.btnEditExport.addEventListener('click', () => {
    if (DP.subtitles.length === 0) { DP.showToast('⚠ 没有字幕可导出'); return; }
    const srt = DP.generateSRT();
    const name = (DP.currentVideoName || 'subtitles').replace(/\.[^.]+$/, '') + '.srt';
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    DP.showToast(`📥 已导出 ${name}`);
  });

})();
