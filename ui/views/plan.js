// ===== Plan View =====
// Renders a draggable, editable list of execution steps.
// Reads/writes currentState.data.steps[].
// Each step shape: { id, label, status, skipped? }

let dragSrcIndex = null;

function renderPlanView() {
  const steps = currentState.data?.steps || [];
  const container = document.getElementById('content');

  let html = '<div class="plan-container"><ul class="step-list" id="step-list">';

  steps.forEach((step, i) => {
    const skippedCls = step.skipped ? ' skipped' : '';
    const statusCls = step.status || 'pending';
    html += `
      <li class="step-item${skippedCls}" draggable="true" data-index="${i}"
          ondragstart="onDragStart(event)" ondragover="onDragOver(event)"
          ondragenter="onDragEnter(event)" ondragleave="onDragLeave(event)"
          ondrop="onDrop(event)" ondragend="onDragEnd(event)">
        <div class="drag-handle"><span></span><span></span><span></span></div>
        <div class="step-number">${i + 1}</div>
        <div class="step-content">
          <span class="step-label" contenteditable="${currentState.editable !== false}"
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
  renderPlanView();
}

function addStep() {
  const steps = currentState.data.steps;
  const newId = steps.length > 0 ? Math.max(...steps.map(s => s.id || 0)) + 1 : 1;
  steps.push({ id: newId, label: t.newStep, status: 'pending' });
  renderPlanView();
  setTimeout(() => {
    const labels = document.querySelectorAll('.step-label');
    const last = labels[labels.length - 1];
    if (last) { last.focus(); selectAll(last); }
  }, 50);
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
    renderPlanView();
  }
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragSrcIndex = null;
}

// Register with the dispatcher
registerView('plan', renderPlanView);
