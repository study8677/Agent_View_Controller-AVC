// ===== Plan View =====
// Renders a draggable, editable list of execution steps.
// Reads/writes currentState.data.steps[].
// Each step shape: { id, label, status, skipped? }
//
// Keyboard navigation (when no field is being edited):
//   ↓/j  ↑/k          move focus between steps
//   Space             toggle skip on focused step
//   Enter             enter edit mode on focused step's label
//   Delete/Backspace  remove focused step
//   Alt+↑/K Alt+↓/J   reorder focused step
//   A/a               add a new step at the end and focus+edit it
// Cmd/Ctrl+Enter (handled in app.js) always confirms regardless of focus.

let dragSrcIndex = null;
let focusedIndex = 0; // which step is currently keyboard-focused

function renderPlanView() {
  const steps = currentState.data?.steps || [];
  const container = document.getElementById('content');

  // Clamp focused index to the new step list bounds.
  if (steps.length === 0) {
    focusedIndex = -1;
  } else if (focusedIndex < 0 || focusedIndex >= steps.length) {
    focusedIndex = Math.max(0, Math.min(focusedIndex, steps.length - 1));
  }

  let html = '<div class="plan-container"><ul class="step-list" id="step-list">';

  steps.forEach((step, i) => {
    const skippedCls = step.skipped ? ' skipped' : '';
    const focusedCls = i === focusedIndex ? ' focused' : '';
    const statusCls = step.status || 'pending';
    html += `
      <li class="step-item${skippedCls}${focusedCls}" draggable="true" data-index="${i}"
          onmousedown="setFocusedIndex(${i})"
          ondragstart="onDragStart(event)" ondragover="onDragOver(event)"
          ondragenter="onDragEnter(event)" ondragleave="onDragLeave(event)"
          ondrop="onDrop(event)" ondragend="onDragEnd(event)">
        <div class="drag-handle"><span></span><span></span><span></span></div>
        <div class="step-number">${i + 1}</div>
        <div class="step-content">
          <span class="step-label" contenteditable="${currentState.editable !== false}"
                onfocus="setFocusedIndex(${i})"
                onblur="onStepEdit(${i}, this.textContent)">${escHtml(step.label || step.name || ('Step ' + (i+1)))}</span>
        </div>
        <span class="step-status ${statusCls}">${statusCls}</span>
        <div class="step-actions">
          <button class="step-btn skip-btn" title="${step.skipped ? t.restore : t.skip}" onclick="toggleSkip(${i})">
            ${step.skipped ? '↩' : '⏭'}
          </button>
          <button class="step-btn delete-btn" title="${t.delete}" onclick="deleteStep(${i})">✕</button>
        </div>
      </li>`;
  });

  html += '</ul>';
  html += `<button class="add-step-btn" onclick="addStep()">${escHtml(t.addStep)}</button>`;
  html += '</div>';

  container.innerHTML = html;
  updateInfo();
}

function setFocusedIndex(i) {
  if (i === focusedIndex) return;
  focusedIndex = i;
  // Update class flags only — avoid a full re-render here so we don't blow
  // away an in-progress contenteditable session if the user is clicking
  // between labels.
  document.querySelectorAll('.step-item').forEach(el => {
    const idx = parseInt(el.dataset.index);
    el.classList.toggle('focused', idx === focusedIndex);
  });
}

function onStepEdit(index, text) {
  const steps = currentState.data.steps;
  if (steps[index]) {
    if (steps[index].label !== undefined) steps[index].label = text;
    else steps[index].name = text;
  }
  updateInfo();
}

function toggleSkip(index) {
  const steps = currentState.data.steps;
  if (steps[index]) {
    steps[index].skipped = !steps[index].skipped;
    renderPlanView();
  }
}

function deleteStep(index) {
  currentState.data.steps.splice(index, 1);
  // If we removed the last item, step focus back; otherwise the next item
  // slides into this index and we keep the index.
  if (focusedIndex >= currentState.data.steps.length) {
    focusedIndex = currentState.data.steps.length - 1;
  }
  renderPlanView();
}

function addStep() {
  const steps = currentState.data.steps;
  const newId = steps.length > 0 ? Math.max(...steps.map(s => s.id || 0)) + 1 : 1;
  steps.push({ id: newId, label: t.newStep, status: 'pending' });
  focusedIndex = steps.length - 1;
  renderPlanView();
  setTimeout(() => editFocusedStep(true), 50);
}

// ===== Keyboard helpers =====

