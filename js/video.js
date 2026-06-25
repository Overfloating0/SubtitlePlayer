window.DP = window.DP || {};

// ==================== 视频管理 ====================

DP.loadVideo = function(file) {
  const url = URL.createObjectURL(file);
  DP.video.src = url;
  DP.playerContainer.style.display = 'block';
  DP.videoPlh.style.display = 'none';
  DP.controls.style.display = 'flex';
  DP.timelineSec.style.display = 'block';
  DP.video.play().catch(() => {});
  DP.currentVideoName = file.name;
  document.title = `${file.name} - 字幕播放器`;
  console.log('🎬 已加载:', file.name);
  DP.showToast(`🎬 已加载: ${file.name}`);

  DP.touchVideo(file.name);
  // 加载该视频的字幕和笔记
  DP.loadSubtitlesForVideo(file.name);
  DP.reloadNotesForVideo();

  // 提示加载同名字幕
  DP.hintAutoSubtitle(file.name);
};

// 加载视频后，若无字幕则提示加载同名文件
DP.hintAutoSubtitle = function(videoFileName) {
  // 清除旧字幕句柄，确保字幕按钮定位到视频目录而非旧字幕目录
  DP.subFileHandle = null;

  const baseName = videoFileName.replace(/\.[^.]+$/, '');

  // 延迟提示，避免覆盖 "已加载" toast
  setTimeout(function() {
    if (window.showOpenFilePicker && DP.lastVideoHandle) {
      DP.showToast('💡 点击「📄 上传字幕」自动定位 ' + baseName + '.srt/.vtt');
    } else {
      DP.showToast('💡 可拖拽字幕文件到页面，或点击「📄 上传字幕」');
    }
  }, 600);
};

DP.setSpeed = function(speed) {
  DP.video.playbackRate = speed;
  DP.speedIndicator.textContent = speed.toFixed(1).replace(/\.0$/, '') + '×';
  DP.speedIndicator.classList.toggle('fast', speed >= 3);
};

DP.posKey = function() {
  return DP.sessionKey('pos_' + (DP.currentVideoName || '_'));
};
DP.posGlobalKey = function() {
  return 'dp_pos_' + (DP.currentVideoName || '_');
};

DP.updateCCFontSize = function() {
  DP.ccArea.style.fontSize = DP.ccFontSize + 'rem';
  try { localStorage.setItem('dp_cc_font', DP.ccFontSize); } catch(e) {}
};

DP.showFsTimeline = function() {
  DP.fsTimeline.classList.add('visible');
  clearTimeout(DP.fsHideTimer);
  DP.fsHideTimer = setTimeout(() => DP.fsTimeline.classList.remove('visible'), 3000);
};

/** 根据百分比恢复 CC 叠加位置（全屏尺寸变化后调用） */
DP.applyCCOverlayPct = function() {
  if (!DP.ccArea.classList.contains('overlay') || DP.ccOverlayTopPct === null) return;
  const playerRect = DP.playerContainer.getBoundingClientRect();
  const ccHeight = DP.ccArea.getBoundingClientRect().height;
  const maxTop = playerRect.height - ccHeight;
  const pxTop = (DP.ccOverlayTopPct / 100) * playerRect.height;
  DP.ccArea.style.top = Math.max(0, Math.min(maxTop, pxTop)) + 'px';
  DP.ccArea.style.bottom = 'auto';
};

// ==================== 事件绑定 ====================

// 打开视频
DP.btnOpenVideo.addEventListener('click', async () => {
  // 优先使用 File System Access API（支持记忆）
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: '视频文件', accept: { 'video/*': ['.mp4','.mkv','.webm','.avi','.mov','.flv','.wmv'] } }],
        multiple: false,
        startIn: DP.lastVideoHandle || 'videos',
      });
      const file = await handle.getFile();
      DP.lastVideoHandle = handle;  // 必须在 loadVideo 之前，hintAutoSubtitle 会用到
      DP.loadVideo(file);
      DP.saveVideoHandle(handle);
      DP.savedVideoHandle = null;
      DP.btnRestore.style.display = 'none';
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  DP.videoInput.click();
});

