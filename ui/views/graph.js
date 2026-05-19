// ===== Graph View =====
// Renders a node-edge topology diagram (architecture / dependency / ER / flow).
// Reads/writes currentState.data.{nodes, edges}.
//
// Schema:
//   nodes: [{ id, label, type?, x?, y? }]
//     type ∈ { service, gateway, database, external, default } — color hint
//     x/y in world coordinates (px); auto-assigned (circular) when missing
//   edges: [{ from, to, label? }]
//
// Interactions:
//   • drag a node            → reposition (x/y persisted)
//   • double-click node      → edit label
//   • click edge             → select (Delete removes)
//   • + Node toolbar         → place at viewport center w/ spiral offset
//   • + Edge toolbar         → click 2 nodes to connect; Esc cancels
//   • Tab / Shift+Tab        → cycle node focus
//   • Enter on focused node  → edit label
//   • Delete                 → remove focused node (with incident edges) or selected edge
//   • A                      → add new node, focus + edit
//
// Coordinate system: nodes are positioned by their CENTER in a fixed "world"
// (the .graph-world div). The SVG layer shares the same world, so edges are
// drawn between node centers directly without per-frame coordinate math.

const GRAPH_WORLD = { width: 1600, height: 900 };
const GRAPH_NODE = { width: 140, height: 56 };
const GRAPH_KNOWN_TYPES = new Set(['service', 'gateway', 'database', 'external', 'default']);

const graphState = {
  selectedNodeId: null,     // focus / arrow-key selection
  selectedEdge: null,       // { from, to } or null
  pendingEdgeStart: null,   // node id, set while in "+ Edge" mode after first pick
  drawingEdge: false,       // true between toolbar click and first node pick
  draggingNodeId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  // Track listener pair so we always remove the SAME function refs on mouseup.
  dragMoveFn: null,
  dragUpFn: null,
};

// ===== Render =====

function renderGraphView() {
  const data = currentState.data || (currentState.data = {});
  data.nodes = data.nodes || [];
  data.edges = data.edges || [];

  ensureNodePositions(data.nodes);

  // First-render: focus the first node so keyboard nav has a starting point.
  if (graphState.selectedNodeId == null && data.nodes.length > 0) {
    graphState.selectedNodeId = data.nodes[0].id;
  }

  const container = document.getElementById('content');
  container.innerHTML = `
    <div class="graph-shell">
      <div class="graph-toolbar">
        <button class="graph-tool-btn" onclick="graphAddNode()">${escHtml(t.graphAddNode)}</button>
        <button class="graph-tool-btn" id="graph-edge-btn" onclick="graphStartEdge()">${escHtml(t.graphAddEdge)}</button>
        <span class="graph-mode-hint" id="graph-mode-hint"></span>
      </div>
      <div class="graph-viewport" id="graph-viewport">
        <div class="graph-world" id="graph-world"
             style="width:${GRAPH_WORLD.width}px;height:${GRAPH_WORLD.height}px;"
             onclick="graphViewportClick(event)">
          <svg class="graph-edges" id="graph-edges-svg"
               width="${GRAPH_WORLD.width}" height="${GRAPH_WORLD.height}"
               viewBox="0 0 ${GRAPH_WORLD.width} ${GRAPH_WORLD.height}">
            <defs>
              <marker id="graph-arrow" markerWidth="10" markerHeight="10"
                      refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
              </marker>
              <marker id="graph-arrow-selected" markerWidth="10" markerHeight="10"
                      refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/>
              </marker>
            </defs>
          </svg>
          <div class="graph-nodes" id="graph-nodes"></div>
        </div>
      </div>
    </div>
  `;

  renderGraphContent();
  updateInfo();
}

function renderGraphContent() {
  renderGraphNodes();
  renderGraphEdges();
  updateGraphModeHint();
}