// Scroll the focused step into view (no-op if already visible). Used after
// arrow-key navigation and reorder so long plans stay usable.
function scrollFocusedIntoView() {
  if (focusedIndex < 0) return;
  const el = document.querySelector(`.step-item[data-index="${focusedIndex}"]`);
  if (el && el.scrollIntoView) {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// Begin editing the focused step's label. Optionally select-all so a
// brand-new step's placeholder is replaced on first keystroke.
function editFocusedStep(selectAllText = false) {
  if (focusedIndex < 0) return;
  const el = document.querySelector(`.step-item[data-index="${focusedIndex}"] .step-label`);
  if (!el) return;
  el.focus();
  if (selectAllText) selectAll(el);
}

// Move the focused step ±1 position in the list, then re-render.
// Returns true if anything moved.
function moveFocusedStep(delta) {
  const steps = currentState.data?.steps || [];
  const target = focusedIndex + delta;
  if (focusedIndex < 0 || target < 0 || target >= steps.length) return false;
  const [moved] = steps.splice(focusedIndex, 1);
  steps.splice(target, 0, moved);
  focusedIndex = target;
  renderPlanView();
  setTimeout(scrollFocusedIntoView, 0);
  return true;
}

// The dispatcher app.js calls into for plan-specific key handling. Returns
// true if the event was consumed (so app.js can stop processing).
function handlePlanKey(e) {
  const steps = currentState.data?.steps || [];
  if (steps.length === 0 && e.key.toLowerCase() !== 'a') return false;

  const k = e.key;

  // Reorder: Alt + arrow / J / K
  if (e.altKey && (k === 'ArrowUp' || k === 'k' || k === 'K')) {
    if (moveFocusedStep(-1)) { e.preventDefault(); return true; }
    return false;
  }
  if (e.altKey && (k === 'ArrowDown' || k === 'j' || k === 'J')) {
    if (moveFocusedStep(1)) { e.preventDefault(); return true; }
    return false;
  }

  // Navigation
  if (k === 'ArrowDown' || k === 'j' || k === 'J') {
    if (focusedIndex < steps.length - 1) {
      focusedIndex++;
      setFocusedIndex(focusedIndex); // refresh classes
      scrollFocusedIntoView();
    }
    e.preventDefault();
    return true;
  }
  if (k === 'ArrowUp' || k === 'k' || k === 'K') {
    if (focusedIndex > 0) {
      focusedIndex--;
      setFocusedIndex(focusedIndex);
      scrollFocusedIntoView();
    }
    e.preventDefault();
    return true;
  }

  // Toggle skip
  if (k === ' ' || k === 'Spacebar') {
    if (focusedIndex >= 0) {
      e.preventDefault();
      toggleSkip(focusedIndex);
      return true;
    }
  }

  // Enter edit mode on focused step (without leaking to global confirm)
  if (k === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    if (focusedIndex >= 0) {
      e.preventDefault();
      editFocusedStep(false);
      return true;
    }
  }

  // Delete focused step. Animate it out so the user sees the effect.
  if (k === 'Delete' || k === 'Backspace') {
    if (focusedIndex >= 0) {
      e.preventDefault();
      const el = document.querySelector(`.step-item[data-index="${focusedIndex}"]`);
      if (el) {
        el.classList.add('removing');
        setTimeout(() => deleteStep(focusedIndex), 160);
      } else {
        deleteStep(focusedIndex);
      }
      return true;
    }
  }

  // Add new step
  if (k === 'a' || k === 'A') {
    e.preventDefault();
    addStep();
    return true;
  }

  return false;
}

// ===== Drag & Drop =====
function onDragStart(e) {
  dragSrcIndex = parseInt(e.currentTarget.dataset.index);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function onDragEnter(e) { e.currentTarget.classList.add('drag-over'); }
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

function onDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove('drag-over');
  const dropIndex = parseInt(target.dataset.index);

  if (dragSrcIndex !== null && dragSrcIndex !== dropIndex) {
    const steps = currentState.data.steps;
    const [moved] = steps.splice(dragSrcIndex, 1);
    steps.splice(dropIndex, 0, moved);
    // Follow the dragged step with focus so keyboard nav stays intuitive
    // after a mouse drag.
    focusedIndex = dropIndex;
    renderPlanView();
  }
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragSrcIndex = null;
}

// Register with the dispatcher.
registerView('plan', renderPlanView);
registerKeyHandler('plan', handlePlanKey);
registerInfoUpdater('plan', () => {
  const steps = currentState.data?.steps || [];
  const active = steps.filter((s) => !s.skipped).length;
  return t.stepsActive(active, steps.length);
});