DP.videoInput.addEventListener('change', (e) => {
  if (e.target.files[0]) {
    DP.lastVideoHandle = null;  // 传统 input 无文件句柄
    DP.loadVideo(e.target.files[0]);
    DP.saveVideoFile(e.target.files[0]);  // Firefox 缓存
  }
});

// 打开网络视频 URL
DP.loadVideoFromURL = function(url) {
  DP.video.src = url;
  DP.playerContainer.style.display = 'block';
  DP.videoPlh.style.display = 'none';
  DP.controls.style.display = 'flex';
  DP.timelineSec.style.display = 'block';
  DP.video.play().catch(() => {});
  // 用 URL 路径末段或 hostname 作为视频名
  const urlName = url.split('?')[0].split('/').pop() || new URL(url).hostname;
  DP.currentVideoName = urlName;
  document.title = `${urlName} - 字幕播放器`;
  DP.lastVideoHandle = null;
  DP.savedVideoHandle = null;
  DP.btnRestore.style.display = 'none';
  DP.showToast(`🔗 已加载: ${urlName}`);
  DP.touchVideo(urlName);
  DP.loadSubtitlesForVideo(urlName);
  DP.reloadNotesForVideo();
  DP.hintAutoSubtitle(urlName);
};

DP.btnOpenURL.addEventListener('click', () => {
  const url = prompt('请输入视频直链 URL（支持 mp4/webm/m3u8 等浏览器可直接播放的格式）:');
  if (!url || !url.trim()) return;
  try { new URL(url.trim()); } catch(e) { DP.showToast('⚠ URL 格式不正确'); return; }
  DP.loadVideoFromURL(url.trim());
});

// 打开字幕
DP.btnOpenSub.addEventListener('click', async () => {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: '字幕文件', accept: { 'text/plain': ['.srt','.vtt'] } }],
        multiple: false,
        startIn: DP.subFileHandle || DP.lastVideoHandle || 'documents',
      });
      const file = await handle.getFile();
      const text = await file.text();
      DP.loadSubtitlesFromText(text, file.name);
      DP.subFileHandle = handle;
      DP.saveSubHandle(handle);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  DP.subInput.click();
});

DP.subInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  DP.subFileHandle = null;
  const reader = new FileReader();
  reader.onload = () => DP.loadSubtitlesFromText(reader.result, file.name);
  reader.readAsText(file, 'UTF-8');
});

// 拖拽（视频 + 字幕）
const videoPanel = document.getElementById('videoPanel');
videoPanel.addEventListener('dragover', (e) => { e.preventDefault(); });
videoPanel.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (file.type.startsWith('video/')) {
    DP.lastVideoHandle = null;  // 拖拽无文件句柄
    DP.loadVideo(file);
    DP.saveVideoFile(file);  // Firefox 缓存
  } else if (file.name.match(/\.(srt|vtt|txt)$/i)) {
    DP.subFileHandle = null;
    const reader = new FileReader();
    reader.onload = () => DP.loadSubtitlesFromText(reader.result, file.name);
    reader.readAsText(file, 'UTF-8');
  } else {
    DP.showToast('⚠ 不支持的文件格式');
  }
});

// 也支持拖拽到整个页面
document.addEventListener('dragover', (e) => { e.preventDefault(); });
document.addEventListener('drop', (e) => {
  if (e.target.closest('#videoPanel')) return;
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (file.name.match(/\.(srt|vtt|txt)$/i)) {
    DP.subFileHandle = null;
    const reader = new FileReader();
    reader.onload = () => DP.loadSubtitlesFromText(reader.result, file.name);
    reader.readAsText(file, 'UTF-8');
  }
});