function renderGraphNodes() {
  const container = document.getElementById('graph-nodes');
  if (!container) return;
  const nodes = currentState.data.nodes;
  const readonly = currentState.editable === false;

  const half = GRAPH_NODE.width / 2;
  const halfH = GRAPH_NODE.height / 2;

  let html = '';
  nodes.forEach((n) => {
    const typeCls = GRAPH_KNOWN_TYPES.has(n.type) ? n.type : 'default';
    const selectedCls = n.id === graphState.selectedNodeId ? ' selected' : '';
    const pendingCls = n.id === graphState.pendingEdgeStart ? ' pending-edge' : '';
    html += `
      <div class="graph-node type-${typeCls}${selectedCls}${pendingCls}"
           data-node-id="${escHtml(n.id)}"
           style="left:${n.x - half}px;top:${n.y - halfH}px;
                  width:${GRAPH_NODE.width}px;height:${GRAPH_NODE.height}px;"
           onmousedown="graphNodeMouseDown(event, '${jsId(n.id)}')"
           ondblclick="graphEditNodeLabel('${jsId(n.id)}')">
        <span class="graph-node-label"
              contenteditable="${readonly ? 'false' : 'true'}"
              onblur="graphSaveNodeLabel('${jsId(n.id)}', this.textContent)"
              onkeydown="graphLabelKey(event)">${escHtml(n.label || n.id)}</span>
        <span class="graph-node-type">${escHtml(n.type || 'node')}</span>
      </div>`;
  });
  container.innerHTML = html;
}

function renderGraphEdges() {
  const svg = document.getElementById('graph-edges-svg');
  if (!svg) return;
  const nodes = currentState.data.nodes;
  const edges = currentState.data.edges;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Group bidirectional / parallel edges so we can stagger labels.
  const pairOrdinal = new Map(); // key="a|b" sorted → next ordinal
  const pairTotal = new Map();
  edges.forEach((e) => {
    const key = [e.from, e.to].sort().join('|');
    pairTotal.set(key, (pairTotal.get(key) || 0) + 1);
  });

  // Wipe everything but <defs> (defs is the first child we rendered).
  while (svg.lastChild && svg.lastChild.tagName !== 'defs') {
    svg.removeChild(svg.lastChild);
  }

  const NS = 'http://www.w3.org/2000/svg';

  edges.forEach((e, idx) => {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    if (!from || !to) return; // orphan edge — skip silently

    const isSelected =
      graphState.selectedEdge &&
      graphState.selectedEdge.from === e.from &&
      graphState.selectedEdge.to === e.to &&
      graphState.selectedEdge.idx === idx;

    // Shorten line so arrowhead sits on the node boundary, not the center.
    const [x1, y1, x2, y2] = shortenLineToNodeEdge(from.x, from.y, to.x, to.y);

    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', 'graph-edge' + (isSelected ? ' selected' : ''));
    line.setAttribute('marker-end', isSelected ? 'url(#graph-arrow-selected)' : 'url(#graph-arrow)');
    line.dataset.edgeIdx = String(idx);
    line.addEventListener('click', (ev) => {
      ev.stopPropagation();
      graphSelectEdge(idx);
    });
    svg.appendChild(line);

    // Wider invisible hit-area so thin edges are clickable.
    const hit = document.createElementNS(NS, 'line');
    hit.setAttribute('x1', x1);
    hit.setAttribute('y1', y1);
    hit.setAttribute('x2', x2);
    hit.setAttribute('y2', y2);
    hit.setAttribute('class', 'graph-edge-hit');
    hit.addEventListener('click', (ev) => {
      ev.stopPropagation();
      graphSelectEdge(idx);
    });
    svg.appendChild(hit);

    if (e.label) {
      const key = [e.from, e.to].sort().join('|');
      const total = pairTotal.get(key) || 1;
      const ord = pairOrdinal.get(key) || 0;
      pairOrdinal.set(key, ord + 1);
      // Perpendicular offset: ±8px per extra parallel edge, centered.
      const offset = total > 1 ? (ord - (total - 1) / 2) * 14 : 0;
      const [lx, ly] = midpointWithPerp(x1, y1, x2, y2, offset);

      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', lx);
      text.setAttribute('y', ly);
      text.setAttribute('class', 'graph-edge-label' + (isSelected ? ' selected' : ''));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = e.label;
      svg.appendChild(text);
    }
  });
}

