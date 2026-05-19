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
    keyboardHints:  '↑↓/jk: move · Space: skip · Enter: edit · A: add · Del: remove',
    stepsActive:    (a, t) => `${a}/${t} steps active · ↑↓/jk: move · Space: skip · Enter: edit · A: add · Del: remove`,
    doneMessage:    '✅ Sent back. You may close this window.',
    loadError:      'Failed to load data',
    unknownView:    'Unknown view type',
    unsupportedHint: viewType => `View type "${viewType}" is not yet supported.`,
    // Graph view
    graphAddNode:       '+ Node',
    graphAddEdge:       '+ Edge',
    graphPickFirstNode: 'Click a node to start',
    graphPickSecondNode:'Click another node to connect',
    graphNewNode:       'New node',
    graphInfo:          (n, e) => `${n} nodes · ${e} edges · drag to move · Tab: navigate · A: add · Del: remove`,
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
    keyboardHints:  '↑↓/jk：移动 · Space：跳过 · Enter：编辑 · A：新增 · Del：删除',
    stepsActive:    (a, t) => `${a}/${t} 步骤生效 · ↑↓/jk：移动 · Space：跳过 · Enter：编辑 · A：新增 · Del：删除`,
    doneMessage:    '✅ 已回传，本窗口可关闭',
    loadError:      '加载数据失败',
    unknownView:    '未知视图类型',
    unsupportedHint: viewType => `视图类型 "${viewType}" 暂不支持。`,
    // Graph view
    graphAddNode:       '+ 节点',
    graphAddEdge:       '+ 连线',
    graphPickFirstNode: '点击一个节点开始连线',
    graphPickSecondNode:'再点另一个节点完成连线',
    graphNewNode:       '新节点',
    graphInfo:          (n, e) => `${n} 节点 · ${e} 连线 · 拖动改位置 · Tab：切换 · A：新增 · Del：删除`,
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
    keyboardHints:  '↑↓/jk：移動 · Space：スキップ · Enter：編集 · A：追加 · Del：削除',
    stepsActive:    (a, t) => `${a}/${t} ステップ有効 · ↑↓/jk：移動 · Space：スキップ · Enter：編集 · A：追加 · Del：削除`,
    doneMessage:    '✅ 送信しました。ウィンドウを閉じてください。',
    loadError:      'データの読み込みに失敗しました',
    unknownView:    '不明なビュータイプ',
    unsupportedHint: viewType => `ビュータイプ "${viewType}" はまだサポートされていません。`,
    // Graph view
    graphAddNode:       '+ ノード',
    graphAddEdge:       '+ エッジ',
    graphPickFirstNode: 'ノードをクリックして接続を開始',
    graphPickSecondNode:'別のノードをクリックして接続',
    graphNewNode:       '新しいノード',
    graphInfo:          (n, e) => `${n} ノード · ${e} エッジ · ドラッグで移動 · Tab：選択 · A：追加 · Del：削除`,
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
    keyboardHints:  '↑↓/jk: 이동 · Space: 건너뛰기 · Enter: 편집 · A: 추가 · Del: 삭제',
    stepsActive:    (a, t) => `${a}/${t} 단계 활성 · ↑↓/jk: 이동 · Space: 건너뛰기 · Enter: 편집 · A: 추가 · Del: 삭제`,
    doneMessage:    '✅ 전송 완료. 이 창을 닫아도 됩니다.',
    loadError:      '데이터 로드 실패',
    unknownView:    '알 수 없는 뷰 유형',
    unsupportedHint: viewType => `뷰 유형 "${viewType}"은(는) 아직 지원되지 않습니다.`,
    // Graph view
    graphAddNode:       '+ 노드',
    graphAddEdge:       '+ 연결선',
    graphPickFirstNode: '노드를 클릭하여 연결 시작',
    graphPickSecondNode:'다른 노드를 클릭하여 연결',
    graphNewNode:       '새 노드',
    graphInfo:          (n, e) => `노드 ${n} · 연결 ${e} · 끌어서 이동 · Tab: 탐색 · A: 추가 · Del: 삭제`,
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
    keyboardHints:  '↑↓/jk: mover · Space: omitir · Enter: editar · A: añadir · Del: borrar',
    stepsActive:    (a, t) => `${a}/${t} pasos activos · ↑↓/jk: mover · Space: omitir · Enter: editar · A: añadir · Del: borrar`,
    doneMessage:    '✅ Enviado. Puedes cerrar esta ventana.',
    loadError:      'Error al cargar los datos',
    unknownView:    'Tipo de vista desconocido',
    unsupportedHint: viewType => `El tipo de vista "${viewType}" aún no es compatible.`,
    // Graph view
    graphAddNode:       '+ Nodo',
    graphAddEdge:       '+ Arista',
    graphPickFirstNode: 'Haz clic en un nodo para empezar',
    graphPickSecondNode:'Haz clic en otro nodo para conectar',
    graphNewNode:       'Nuevo nodo',
    graphInfo:          (n, e) => `${n} nodos · ${e} aristas · arrastra para mover · Tab: navegar · A: añadir · Supr: eliminar`,
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
    keyboardHints:  '↑↓/jk : déplacer · Espace : ignorer · Entrée : éditer · A : ajouter · Suppr : supprimer',
    stepsActive:    (a, t) => `${a}/${t} étapes actives · ↑↓/jk : déplacer · Espace : ignorer · Entrée : éditer · A : ajouter · Suppr : supprimer`,
    doneMessage:    '✅ Envoyé. Vous pouvez fermer cette fenêtre.',
    loadError:      'Échec du chargement des données',
    unknownView:    'Type de vue inconnu',
    unsupportedHint: viewType => `Le type de vue "${viewType}" n’est pas encore pris en charge.`,
    // Graph view
    graphAddNode:       '+ Nœud',
    graphAddEdge:       '+ Lien',
    graphPickFirstNode: 'Cliquez sur un nœud pour commencer',
    graphPickSecondNode:'Cliquez sur un autre nœud pour connecter',
    graphNewNode:       'Nouveau nœud',
    graphInfo:          (n, e) => `${n} nœuds · ${e} liens · glisser pour déplacer · Tab : naviguer · A : ajouter · Suppr : supprimer`,
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
    keyboardHints:  '↑↓/jk: bewegen · Leertaste: überspringen · Enter: bearbeiten · A: hinzufügen · Entf: löschen',
    stepsActive:    (a, t) => `${a}/${t} Schritte aktiv · ↑↓/jk: bewegen · Leertaste: überspringen · Enter: bearbeiten · A: hinzufügen · Entf: löschen`,
    doneMessage:    '✅ Gesendet. Sie können dieses Fenster schließen.',
    loadError:      'Daten konnten nicht geladen werden',
    unknownView:    'Unbekannter Ansichtstyp',
    unsupportedHint: viewType => `Ansichtstyp "${viewType}" wird noch nicht unterstützt.`,
    // Graph view
    graphAddNode:       '+ Knoten',
    graphAddEdge:       '+ Kante',
    graphPickFirstNode: 'Klicke einen Knoten an, um zu beginnen',
    graphPickSecondNode:'Klicke einen weiteren Knoten an zum Verbinden',
    graphNewNode:       'Neuer Knoten',
    graphInfo:          (n, e) => `${n} Knoten · ${e} Kanten · ziehen zum Verschieben · Tab: Auswahl · A: hinzufügen · Entf: löschen`,
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
//
// Three parallel registries — one for the render, one for the keyboard
// handler, and one for the status-bar "info" line. Each is optional except
// the render: a view without a key handler simply won't intercept anything.
const VIEWS = {};
const KEY_HANDLERS = {};
const INFO_UPDATERS = {};

function registerView(name, renderFn) {
  VIEWS[name] = renderFn;
}
function registerKeyHandler(name, fn) {
  KEY_HANDLERS[name] = fn;
}
function registerInfoUpdater(name, fn) {
  INFO_UPDATERS[name] = fn;
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
  const updater = INFO_UPDATERS[inputData?.view];
  if (!updater) return; // views without an info updater leave the bar alone
  document.getElementById('action-info').textContent = updater();
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

    // Cmd/Ctrl+Enter always confirms — wins over any per-view handler.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleConfirm();
      return;
    }

    // While the user is typing into a field we never intercept further.
    if (editing) return;

    // Let the active view consume the key first (e.g. plan view's j/k/Space
    // or graph view's Tab/A/Del). The view returns true if it handled the
    // event; we then bail out so the global Enter→confirm fallback below
    // doesn't fire.
    const viewHandler = KEY_HANDLERS[inputData?.view];
    if (viewHandler && viewHandler(e)) return;

    // Fallback: plain Enter confirms when no view consumed it.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
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