// CC 开关
DP.btnToggleCC.addEventListener('click', () => {
  DP.ccEnabled = !DP.ccEnabled;
  DP.btnToggleCC.textContent = DP.ccEnabled ? '💬 CC' : '💬 CC 关';
  DP.btnToggleCC.style.opacity = DP.ccEnabled ? '1' : '0.5';
  if (!DP.ccEnabled) {
    DP.ccArea.style.display = 'none';
  } else {
    DP.ccArea.style.display = '';
    if (DP.currentSubIdx >= 0) {
      DP.updateCCOverlay(DP.currentSubIdx);
    }
  }
  try { localStorage.setItem('dp_cc_enabled', DP.ccEnabled ? '1' : '0'); } catch(e) {}
});

// CC 字体大小
DP.btnFontDown.addEventListener('click', () => {
  DP.ccFontSize = Math.max(0.8, DP.ccFontSize - 0.15);
  DP.updateCCFontSize();
});

DP.btnFontUp.addEventListener('click', () => {
  DP.ccFontSize = Math.min(2.5, DP.ccFontSize + 0.15);
  DP.updateCCFontSize();
});

// 清除字幕
DP.btnClearSub.addEventListener('click', () => {
  if (DP.subtitles.length === 0) { DP.showToast('⚠ 没有字幕可清除'); return; }
  if (!confirm('确定要清除当前字幕吗？此操作不可撤销。')) return;
  DP.subtitles = [];
  DP.currentSubIdx = -1;
  DP.ccText.textContent = '';
  DP.rebuildTranscript();
  DP.rebuildTimelineMarkers();
  DP.updateSubCount();
  DP.transcriptEmpty.style.display = 'block';
  localStorage.removeItem(DP.subKey());
  localStorage.removeItem(DP.subGlobalKey());
  localStorage.removeItem(DP.posKey());
  localStorage.removeItem(DP.posGlobalKey());
  DP.showToast('🗑 字幕及播放记录已清除');
});

// 播放/暂停
DP.btnPlayPause.addEventListener('click', () => {
  if (DP.video.paused) DP.video.play();
  else DP.video.pause();
});

DP.video.addEventListener('play',  () => { DP.btnPlayPause.textContent = '⏸ 暂停'; });
DP.video.addEventListener('pause', () => { DP.btnPlayPause.textContent = '▶ 播放'; });

// 速度控制
DP.btnSpeedDown.addEventListener('click', () => {
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  const current = DP.video.playbackRate;
  const lower = speeds.filter(s => s < current - 0.01);
  DP.setSpeed(lower.length > 0 ? lower[lower.length - 1] : 0.25);
});

DP.btnSpeedUp.addEventListener('click', () => {
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  const current = DP.video.playbackRate;
  const higher = speeds.filter(s => s > current + 0.01);
  DP.setSpeed(higher.length > 0 ? higher[0] : 3);
});

DP.btnSpeedReset.addEventListener('click', () => DP.setSpeed(1));

// 元数据加载
DP.video.addEventListener('loadedmetadata', () => {
  DP.durationEl.textContent = DP.formatTime(DP.video.duration);
  DP.fsDurationEl.textContent = DP.formatTime(DP.video.duration);
  DP.rebuildTimelineMarkers();

  // 恢复上次播放位置
  try {
    let savedPos = parseFloat(localStorage.getItem(DP.posKey()));
    if (!savedPos) savedPos = parseFloat(localStorage.getItem(DP.posGlobalKey()));
    if (savedPos > 1 && savedPos < DP.video.duration - 2) {
      DP.video.currentTime = savedPos;
    }
  } catch(e) {}

  // 恢复 CC 叠加状态
  try {
    if (localStorage.getItem(DP.sessionKey('cc_overlay')) === '1' && !DP.ccArea.classList.contains('overlay')) {
      DP.ccArea.style.top = '';
      DP.ccArea.style.bottom = '';
      DP.playerContainer.appendChild(DP.ccArea);
      DP.ccArea.classList.add('overlay');
      // 恢复拖拽位置百分比
      const savedPct = localStorage.getItem(DP.sessionKey('cc_overlay_pct'));
      if (savedPct !== null) {
        DP.ccOverlayTopPct = parseFloat(savedPct);
        setTimeout(() => DP.applyCCOverlayPct(), 100);
      }
    }
  } catch(e) {}
});