// Shorten a line so its endpoint sits at the bounding box edge of the target
// node (approximated as a rectangle). Returns [x1, y1, x2', y2']. Cheap and
// good enough for v1 — we just intersect with the rect's edges.
function shortenLineToNodeEdge(x1, y1, x2, y2) {
  const halfW = GRAPH_NODE.width / 2 + 4; // +4 px breathing room for arrow tip
  const halfH = GRAPH_NODE.height / 2 + 4;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return [x1, y1, x2, y2];
  // Scale factor where the line first crosses the target rectangle.
  const sx = halfW / Math.abs(dx || 1e-9);
  const sy = halfH / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  const newX2 = x2 - dx * s;
  const newY2 = y2 - dy * s;
  // Similar shortening at the source end so the line doesn't sit on top of
  // the source node either.
  const sx0 = halfW / Math.abs(dx || 1e-9);
  const sy0 = halfH / Math.abs(dy || 1e-9);
  const s0 = Math.min(sx0, sy0);
  const newX1 = x1 + dx * s0;
  const newY1 = y1 + dy * s0;
  return [newX1, newY1, newX2, newY2];
}

function midpointWithPerp(x1, y1, x2, y2, perpOffset) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  if (!perpOffset) return [mx, my];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector (rotate 90°).
  const px = -dy / len;
  const py = dx / len;
  return [mx + px * perpOffset, my + py * perpOffset];
}

// ===== Layout =====

function ensureNodePositions(nodes) {
  const missing = nodes.filter((n) => n.x == null || n.y == null);
  if (missing.length === 0) return;

  const cx = GRAPH_WORLD.width / 2;
  const cy = GRAPH_WORLD.height / 2;
  const radius = Math.min(360, 140 + missing.length * 18);

  missing.forEach((n, i) => {
    const angle = (i / missing.length) * Math.PI * 2 - Math.PI / 2;
    n.x = cx + Math.cos(angle) * radius;
    n.y = cy + Math.sin(angle) * radius;
  });
}

// Find a roughly-empty spot near the canvas center for a new node. Spirals
// outward checking minimum distance to existing nodes; deterministic so two
// quick clicks don't drop nodes on top of each other.
function findEmptyPosition(nodes) {
  const cx = GRAPH_WORLD.width / 2;
  const cy = GRAPH_WORLD.height / 2;
  const minDistSq = (GRAPH_NODE.width + 20) * (GRAPH_NODE.width + 20);
  for (let i = 0; i < 200; i++) {
    const r = Math.sqrt(i) * 30;
    const angle = i * 0.6;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (x < GRAPH_NODE.width || x > GRAPH_WORLD.width - GRAPH_NODE.width) continue;
    if (y < GRAPH_NODE.height || y > GRAPH_WORLD.height - GRAPH_NODE.height) continue;
    const collides = nodes.some((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return dx * dx + dy * dy < minDistSq;
    });
    if (!collides) return { x, y };
  }
  // Pathological fallback.
  return { x: cx + (nodes.length * 30) % 300, y: cy };
}

// ===== Mutations =====

function graphAddNode() {
  const nodes = currentState.data.nodes;
  const id = freshNodeId(nodes);
  const { x, y } = findEmptyPosition(nodes);
  nodes.push({ id, label: t.graphNewNode, type: 'default', x, y });
  graphState.selectedNodeId = id;
  renderGraphContent();
  updateInfo();
  setTimeout(() => graphEditNodeLabel(id), 30);
}

function graphSaveNodeLabel(id, text) {
  const node = currentState.data.nodes.find((n) => n.id === id);
  if (!node) return;
  const trimmed = (text || '').trim();
  node.label = trimmed || node.id;
  updateInfo();
  // Re-render edges only — node DOM already shows the new text.
  renderGraphEdges();
}

function graphEditNodeLabel(id) {
  const el = document.querySelector(`.graph-node[data-node-id="${cssId(id)}"] .graph-node-label`);
  if (!el) return;
  el.focus();
  selectAll(el);
}

