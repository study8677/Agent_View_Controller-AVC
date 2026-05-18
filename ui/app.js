// ===== i18n =====
const I18N = {
  en: {
    subtitle:       'Agent View Controller',
    ready:          'Ready',
    cancel:         '✕ Cancel',
    confirm:        '✅ Confirm',
    confirmHint:    'Enter to confirm · Esc to cancel',
    skip:           'Skip',
    restore:        'Restore',
    delete:         'Delete',
    addStep:        '+ Add step',
    newStep:        'New step',
    stepsActive:    (a, t) => `${a}/${t} steps active · drag to reorder · Enter to confirm`,
    doneMessage:    '✅ Sent back. You may close this window.',
    loadError:      'Failed to load data',
    unknownView:    'Unknown view type',
    unsupportedHint: viewType => `View type "${viewType}" is not yet supported.`,
  },
  zh: {
    subtitle:       'Agent 视图控制器',
    ready:          '就绪',
    cancel:         '✕ 取消',
    confirm:        '✅ 确认执行',
    confirmHint:    'Enter 确认 · Esc 取消',
    skip:           '跳过',
    restore:        '恢复',
    delete:         '删除',
    addStep:        '+ 添加步骤',
    newStep:        '新步骤',
    stepsActive:    (a, t) => `${a}/${t} 步骤生效 · 拖动可重排序 · Enter 确认`,
    doneMessage:    '✅ 已回传，本窗口可关闭',
    loadError:      '加载数据失败',
    unknownView:    '未知视图类型',
    unsupportedHint: viewType => `视图类型 "${viewType}" 暂不支持。`,
  },
};

let t = I18N.en; // resolved translator, replaced in init()

// ===== Shared State =====
// inputData/currentState are read+written by view modules.
let inputData = null;
let currentState = null;

// ===== View Registry =====
// View modules call registerView('plan', renderFn) to plug themselves in.
// The dispatcher looks up by name and falls back to an error view.
const VIEWS = {};
function registerView(name, renderFn) {
  VIEWS[name] = renderFn;
}

// ===== Init =====
async function init() {
  try {
    const raw = await window.getInputData();
    inputData = JSON.parse(raw);
    currentState = JSON.parse(JSON.stringify(inputData)); // deep clone

    // Resolve language from input JSON (default English)
    const lang = (inputData.lang || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    t = I18N[lang];
    document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : 'en';

    // Localize static UI chrome
    document.getElementById('page-subtitle').textContent = t.subtitle;
    document.getElementById('btn-cancel').textContent = t.cancel;
    document.getElementById('btn-confirm').textContent = t.confirm;
    document.getElementById('action-info').textContent = t.ready;

    // Set header
    document.getElementById('page-title').textContent = inputData.title || 'AVC';
    document.getElementById('view-badge').textContent = inputData.view || 'unknown';

    // Route to view
    renderView(inputData.view);

    // Install global keyboard shortcuts
    installKeyboardShortcuts();
  } catch (e) {
    showError(t.loadError, e.message);
  }
}

function renderView(viewType) {
  const render = VIEWS[viewType];
  if (render) {
    render();
    return;
  }
  const supported = Object.keys(VIEWS).join(', ') || '(none registered)';
  showError(t.unknownView, t.unsupportedHint(viewType) + ' Supported: ' + supported);
}

// ===== Actions =====
let confirming = false; // guard against double-confirm via keyboard spam

function handleConfirm() {
  if (confirming) return;
  confirming = true;

  const overlay = document.createElement('div');
  overlay.className = 'done-overlay';
  overlay.innerHTML = `
    <div class="checkmark">✓</div>
    <p>${escHtml(t.doneMessage)}</p>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    window.confirmResult(JSON.stringify(currentState));
  }, 600);
}

function handleCancel() {
  if (confirming) return;
  window.cancelAction();
}

function updateInfo() {
  const steps = currentState.data?.steps || [];
  const active = steps.filter(s => !s.skipped).length;
  const total = steps.length;
  document.getElementById('action-info').textContent = t.stepsActive(active, total);
}

// ===== Keyboard Shortcuts =====
function isUserEditing() {
  const el = document.activeElement;
  if (!el) return false;
  // isContentEditable handles attribute inheritance and the empty-value
  // form ("contenteditable" with no value). Native form fields are also
  // covered so future views with <input>/<textarea> won't get hijacked.
  return el.isContentEditable
    || el.tagName === 'INPUT'
    || el.tagName === 'TEXTAREA'
    || el.tagName === 'SELECT';
}

function installKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const editing = isUserEditing();

    if (e.key === 'Escape') {
      e.preventDefault();
      if (editing) {
        document.activeElement.blur();
      } else {
        handleCancel();
      }
      return;
    }

    // Cmd/Ctrl+Enter always confirms; plain Enter confirms only when not editing
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        handleConfirm();
        return;
      }
      if (!editing && !e.shiftKey) {
        e.preventDefault();
        handleConfirm();
      }
    }
  });
}

// ===== Utilities =====
function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function showError(title, detail) {
  document.getElementById('content').innerHTML = `
    <div class="error-view">
      <div class="icon">⚠️</div>
      <h2>${escHtml(title)}</h2>
      <p>${escHtml(detail)}</p>
    </div>`;
}