// 时间更新
DP.lastPosSave = 0;
DP.video.addEventListener('timeupdate', () => {
  if (!DP.video.duration || !isFinite(DP.video.duration)) return;
  const pct = (DP.video.currentTime / DP.video.duration) * 100;
  DP.timelineProg.style.width = pct + '%';
  DP.fsBarFill.style.width = pct + '%';
  DP.currentTimeEl.textContent = DP.formatTime(DP.video.currentTime);
  DP.fsCurrentTimeEl.textContent = DP.formatTime(DP.video.currentTime);

  // 每 5 秒存一次播放位置
  if (Math.abs(DP.video.currentTime - DP.lastPosSave) > 5) {
    try { localStorage.setItem(DP.posKey(), DP.video.currentTime); localStorage.setItem(DP.posGlobalKey(), DP.video.currentTime); } catch(e) {}
    DP.lastPosSave = DP.video.currentTime;
  }

  // 更新当前字幕高亮
  if (DP.subtitles.length > 0) {
    DP.highlightCurrentSubtitle(DP.video.currentTime);
  }
});

// 页面关闭 / 刷新前保存位置
window.addEventListener('beforeunload', () => {
  try {
    if (DP.video.duration && isFinite(DP.video.duration) && DP.video.currentTime > 1 && DP.currentVideoName) {
      localStorage.setItem(DP.posKey(), DP.video.currentTime);
      localStorage.setItem(DP.posGlobalKey(), DP.video.currentTime);
    }
  } catch(e) {}
});

// 时间轴拖拽 / 点击
DP.timelineTrack.addEventListener('mousedown', (e) => {
  if (!DP.video.duration || !isFinite(DP.video.duration)) return;
  const rect = DP.timelineTrack.getBoundingClientRect();
  const seek = (ex) => {
    const ratio = Math.max(0, Math.min(1, (ex - rect.left) / rect.width));
    DP.video.currentTime = ratio * DP.video.duration;
  };
  seek(e.clientX);
  function onMove(ev) { seek(ev.clientX); }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

// 单击视频 → 进入全屏
DP.playerContainer.addEventListener('click', (e) => {
  if (document.fullscreenElement) return;
  if (DP._ccDragJustEnded) return;
  if (e.target.closest('#ccHandle, #fsTimeline, #ccArea')) return;
  DP.playerContainer.requestFullscreen();
});

// 全屏时间轴：鼠标移动显示，3 秒不动隐藏
DP.fsHideTimer = null;
DP.playerContainer.addEventListener('mousemove', DP.showFsTimeline);

// 全屏退出时清理
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    DP.fsTimeline.classList.remove('visible');
    clearTimeout(DP.fsHideTimer);
  }
  // 容器尺寸变化后重新计算 CC 叠加位置
  setTimeout(() => DP.applyCCOverlayPct(), 50);
});

// 全屏时右键退出全屏
DP.playerContainer.addEventListener('contextmenu', (e) => {
  if (document.fullscreenElement) {
    e.preventDefault();
    document.exitFullscreen();
  }
});