function graphDeleteNode(id) {
  const data = currentState.data;
  const idx = data.nodes.findIndex((n) => n.id === id);
  if (idx === -1) return;
  data.nodes.splice(idx, 1);
  data.edges = data.edges.filter((e) => e.from !== id && e.to !== id);
  if (graphState.selectedNodeId === id) {
    graphState.selectedNodeId = data.nodes[Math.min(idx, data.nodes.length - 1)]?.id || null;
  }
  if (graphState.pendingEdgeStart === id) graphState.pendingEdgeStart = null;
  graphState.selectedEdge = null;
  renderGraphContent();
  updateInfo();
}

function graphDeleteEdge(idx) {
  currentState.data.edges.splice(idx, 1);
  graphState.selectedEdge = null;
  renderGraphContent();
  updateInfo();
}

// ===== Selection =====

function graphFocusNode(id) {
  graphState.selectedNodeId = id;
  graphState.selectedEdge = null;
  renderGraphContent();
}

function graphSelectEdge(idx) {
  const e = currentState.data.edges[idx];
  if (!e) return;
  graphState.selectedEdge = { from: e.from, to: e.to, idx };
  graphState.selectedNodeId = null;
  renderGraphContent();
}

// Background click → deselect everything and cancel pending edge.
function graphViewportClick(event) {
  if (event.target.id !== 'graph-world' && event.target.id !== 'graph-edges-svg') return;
  graphCancelEdgeMode();
  graphState.selectedEdge = null;
  renderGraphContent();
}

// ===== "+ Edge" mode =====

function graphStartEdge() {
  if (currentState.data.nodes.length < 2) {
    return; // nothing meaningful to connect
  }
  graphState.drawingEdge = true;
  graphState.pendingEdgeStart = null;
  updateGraphModeHint();
  document.body.classList.add('graph-edge-mode');
  const btn = document.getElementById('graph-edge-btn');
  if (btn) btn.classList.add('active');
}

function graphCancelEdgeMode() {
  graphState.drawingEdge = false;
  graphState.pendingEdgeStart = null;
  updateGraphModeHint();
  document.body.classList.remove('graph-edge-mode');
  const btn = document.getElementById('graph-edge-btn');
  if (btn) btn.classList.remove('active');
}

// Called from node mousedown; if we're in edge-draw mode we hijack the click
// instead of starting a drag. Returns true when consumed.
function graphHandleEdgeModeClick(nodeId) {
  if (!graphState.drawingEdge) return false;
  if (!graphState.pendingEdgeStart) {
    graphState.pendingEdgeStart = nodeId;
    updateGraphModeHint();
    renderGraphContent();
    return true;
  }
  // Second click — connect (unless same node).
  if (graphState.pendingEdgeStart !== nodeId) {
    currentState.data.edges.push({
      from: graphState.pendingEdgeStart,
      to: nodeId,
    });
  }
  graphCancelEdgeMode();
  renderGraphContent();
  updateInfo();
  return true;
}

function updateGraphModeHint() {
  const hint = document.getElementById('graph-mode-hint');
  if (!hint) return;
  if (!graphState.drawingEdge) {
    hint.textContent = '';
    return;
  }
  hint.textContent = graphState.pendingEdgeStart
    ? t.graphPickSecondNode
    : t.graphPickFirstNode;
}

// ===== Drag =====

function graphNodeMouseDown(event, nodeId) {
  if (event.button !== 0) return;

  // Edit mode: clicking on the editable label should NOT trigger a drag.
  if (event.target.classList.contains('graph-node-label') && event.target.isContentEditable) {
    return;
  }

  // Edge-draw mode swallows the click.
  if (graphHandleEdgeModeClick(nodeId)) {
    event.preventDefault();
    return;
  }

  graphFocusNode(nodeId);
  event.preventDefault();

  const world = document.getElementById('graph-world');
  const worldRect = world.getBoundingClientRect();
  const node = currentState.data.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  graphState.draggingNodeId = nodeId;
  graphState.dragOffsetX = event.clientX - worldRect.left - node.x;
  graphState.dragOffsetY = event.clientY - worldRect.top - node.y;

  graphState.dragMoveFn = graphOnMouseMove;
  graphState.dragUpFn = graphOnMouseUp;
  document.addEventListener('mousemove', graphState.dragMoveFn);
  document.addEventListener('mouseup', graphState.dragUpFn);
}

