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
  ja: {
    subtitle:       'エージェント・ビュー・コントローラー',
    ready:          '準備完了',
    cancel:         '✕ キャンセル',
    confirm:        '✅ 実行',
    confirmHint:    'Enter で実行 · Esc でキャンセル',
    skip:           'スキップ',
    restore:        '戻す',
    delete:         '削除',
    addStep:        '+ ステップ追加',
    newStep:        '新しいステップ',
    stepsActive:    (a, t) => `${a}/${t} ステップ有効 · ドラッグで並べ替え · Enter で実行`,
    doneMessage:    '✅ 送信しました。ウィンドウを閉じてください。',
    loadError:      'データの読み込みに失敗しました',
    unknownView:    '不明なビュータイプ',
    unsupportedHint: viewType => `ビュータイプ "${viewType}" はまだサポートされていません。`,
  },
  ko: {
    subtitle:       '에이전트 뷰 컨트롤러',
    ready:          '준비됨',
    cancel:         '✕ 취소',
    confirm:        '✅ 실행',
    confirmHint:    'Enter 실행 · Esc 취소',
    skip:           '건너뛰기',
    restore:        '되돌리기',
    delete:         '삭제',
    addStep:        '+ 단계 추가',
    newStep:        '새 단계',
    stepsActive:    (a, t) => `${a}/${t} 단계 활성 · 끌어서 순서 변경 · Enter 실행`,
    doneMessage:    '✅ 전송 완료. 이 창을 닫아도 됩니다.',
    loadError:      '데이터 로드 실패',
    unknownView:    '알 수 없는 뷰 유형',
    unsupportedHint: viewType => `뷰 유형 "${viewType}"은(는) 아직 지원되지 않습니다.`,
  },
  es: {
    subtitle:       'Controlador de Vista del Agente',
    ready:          'Listo',
    cancel:         '✕ Cancelar',
    confirm:        '✅ Confirmar',
    confirmHint:    'Enter para confirmar · Esc para cancelar',
    skip:           'Omitir',
    restore:        'Restaurar',
    delete:         'Eliminar',
    addStep:        '+ Añadir paso',
    newStep:        'Nuevo paso',
    stepsActive:    (a, t) => `${a}/${t} pasos activos · arrastra para reordenar · Enter para confirmar`,
    doneMessage:    '✅ Enviado. Puedes cerrar esta ventana.',
    loadError:      'Error al cargar los datos',
    unknownView:    'Tipo de vista desconocido',
    unsupportedHint: viewType => `El tipo de vista "${viewType}" aún no es compatible.`,
  },
  fr: {
    subtitle:       'Contrôleur de Vue de l’Agent',
    ready:          'Prêt',
    cancel:         '✕ Annuler',
    confirm:        '✅ Confirmer',
    confirmHint:    'Entrée pour confirmer · Échap pour annuler',
    skip:           'Ignorer',
    restore:        'Restaurer',
    delete:         'Supprimer',
    addStep:        '+ Ajouter une étape',
    newStep:        'Nouvelle étape',
    stepsActive:    (a, t) => `${a}/${t} étapes actives · glisser pour réordonner · Entrée pour confirmer`,
    doneMessage:    '✅ Envoyé. Vous pouvez fermer cette fenêtre.',
    loadError:      'Échec du chargement des données',
    unknownView:    'Type de vue inconnu',
    unsupportedHint: viewType => `Le type de vue "${viewType}" n’est pas encore pris en charge.`,
  },
  de: {
    subtitle:       'Agent-View-Controller',
    ready:          'Bereit',
    cancel:         '✕ Abbrechen',
    confirm:        '✅ Bestätigen',
    confirmHint:    'Enter zum Bestätigen · Esc zum Abbrechen',
    skip:           'Überspringen',
    restore:        'Wiederherstellen',
    delete:         'Löschen',
    addStep:        '+ Schritt hinzufügen',
    newStep:        'Neuer Schritt',
    stepsActive:    (a, t) => `${a}/${t} Schritte aktiv · zum Neuordnen ziehen · Enter zum Bestätigen`,
    doneMessage:    '✅ Gesendet. Sie können dieses Fenster schließen.',
    loadError:      'Daten konnten nicht geladen werden',
    unknownView:    'Unbekannter Ansichtstyp',
    unsupportedHint: viewType => `Ansichtstyp "${viewType}" wird noch nicht unterstützt.`,
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

    // Resolve language from input JSON (default English).
    // Accepts the 2-letter base of any supported locale (e.g. 'zh-CN' -> 'zh').
    const rawLang = (inputData.lang || 'en').toLowerCase().slice(0, 2);
    const htmlLangMap = { en: 'en', zh: 'zh-CN', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr', de: 'de' };
    const lang = htmlLangMap[rawLang] ? rawLang : 'en';
    t = I18N[lang];
    document.documentElement.lang = htmlLangMap[lang];

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