// 全屏时间轴拖拽 / 点击
DP.fsBar.addEventListener('mousedown', (e) => {
  if (!DP.video.duration || !isFinite(DP.video.duration)) return;
  const rect = DP.fsBar.getBoundingClientRect();
  const seek = (ex) => {
    const ratio = Math.max(0, Math.min(1, (ex - rect.left) / rect.width));
    DP.video.currentTime = ratio * DP.video.duration;
    DP.showFsTimeline();
  };
  seek(e.clientX);
  function onMove(ev) { seek(ev.clientX); }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

// 搜索
DP.searchBox.addEventListener('input', () => {
  const val = DP.searchBox.value;
  if ((val === 'overfloating0'|| val === '溢浮零') && !DP._easterEggActive) {
    DP._easterEggSpeed = DP.video.playbackRate || 1;
    DP._easterEggActive = true;
    DP.setSpeed(16);
    DP.showToast('你看不过我你信吗');
  } else if (DP._easterEggActive && (val !== 'overfloating0' && val !== '溢浮零')) {
    DP._easterEggActive = false;
    DP.setSpeed(DP._easterEggSpeed || 1);
  }
  DP.applySearch();
});

// Toast 静音开关
DP.btnMuteToast.addEventListener('click', () => {
  DP.toastsMuted = !DP.toastsMuted;
  DP.btnMuteToast.textContent = DP.toastsMuted ? '🔕' : '🔔';
  DP.btnMuteToast.title = DP.toastsMuted ? '提示已关（点击开启）' : '提示已开（点击关闭）';
  if (!DP.toastsMuted) DP.showToast('🔔 提示消息已开启');
});

// 自动滚动开关
DP.btnAutoScroll.addEventListener('click', () => {
  DP.autoScrollEnabled = !DP.autoScrollEnabled;
  DP.btnAutoScroll.textContent = DP.autoScrollEnabled ? '📍 跟滚' : '📍 手动';
  DP.btnAutoScroll.title = DP.autoScrollEnabled ? '自动滚动：开' : '自动滚动：关';
  DP.btnAutoScroll.style.opacity = DP.autoScrollEnabled ? '1' : '0.5';
  // 重新打开时立即跳转到当前字幕（仅滚动文稿容器）
  if (DP.autoScrollEnabled && DP.currentSubIdx >= 0 && DP.subtitles[DP.currentSubIdx]?.element) {
    const el = DP.subtitles[DP.currentSubIdx].element;
    const container = DP.transcriptList;
    const cTop = container.getBoundingClientRect().top;
    const eTop = el.getBoundingClientRect().top;
    const target = container.scrollTop + (eTop - cTop) - container.clientHeight / 2 + el.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }
});

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (DP.video.paused) DP.video.play();
    else DP.video.pause();
    return;
  }

  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    if (DP.video.src && DP.video.duration) {
      DP.video.currentTime = Math.max(0, DP.video.currentTime - 5);
      DP.showToast('⏪ -5s');
    }
    return;
  }

  if (e.code === 'ArrowRight') {
    e.preventDefault();
    if (!DP.video.src || !DP.video.duration) return;
    if (!DP.longPressTimer && !DP.isLongPressing) {
      DP.savedSpeed = DP.video.playbackRate;
      DP.longPressTimer = setTimeout(() => {
        DP.isLongPressing = true;
        DP.setSpeed(3);
        DP.showToast('⚡ 3× 倍速 (松开 ➡ 恢复)');
      }, DP.LONG_PRESS_DELAY);
    }
    return;
  }

  if (e.code === 'ArrowUp') {
    e.preventDefault();
    DP.video.volume = Math.min(1, DP.video.volume + 0.1);
    DP.showToast(`🔊 ${Math.round(DP.video.volume * 100)}%`);
    return;
  }

  if (e.code === 'ArrowDown') {
    e.preventDefault();
    DP.video.volume = Math.max(0, DP.video.volume - 0.1);
    DP.showToast(`🔉 ${Math.round(DP.video.volume * 100)}%`);
    return;
  }

  if (e.code === 'KeyC') {
    e.preventDefault();
    DP.btnToggleCC.click();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  if (e.code === 'ArrowRight') {
    clearTimeout(DP.longPressTimer);
    DP.longPressTimer = null;
    if (DP.isLongPressing) {
      DP.isLongPressing = false;
      DP.setSpeed(DP.savedSpeed);
      DP.showToast('🐢 恢复 ' + DP.savedSpeed.toFixed(2).replace(/\.?0+$/, '') + '×');
    } else {
      if (DP.video.src && DP.video.duration) {
        DP.video.currentTime = Math.min(DP.video.duration, DP.video.currentTime + 5);
        DP.showToast('⏩ +5s');
      }
    }
  }
});