function graphOnMouseMove(event) {
  const id = graphState.draggingNodeId;
  if (!id) return;
  const node = currentState.data.nodes.find((n) => n.id === id);
  if (!node) return;
  const world = document.getElementById('graph-world');
  if (!world) return;
  const r = world.getBoundingClientRect();
  let nx = event.clientX - r.left - graphState.dragOffsetX;
  let ny = event.clientY - r.top - graphState.dragOffsetY;
  // Clamp inside the world.
  const halfW = GRAPH_NODE.width / 2;
  const halfH = GRAPH_NODE.height / 2;
  nx = Math.max(halfW, Math.min(GRAPH_WORLD.width - halfW, nx));
  ny = Math.max(halfH, Math.min(GRAPH_WORLD.height - halfH, ny));
  node.x = nx;
  node.y = ny;

  // Hot path — avoid full re-render. Just move the dragged node DOM and
  // redraw edges (cheap because edges are SVG primitives).
  const div = document.querySelector(`.graph-node[data-node-id="${cssId(id)}"]`);
  if (div) {
    div.style.left = nx - halfW + 'px';
    div.style.top = ny - halfH + 'px';
  }
  renderGraphEdges();
}

function graphOnMouseUp() {
  graphState.draggingNodeId = null;
  document.removeEventListener('mousemove', graphState.dragMoveFn);
  document.removeEventListener('mouseup', graphState.dragUpFn);
  graphState.dragMoveFn = null;
  graphState.dragUpFn = null;
}

// ===== Label keydown (inside contenteditable) =====
// Keep Enter from inserting newlines into the label; commit on Enter / Esc.
function graphLabelKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.target.blur();
  }
}

// ===== Keyboard handler (dispatched from app.js) =====
// Returns true if the key was consumed.
function handleGraphKey(e) {
  // Esc cancels pending edge mode without deselecting everything.
  if (e.key === 'Escape' && graphState.drawingEdge) {
    e.preventDefault();
    graphCancelEdgeMode();
    renderGraphContent();
    return true;
  }

  const nodes = currentState.data?.nodes || [];

  // A — add node
  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    graphAddNode();
    return true;
  }

  // Delete — remove selected edge first, else focused node
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (graphState.selectedEdge) {
      e.preventDefault();
      graphDeleteEdge(graphState.selectedEdge.idx);
      return true;
    }
    if (graphState.selectedNodeId != null) {
      e.preventDefault();
      graphDeleteNode(graphState.selectedNodeId);
      return true;
    }
  }

  // Tab / Shift+Tab — cycle nodes
  if (e.key === 'Tab' && nodes.length > 0) {
    e.preventDefault();
    const curIdx = nodes.findIndex((n) => n.id === graphState.selectedNodeId);
    let next;
    if (curIdx === -1) {
      next = 0;
    } else {
      next = e.shiftKey
        ? (curIdx - 1 + nodes.length) % nodes.length
        : (curIdx + 1) % nodes.length;
    }
    graphFocusNode(nodes[next].id);
    return true;
  }

  // Enter — edit focused node label
  if (e.key === 'Enter' && !e.shiftKey && graphState.selectedNodeId != null) {
    e.preventDefault();
    graphEditNodeLabel(graphState.selectedNodeId);
    return true;
  }

  return false;
}

// ===== Helpers =====

// Generate a unique node id like "node-7".
function freshNodeId(nodes) {
  const taken = new Set(nodes.map((n) => n.id));
  for (let i = nodes.length + 1; i < 9999; i++) {
    const candidate = 'node-' + i;
    if (!taken.has(candidate)) return candidate;
  }
  return 'node-' + Date.now();
}

// Safe-encode an id for embedding inside an HTML attribute value AND inside a
// JS string literal in inline handlers. Node ids come from user JSON so they
// can in theory contain quotes / backslashes.
function jsId(id) {
  return String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Safe-encode an id for use inside a CSS attribute selector value.
function cssId(id) {
  return String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ===== Wire into app.js =====

registerView('graph', renderGraphView);
registerKeyHandler('graph', handleGraphKey);
registerInfoUpdater('graph', () => {
  const n = currentState.data?.nodes?.length || 0;
  const e = currentState.data?.edges?.length || 0;
  return t.graphInfo(n, e);
});
