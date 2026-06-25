window.DP = window.DP || {};

// ==================== DOM 引用（最先加载，供所有模块使用） ====================
DP.btnOpenVideo    = document.getElementById('btnOpenVideo');
DP.videoInput      = document.getElementById('videoInput');
DP.btnOpenURL      = document.getElementById('btnOpenURL');
DP.btnOpenSub      = document.getElementById('btnOpenSub');
DP.subInput        = document.getElementById('subInput');
DP.btnOpenNotes    = document.getElementById('btnOpenNotes');
DP.notesFileInput  = document.getElementById('notesFileInput');
DP.btnToggleCC     = document.getElementById('btnToggleCC');
DP.btnFontDown     = document.getElementById('btnFontDown');
DP.btnFontUp       = document.getElementById('btnFontUp');
DP.btnClearSub     = document.getElementById('btnClearSub');
DP.btnMuteToast    = document.getElementById('btnMuteToast');
DP.btnTheme        = document.getElementById('btnTheme');
DP.themeMenu       = document.getElementById('themeMenu');
DP.btnAutoScroll   = document.getElementById('btnAutoScroll');
DP.btnEdit         = document.getElementById('btnEdit');
DP.editToolbar     = document.getElementById('editToolbar');
DP.btnEditNew      = document.getElementById('btnEditNew');
DP.btnEditUndo     = document.getElementById('btnEditUndo');
DP.btnEditRedo     = document.getElementById('btnEditRedo');
DP.btnEditSave     = document.getElementById('btnEditSave');
DP.btnEditExport   = document.getElementById('btnEditExport');
DP.btnNotes        = document.getElementById('btnNotes');
DP.notesContainer  = document.getElementById('notesContainer');
DP.notesList       = document.getElementById('notesList');
DP.notesSearchBox  = document.getElementById('notesSearchBox');
DP.btnNotesNew     = document.getElementById('btnNotesNew');
DP.btnNotesUndo    = document.getElementById('btnNotesUndo');
DP.btnNotesRedo    = document.getElementById('btnNotesRedo');
DP.btnNotesSave    = document.getElementById('btnNotesSave');
DP.btnNotesExport  = document.getElementById('btnNotesExport');
DP.btnNotesClear   = document.getElementById('btnNotesClear');
DP.transcriptPanel = document.getElementById('transcriptPanel');
DP.notesResizeHandle = document.getElementById('notesResizeHandle');
DP.resizeHandle    = document.getElementById('resizeHandle');
DP.videoPlh        = document.getElementById('videoPlaceholder');
DP.playerContainer = document.getElementById('playerContainer');
DP.video           = document.getElementById('video');
DP.ccArea          = document.getElementById('ccArea');
DP.ccText          = document.getElementById('ccText');
DP.ccHandle        = document.getElementById('ccHandle');
DP.fsTimeline      = document.getElementById('fsTimeline');
DP.fsCurrentTimeEl = document.getElementById('fsCurrentTime');
DP.fsDurationEl    = document.getElementById('fsDuration');
DP.fsBar           = document.getElementById('fsBar');
DP.fsBarFill       = document.getElementById('fsBarFill');
DP.controls        = document.getElementById('controls');
DP.btnPlayPause    = document.getElementById('btnPlayPause');
DP.speedIndicator  = document.getElementById('speedIndicator');
DP.btnSpeedDown    = document.getElementById('btnSpeedDown');
DP.btnSpeedUp      = document.getElementById('btnSpeedUp');
DP.btnSpeedReset   = document.getElementById('btnSpeedReset');
DP.subtitleInfo    = document.getElementById('subtitleInfo');
DP.timelineSec     = document.getElementById('timelineSection');
DP.timelineBar     = document.getElementById('timelineBar');
DP.timelineTrack   = document.getElementById('timelineTrack');
DP.timelineProg    = document.getElementById('timelineProgress');
DP.currentTimeEl   = document.getElementById('currentTime');
DP.durationEl      = document.getElementById('duration');
DP.subCount        = document.getElementById('subCount');
DP.searchBox       = document.getElementById('searchBox');
DP.transcriptList  = document.getElementById('transcriptList');
DP.transcriptEmpty = document.getElementById('transcriptEmpty');
DP.toastEl         = document.getElementById('toast');
DP.btnRestore      = document.getElementById('btnRestore');

// ==================== 全局状态 ====================
DP.subtitles         = [];
DP.ccEnabled         = true;
DP.ccFontSize        = 1.35;
DP.toastsMuted       = false;
DP.autoScrollEnabled = true;
DP.editMode          = false;
DP.editDirty         = false;
DP.editUndoStack     = [];
DP.editRedoStack     = [];
DP.selectedSubIdx    = -1;
DP.currentSubIdx     = -1;
DP.longPressTimer    = null;
DP.isLongPressing    = false;
DP.savedSpeed        = 1;
DP.LONG_PRESS_DELAY  = 250;
DP.toastTimer        = null;
DP.currentVideoName  = '';
DP.lastPosSave       = 0;
DP.fsHideTimer       = null;
DP.savedVideoHandle  = null;
DP.lastVideoHandle   = null;
DP.subFileHandle     = null;
DP.notesFileHandle   = null;

// ==================== 多标签页隔离 ====================
// window.name 特性：刷新保留、不被跨标签页共享、复制标签页时为空白
// 比 sessionStorage 更可靠（后者在 Chrome 复制标签页时会被拷贝）
DP.sessionId = window.name;
if (!DP.sessionId) {
  DP.sessionId = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  window.name = DP.sessionId;
}
// 生成 session 命名空间下的 localStorage key
DP.sessionKey = function(key) {
  return 'dp_' + DP.sessionId + '_' + key;
};
