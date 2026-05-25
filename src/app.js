const STORAGE_KEY = 'inspiration-manager-local-browser-fallback-v1';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const RATINGS = ['none', 'star', 'diamond', 'crown'];
const RATING_ICONS = {
  none: '★',
  star: '★',
  diamond: '',
  crown: '♛'
};
const RATING_LABELS = {
  none: '未评级',
  star: '星星',
  diamond: '钻石',
  crown: '皇冠'
};

const nowText = (value) => new Date(value || Date.now()).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
const $ = (id) => document.getElementById(id);

const els = {
  dataNameInput: $('dataNameInput'),
  addDataBtn: $('addDataBtn'),
  dataList: $('dataList'),
  currentTitle: $('currentTitle'),
  currentSubTitle: $('currentSubTitle'),
  addIdeaBtn: $('addIdeaBtn'),
  connectBtn: $('connectBtn'),
  clearBtn: $('clearBtn'),
  canvas: $('canvas'),
  connectionLayer: $('connectionLayer'),
  connectionGroup: $('connectionGroup'),
  zoomLayer: $('zoomLayer'),
  emptyState: $('emptyState'),
  selectHint: $('selectHint'),
  categoryCount: $('categoryCount'),
  ideaCount: $('ideaCount'),
  tagNameInput: $('tagNameInput'),
  addTagBtn: $('addTagBtn'),
  tagList: $('tagList'),
  editorDrawer: $('editorDrawer'),
  closeEditorBtn: $('closeEditorBtn'),
  ideaTitleInput: $('ideaTitleInput'),
  drawerRatingOptions: $('drawerRatingOptions'),
  editorTagChecks: $('editorTagChecks'),
  ideaContentEditor: $('ideaContentEditor'),
  saveIdeaBtn: $('saveIdeaBtn'),
  deleteIdeaBtn: $('deleteIdeaBtn'),
  toast: $('toast')
};

function defaultState() {
  const dataId = uid();
  const tagProduct = uid();
  const tagDesign = uid();
  const tagResearch = uid();
  const ideaA = uid();
  const ideaB = uid();
  const ideaC = uid();
  const ideaD = uid();

  return {
    activeDataId: dataId,
    dataItems: [
      { id: dataId, name: '我的第一个灵感空间', createdAt: Date.now(), updatedAt: Date.now() }
    ],
    tags: [
      { id: tagProduct, name: '产品' },
      { id: tagDesign, name: '设计' },
      { id: tagResearch, name: '待验证' }
    ],
    ideas: [
      {
        id: ideaA,
        dataId,
        title: '皇冠灵感：核心重点',
        content: '<p>皇冠代表最高等级。皇冠灵感块会呈现金色通体视觉，更适合标记最重要、最核心的想法。</p>',
        rating: 'crown',
        crownEnabled: true,
        tagIds: [tagProduct, tagDesign],
        x: 410,
        y: 190,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: ideaB,
        dataId,
        title: '钻石灵感：高价值想法',
        content: '<p>钻石代表次高等级。钻石灵感块会呈现淡蓝色通体视觉，适合标记高价值但还需要继续打磨的想法。</p>',
        rating: 'diamond',
        crownEnabled: false,
        tagIds: [tagDesign],
        x: 710,
        y: 300,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: ideaC,
        dataId,
        title: '星星灵感：普通重点',
        content: '<p>星星代表普通评级。星星只会点亮图标，不改变灵感块整体颜色，适合标记一般重点。</p>',
        rating: 'star',
        crownEnabled: false,
        tagIds: [tagResearch],
        x: 560,
        y: 520,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: ideaD,
        dataId,
        title: '未评级灵感可以被清空',
        content: '<p>没有评级时显示灰色星星。点击“全部清空”会删除所有未评级灵感块，保留皇冠、钻石和星星灵感块。</p>',
        rating: 'none',
        crownEnabled: false,
        tagIds: [tagProduct],
        x: 410,
        y: 690,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    connections: [
      { id: uid(), dataId, sourceIdeaId: ideaA, targetIdeaId: ideaB },
      { id: uid(), dataId, sourceIdeaId: ideaB, targetIdeaId: ideaC },
      { id: uid(), dataId, sourceIdeaId: ideaC, targetIdeaId: ideaD }
    ]
  };
}

let state = defaultState();
let view = { zoom: 1, x: 0, y: 0 };
let connectMode = false;
let selectedForConnect = null;
let editingIdeaId = null;
let dragging = null;
let panning = null;
let saveTimer = null;
let hydrated = false;

function isValidStateShape(nextState) {
  return Boolean(
    nextState &&
    Array.isArray(nextState.dataItems) &&
    Array.isArray(nextState.ideas) &&
    Array.isArray(nextState.tags) &&
    Array.isArray(nextState.connections)
  );
}

function stateScore(nextState) {
  if (!isValidStateShape(nextState)) return -1;
  return (
    nextState.dataItems.length * 10 +
    nextState.ideas.length * 100 +
    nextState.tags.length * 20 +
    nextState.connections.length * 10
  );
}

function pickBestState(...states) {
  const valid = states.filter(isValidStateShape);
  if (!valid.length) return null;

  valid.sort((a, b) => {
    const aSavedAt = Number(a._savedAt || 0);
    const bSavedAt = Number(b._savedAt || 0);

    if (aSavedAt || bSavedAt) return bSavedAt - aSavedAt;

    const aScore = stateScore(a);
    const bScore = stateScore(b);
    if (aScore !== bScore) return bScore - aScore;

    return 0;
  });

  return valid[0];
}

function readLocalBackupState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalBackupState() {
  try {
    state._savedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save local backup:', error);
  }
}


init();

async function init() {
  state = await loadState();
  if (!state || !Array.isArray(state.dataItems)) {
    state = defaultState();
    await saveStateNow();
  }
  state = migrateState(state);
  hydrated = true;
  bindEvents();

  // 启动/重启后自动把当前灵感空间居中，避免灵感块跑到画布顶部或边缘。
  centerCanvasOnActiveIdeas();
  render();
}

async function loadState() {
  const localBackup = readLocalBackupState();
  let diskState = null;

  if (window.ideaStore?.load) {
    try {
      diskState = await window.ideaStore.load();
    } catch (error) {
      console.error('Failed to load disk state:', error);
    }
  }

  return pickBestState(diskState, localBackup);
}

function saveState() {
  if (!hydrated) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveStateNow, 120);
}

async function saveStateNow() {
  if (!hydrated || !isValidStateShape(state)) return;

  writeLocalBackupState();

  if (window.ideaStore?.save) {
    try {
      const result = await window.ideaStore.save(state);
      if (!result?.ok) {
        console.error('Disk save failed:', result?.message || result);
      }
    } catch (error) {
      console.error('Disk save failed:', error);
    }
  }
}

function normalizeRating(rating) {
  return RATINGS.includes(rating) ? rating : 'none';
}

function getIdeaRating(idea) {
  if (!idea) return 'none';
  if (idea.rating) return normalizeRating(idea.rating);
  return idea.crownEnabled ? 'crown' : 'none';
}

function setIdeaRating(idea, rating) {
  const nextRating = normalizeRating(rating);
  idea.rating = nextRating;
  // Keep this field for older data compatibility, but rating is now the source of truth.
  idea.crownEnabled = nextRating === 'crown';
}

function nextIdeaRating(idea) {
  const current = getIdeaRating(idea);
  const index = RATINGS.indexOf(current);
  return RATINGS[(index + 1) % RATINGS.length];
}

function migrateState(nextState) {
  if (!nextState || !Array.isArray(nextState.ideas)) return nextState;

  nextState.ideas.forEach(idea => {
    setIdeaRating(idea, getIdeaRating(idea));
  });

  return nextState;
}

function ratingToastText(rating) {
  if (rating === 'none') return '已取消评级';
  return `${RATING_LABELS[rating]}已点亮`;
}

function activeData() {
  return state.dataItems.find(item => item.id === state.activeDataId) || state.dataItems[0];
}

function activeIdeas() {
  return state.ideas.filter(idea => idea.dataId === state.activeDataId);
}

function activeConnections() {
  const ids = new Set(activeIdeas().map(i => i.id));
  return state.connections.filter(conn => conn.dataId === state.activeDataId && ids.has(conn.sourceIdeaId) && ids.has(conn.targetIdeaId));
}

function plainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function render() {
  if (!state.dataItems.length) {
    state = defaultState();
  }
  renderDataList();
  renderCanvas();
  renderPanel();
  saveState();
}

function renderDataList() {
  const current = activeData();
  state.activeDataId = current.id;
  els.currentTitle.textContent = current.name;
  els.currentSubTitle.textContent = `当前空间：${activeIdeas().length} 个灵感块，${activeConnections().length} 条连线`;

  els.dataList.innerHTML = '';
  state.dataItems.forEach(item => {
    const count = state.ideas.filter(idea => idea.dataId === item.id).length;
    const card = document.createElement('div');
    card.className = `data-card ${item.id === state.activeDataId ? 'active' : ''}`;
    card.innerHTML = `
      <div class="data-top">
        <div class="data-name"></div>
        <button class="delete-icon" title="删除数据">🗑</button>
      </div>
      <div class="data-meta">
        <span>${count} 个灵感</span>
        <span>更新 ${nowText(item.updatedAt)}</span>
      </div>
    `;

    const nameNode = card.querySelector('.data-name');
    nameNode.textContent = item.name;
    nameNode.title = '点击重命名';
    nameNode.addEventListener('click', (e) => {
      e.stopPropagation();
      renameDataInline(nameNode, item);
    });

    card.addEventListener('click', () => {
      state.activeDataId = item.id;
      selectedForConnect = null;
      resetCanvasView();
      closeEditor();
      render();
    });

    card.querySelector('.delete-icon').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteData(item.id);
    });

    els.dataList.appendChild(card);
  });
}

function renderCanvas() {
  els.zoomLayer.innerHTML = '';
  els.connectionGroup.innerHTML = '';
  applyCanvasView();

  const ideas = activeIdeas();
  els.emptyState.style.display = ideas.length ? 'none' : 'grid';
  els.selectHint.classList.toggle('show', connectMode);
  els.connectBtn.classList.toggle('active', connectMode);

  ideas.forEach(idea => {
    const rating = getIdeaRating(idea);
    const block = document.createElement('article');
    block.className = `idea-block rating-${rating} ${selectedForConnect === idea.id ? 'selected' : ''}`;
    block.dataset.id = idea.id;
    block.style.left = `${idea.x}px`;
    block.style.top = `${idea.y}px`;

    const tagsHtml = idea.tagIds.map(tagId => {
      const tag = state.tags.find(t => t.id === tagId);
      return tag ? `<span class="tag-pill"># ${escapeHtml(tag.name)}</span>` : '';
    }).join('');

    block.innerHTML = `
      <div class="idea-head">
        <button class="rating-icon rating-${rating}" title="当前评级：${RATING_LABELS[rating]}。点击切换评级" aria-label="${RATING_LABELS[rating]}评级">${RATING_ICONS[rating]}</button>
        <div class="idea-title">${escapeHtml(idea.title || '未命名灵感')}</div>
      </div>
      <div class="idea-snippet">${escapeHtml(plainText(idea.content).slice(0, 70) || '点击编辑这条灵感内容。')}</div>
      <div class="tag-row">${tagsHtml || '<span class="tag-pill">未分类</span>'}</div>
    `;

    block.querySelector('.rating-icon').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextRating = nextIdeaRating(idea);
      setIdeaRating(idea, nextRating);
      updateDataTime();
      toast(ratingToastText(nextRating));
      render();
    });

    block.addEventListener('pointerdown', startDrag);
    block.addEventListener('click', () => {
      if (dragging && dragging.moved) return;
      handleIdeaClick(idea.id);
    });

    els.zoomLayer.appendChild(block);
  });

  drawConnections();
}

function drawConnections() {
  els.connectionGroup.innerHTML = '';
  const blockMap = new Map();
  els.zoomLayer.querySelectorAll('.idea-block').forEach(block => {
    blockMap.set(block.dataset.id, {
      x: Number(block.style.left.replace('px', '')) + block.offsetWidth / 2,
      y: Number(block.style.top.replace('px', '')) + block.offsetHeight / 2
    });
  });

  activeConnections().forEach(conn => {
    const a = blockMap.get(conn.sourceIdeaId);
    const b = blockMap.get(conn.targetIdeaId);
    if (!a || !b) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
    line.classList.add('connection-line');
    line.addEventListener('click', () => {
      state.connections = state.connections.filter(item => item.id !== conn.id);
      updateDataTime();
      toast('连线已删除');
      render();
    });
    els.connectionGroup.appendChild(line);
  });
}

function renderPanel() {
  const ideas = activeIdeas();
  const usedTagIds = new Set();
  ideas.forEach(idea => idea.tagIds.forEach(tagId => usedTagIds.add(tagId)));
  els.categoryCount.textContent = usedTagIds.size;
  els.ideaCount.textContent = ideas.length;

  els.tagList.innerHTML = '';
  if (!state.tags.length) {
    const empty = document.createElement('div');
    empty.className = 'tag-item';
    empty.innerHTML = '<div class="tag-item-main"><div class="tag-name">暂无标签</div><div class="tag-count">请先添加一个标签</div></div>';
    els.tagList.appendChild(empty);
    return;
  }

  state.tags.forEach(tag => {
    const count = ideas.filter(idea => idea.tagIds.includes(tag.id)).length;
    const node = document.createElement('div');
    node.className = 'tag-item';
    node.dataset.tagId = tag.id;
    node.innerHTML = `
      <div class="tag-item-main">
        <div class="tag-name">${escapeHtml(tag.name)}</div>
        <div class="tag-count">当前空间 ${count} 个灵感使用</div>
      </div>
      <div class="tag-actions">
        <button class="mini-btn edit" title="编辑标签">✎</button>
        <button class="mini-btn remove" title="删除标签">×</button>
      </div>
    `;
    node.querySelector('.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      editTag(tag.id);
    });
    node.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTag(tag.id);
    });
    els.tagList.appendChild(node);
  });
}

function renderEditorTags(idea) {
  els.editorTagChecks.innerHTML = '';
  if (!state.tags.length) {
    els.editorTagChecks.innerHTML = '<span class="mini-stat">暂无标签，请先在右侧灵感面板添加标签。</span>';
    return;
  }

  state.tags.forEach(tag => {
    const label = document.createElement('label');
    label.className = 'check-pill';
    label.innerHTML = `<input type="checkbox" value="${tag.id}" ${idea.tagIds.includes(tag.id) ? 'checked' : ''} /> ${escapeHtml(tag.name)}`;
    els.editorTagChecks.appendChild(label);
  });
}

function handleIdeaClick(ideaId) {
  if (connectMode) {
    selectForConnection(ideaId);
  } else {
    openEditor(ideaId);
  }
}

function selectForConnection(ideaId) {
  if (!selectedForConnect) {
    selectedForConnect = ideaId;
    toast('已选择第一个灵感块，请选择第二个');
    render();
    return;
  }

  if (selectedForConnect === ideaId) {
    selectedForConnect = null;
    toast('已取消选择');
    render();
    return;
  }

  toggleConnection(selectedForConnect, ideaId);
  selectedForConnect = null;
  render();
}

function toggleConnection(a, b) {
  const existing = state.connections.find(conn => conn.dataId === state.activeDataId && samePair(conn.sourceIdeaId, conn.targetIdeaId, a, b));
  if (existing) {
    state.connections = state.connections.filter(conn => conn.id !== existing.id);
    toast('重复点击：连线已删除');
  } else {
    state.connections.push({ id: uid(), dataId: state.activeDataId, sourceIdeaId: a, targetIdeaId: b });
    toast('连线已建立');
  }
  updateDataTime();
}

function samePair(x1, y1, x2, y2) {
  return (x1 === x2 && y1 === y2) || (x1 === y2 && y1 === x2);
}

function startDrag(e) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  const block = e.currentTarget;
  const idea = state.ideas.find(item => item.id === block.dataset.id);
  if (!idea) return;

  dragging = {
    idea,
    block,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    startLeft: idea.x,
    startTop: idea.y,
    moved: false
  };
  block.classList.add('dragging');

  try {
    block.setPointerCapture(e.pointerId);
  } catch (err) {
    // Electron/Chromium can throw if the pointer is already released.
  }
}

window.addEventListener('pointermove', (e) => {
  if (dragging) {
    const dx = (e.clientX - dragging.startX) / view.zoom;
    const dy = (e.clientY - dragging.startY) / view.zoom;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragging.moved = true;

    const canvasRect = els.canvas.getBoundingClientRect();
    const maxX = Math.max(5000, canvasRect.width / view.zoom * 4);
    const maxY = Math.max(5000, canvasRect.height / view.zoom * 4);

    dragging.idea.x = clamp(dragging.startLeft + dx, -2400, maxX);
    dragging.idea.y = clamp(dragging.startTop + dy, -2400, maxY);
    dragging.block.style.left = `${dragging.idea.x}px`;
    dragging.block.style.top = `${dragging.idea.y}px`;
    drawConnectionsLive();
    return;
  }

  if (panning) {
    const dx = e.clientX - panning.startX;
    const dy = e.clientY - panning.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) panning.moved = true;
    view.x = panning.startViewX + dx;
    view.y = panning.startViewY + dy;
    applyCanvasView();
  }
});

window.addEventListener('pointerup', () => {
  if (dragging) {
    try {
      if (dragging.block?.hasPointerCapture?.(dragging.pointerId)) {
        dragging.block.releasePointerCapture(dragging.pointerId);
      }
    } catch (err) {
      // Ignore pointer-capture release errors caused by rapid DOM changes.
    }

    dragging.block.classList.remove('dragging');
    updateDataTime();
    saveState();
    setTimeout(() => { dragging = null; }, 0);
  }

  if (panning) {
    els.canvas.classList.remove('panning');
    panning = null;
  }
});

function drawConnectionsLive() {
  drawConnections();
}

function refreshIdeaBlockTagsOnly() {
  els.zoomLayer.querySelectorAll('.idea-block').forEach(block => {
    const idea = state.ideas.find(item => item.id === block.dataset.id);
    if (!idea) return;

    const tagRow = block.querySelector('.tag-row');
    if (!tagRow) return;

    const tagsHtml = idea.tagIds.map(tagId => {
      const tag = state.tags.find(t => t.id === tagId);
      return tag ? `<span class="tag-pill"># ${escapeHtml(tag.name)}</span>` : '';
    }).join('');

    tagRow.innerHTML = tagsHtml || '<span class="tag-pill">未分类</span>';
  });
}

function refreshIdeaBlockRatingOnly(idea) {
  if (!idea) return;
  const block = els.zoomLayer.querySelector(`.idea-block[data-id="${idea.id}"]`);
  if (!block) return;

  const rating = getIdeaRating(idea);
  block.classList.remove('rating-none', 'rating-star', 'rating-diamond', 'rating-crown');
  block.classList.add(`rating-${rating}`);

  const icon = block.querySelector('.rating-icon');
  if (icon) {
    icon.className = `rating-icon rating-${rating}`;
    icon.textContent = RATING_ICONS[rating];
    icon.title = `当前评级：${RATING_LABELS[rating]}。点击切换评级`;
    icon.setAttribute('aria-label', `${RATING_LABELS[rating]}评级`);
  }
}



function applyCanvasView() {
  els.zoomLayer.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  els.connectionGroup.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.zoom})`);
  els.canvas.style.backgroundPosition = `${view.x}px ${view.y}px`;
  els.canvas.style.backgroundSize = `${28 * view.zoom}px ${28 * view.zoom}px`;
}

function zoomCanvasByWheel(e) {
  if (e.target.closest('.toolbar') || e.target.closest('.editor-drawer')) return;
  e.preventDefault();

  const rect = els.canvas.getBoundingClientRect();
  const pointerX = e.clientX - rect.left;
  const pointerY = e.clientY - rect.top;
  const worldX = (pointerX - view.x) / view.zoom;
  const worldY = (pointerY - view.y) / view.zoom;
  const direction = e.deltaY > 0 ? -1 : 1;
  const nextZoom = clamp(view.zoom + direction * 0.08, 0.45, 1.8);

  view.x = pointerX - worldX * nextZoom;
  view.y = pointerY - worldY * nextZoom;
  view.zoom = nextZoom;
  applyCanvasView();
  drawConnections();
}

function startCanvasPan(e) {
  if (e.button !== 0) return;
  if (
    e.target.closest('.idea-block') ||
    e.target.closest('.toolbar') ||
    e.target.closest('.editor-drawer') ||
    e.target.closest('.connection-line')
  ) {
    return;
  }

  closeEditor();

  panning = {
    startX: e.clientX,
    startY: e.clientY,
    startViewX: view.x,
    startViewY: view.y,
    moved: false
  };
  els.canvas.classList.add('panning');
}

function handleEditorPaste(e) {
  e.preventDefault();
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!text) return;
  document.execCommand('insertText', false, text);
}

function keepEditorEditable(e) {
  e.stopPropagation();
}

function openEditor(ideaId) {
  const idea = state.ideas.find(item => item.id === ideaId);
  if (!idea) return;

  editingIdeaId = ideaId;
  els.ideaTitleInput.value = idea.title;
  els.ideaContentEditor.innerHTML = idea.content || '';
  renderEditorRatingOptions(idea);
  renderEditorTags(idea);
  els.editorDrawer.classList.add('open');
  els.editorDrawer.setAttribute('aria-hidden', 'false');
}

function renderEditorRatingOptions(idea) {
  const currentRating = getIdeaRating(idea);
  els.drawerRatingOptions.querySelectorAll('[data-rating]').forEach(button => {
    const rating = button.dataset.rating;
    button.classList.toggle('active', rating === currentRating);
    button.title = rating === currentRating
      ? `当前为${RATING_LABELS[rating]}，再次点击可取消评级`
      : `设为${RATING_LABELS[rating]}`;
  });
}

function closeEditor() {
  editingIdeaId = null;
  els.editorDrawer.classList.remove('open');
  els.editorDrawer.setAttribute('aria-hidden', 'true');
}

function saveIdeaFromEditor() {
  const idea = state.ideas.find(item => item.id === editingIdeaId);
  if (!idea) return;

  const title = els.ideaTitleInput.value.trim() || '未命名灵感';
  const checkedTags = [...els.editorTagChecks.querySelectorAll('input:checked')].map(input => input.value);
  idea.title = title;
  idea.content = sanitizeEditorHtml(els.ideaContentEditor.innerHTML);
  idea.tagIds = checkedTags;
  idea.updatedAt = Date.now();
  updateDataTime();
  toast('灵感块已保存');
  render();
  closeEditor();
}

function sanitizeEditorHtml(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  wrapper.querySelectorAll('img, video, audio, iframe, script, style, object, embed').forEach(node => node.remove());
  wrapper.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attr => {
      if (attr.name.startsWith('on')) node.removeAttribute(attr.name);
      if (attr.name === 'src' || attr.name === 'href') node.removeAttribute(attr.name);
    });
  });
  return wrapper.innerHTML || '<p></p>';
}

function addData() {
  const name = els.dataNameInput.value.trim() || `新的灵感数据 ${state.dataItems.length + 1}`;
  const item = { id: uid(), name, createdAt: Date.now(), updatedAt: Date.now() };
  state.dataItems.unshift(item);
  state.activeDataId = item.id;
  els.dataNameInput.value = '';
  closeEditor();
  selectedForConnect = null;
  resetCanvasView();
  toast('数据已新建');
  render();
}

function renameDataInline(nameNode, item) {
  const input = document.createElement('input');
  input.className = 'data-name-input';
  input.value = item.name;
  nameNode.replaceWith(input);
  input.focus();
  input.select();

  const createNameNode = () => {
    const node = document.createElement('div');
    node.className = 'data-name';
    node.textContent = item.name;
    node.title = '点击重命名';
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      renameDataInline(node, item);
    });
    return node;
  };

  let finished = false;

  const finish = (shouldSave) => {
    if (finished) return;
    finished = true;

    const nextName = input.value.trim();

    if (shouldSave && nextName && nextName !== item.name) {
      item.name = nextName;
      item.updatedAt = Date.now();

      if (state.activeDataId === item.id) {
        els.currentTitle.textContent = item.name;
      }

      toast('数据已重命名');
    }

    input.replaceWith(createNameNode());
    saveState();
  };

  input.addEventListener('pointerdown', (e) => e.stopPropagation());
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  input.addEventListener('click', (e) => e.stopPropagation());

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => finish(true), 0);
  });
}

function deleteData(dataId) {
  const item = state.dataItems.find(d => d.id === dataId);
  if (!item) return;
  if (!confirm(`确定要删除「${item.name}」吗？该数据下的灵感块和连线也会被删除。`)) return;

  state.dataItems = state.dataItems.filter(d => d.id !== dataId);
  state.ideas = state.ideas.filter(idea => idea.dataId !== dataId);
  state.connections = state.connections.filter(conn => conn.dataId !== dataId);

  if (state.activeDataId === dataId) {
    state.activeDataId = state.dataItems[0]?.id || null;
    resetCanvasView();
  }

  closeEditor();
  selectedForConnect = null;
  toast('数据已删除');
  render();
}

function addIdea() {
  if (!state.activeDataId) return toast('请先新建数据');

  const canvasRect = els.canvas.getBoundingClientRect();
  const count = activeIdeas().length;
  const visibleLeft = Math.max(0, -view.x / view.zoom);
  const visibleTop = Math.max(0, -view.y / view.zoom);
  const idea = {
    id: uid(),
    dataId: state.activeDataId,
    title: `新灵感 ${count + 1}`,
    content: '<p>在这里输入你的灵感内容。</p>',
    rating: 'none',
    crownEnabled: false,
    tagIds: [],
    x: visibleLeft + Math.min(120 + count * 34, Math.max(120, canvasRect.width / view.zoom - 260)),
    y: visibleTop + Math.min(150 + count * 28, Math.max(150, canvasRect.height / view.zoom - 190)),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.ideas.push(idea);
  updateDataTime();
  toast('灵感块已添加');
  render();
  openEditor(idea.id);
}

function deleteIdea() {
  const idea = state.ideas.find(item => item.id === editingIdeaId);
  if (!idea) return;
  if (!confirm(`确定要删除「${idea.title}」吗？相关连线也会被删除。`)) return;

  state.ideas = state.ideas.filter(item => item.id !== idea.id);
  state.connections = state.connections.filter(conn => conn.sourceIdeaId !== idea.id && conn.targetIdeaId !== idea.id);
  updateDataTime();
  closeEditor();
  toast('灵感块已删除');
  render();
}

function clearNormalIdeas() {
  const ideasInCurrentSpace = activeIdeas();
  const ratedIdeas = ideasInCurrentSpace.filter(idea => getIdeaRating(idea) !== 'none');
  const deleteCount = ideasInCurrentSpace.length - ratedIdeas.length;

  if (!deleteCount) {
    toast('当前没有可清空的未评级灵感块');
    return;
  }

  if (!confirm(`确定要清空当前灵感空间中的 ${deleteCount} 个未评级灵感块吗？皇冠、钻石和星星灵感块会保留。`)) return;

  const keepIds = new Set(ratedIdeas.map(idea => idea.id));
  state.ideas = state.ideas.filter(idea => idea.dataId !== state.activeDataId || keepIds.has(idea.id));
  const validIdeaIds = new Set(state.ideas.map(idea => idea.id));
  state.connections = state.connections.filter(conn => conn.dataId !== state.activeDataId || (validIdeaIds.has(conn.sourceIdeaId) && validIdeaIds.has(conn.targetIdeaId)));
  updateDataTime();
  selectedForConnect = null;
  closeEditor();
  toast('已清空未评级灵感块，保留所有已评级灵感');
  render();
}

function addTag() {
  const name = els.tagNameInput.value.trim();
  if (!name) return toast('请输入标签名称');
  if (state.tags.some(tag => tag.name === name)) return toast('标签已存在');

  state.tags.push({ id: uid(), name });
  els.tagNameInput.value = '';
  toast('标签已添加');
  render();
  refreshEditorTagChecksIfOpen();
}

function editTag(tagId) {
  const tag = state.tags.find(item => item.id === tagId);
  if (!tag) return;

  const itemNode = els.tagList.querySelector(`.tag-item[data-tag-id="${tagId}"]`);
  const nameNode = itemNode?.querySelector('.tag-name');

  if (!itemNode || !nameNode) {
    openTagRenameDialog(tag);
    return;
  }

  const input = document.createElement('input');
  input.className = 'tag-name-input';
  input.value = tag.name;
  input.setAttribute('aria-label', '编辑标签名称');

  nameNode.replaceWith(input);
  input.focus();
  input.select();

  const createTagNameNode = () => {
    const node = document.createElement('div');
    node.className = 'tag-name';
    node.textContent = tag.name;
    return node;
  };

  let finished = false;

  const finish = (shouldSave) => {
    if (finished) return;

    const nextName = input.value.trim();

    if (shouldSave && nextName && nextName !== tag.name) {
      if (state.tags.some(item => item.id !== tagId && item.name === nextName)) {
        toast('标签名称已存在');
        input.focus();
        input.select();
        return;
      }

      tag.name = nextName;
      updateDataTime();
      toast('标签已更新');
    }

    finished = true;
    input.replaceWith(createTagNameNode());

    refreshIdeaBlockTagsOnly();
    refreshEditorTagChecksIfOpen();
    saveState();
  };

  input.addEventListener('pointerdown', (e) => e.stopPropagation());
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  input.addEventListener('click', (e) => e.stopPropagation());

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => finish(true), 0);
  });
}

function openTagRenameDialog(tag) {
  const nextName = window.prompt('编辑标签名称', tag.name)?.trim();
  if (!nextName || nextName === tag.name) return;
  if (state.tags.some(item => item.id !== tag.id && item.name === nextName)) return toast('标签名称已存在');

  tag.name = nextName;
  updateDataTime();
  toast('标签已更新');
  render();
  refreshEditorTagChecksIfOpen();
}

function deleteTag(tagId) {
  const tag = state.tags.find(item => item.id === tagId);
  if (!tag) return;
  if (!confirm(`删除「${tag.name}」后，所有使用该标签的灵感块都会移除该标签。是否继续？`)) return;

  state.tags = state.tags.filter(item => item.id !== tagId);
  state.ideas.forEach(idea => {
    idea.tagIds = idea.tagIds.filter(id => id !== tagId);
  });
  toast('标签已删除');
  render();
  refreshEditorTagChecksIfOpen();
}

function refreshEditorTagChecksIfOpen() {
  if (!editingIdeaId) return;
  const idea = state.ideas.find(item => item.id === editingIdeaId);
  if (idea) renderEditorTags(idea);
}

function updateDataTime() {
  const data = activeData();
  if (data) data.updatedAt = Date.now();
}

function resetCanvasView() {
  view = { zoom: 1, x: 0, y: 0 };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function bindEvents() {
  els.addDataBtn.addEventListener('click', addData);
  els.dataNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addData();
  });

  els.addIdeaBtn.addEventListener('click', addIdea);

  els.connectBtn.addEventListener('click', () => {
    connectMode = !connectMode;
    selectedForConnect = null;
    closeEditor();
    toast(connectMode ? '连线模式已开启' : '连线模式已关闭');
    render();
  });

  els.clearBtn.addEventListener('click', clearNormalIdeas);

  els.addTagBtn.addEventListener('click', addTag);
  els.tagNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTag();
  });

  els.editorDrawer.addEventListener('pointerdown', keepEditorEditable);
  els.ideaTitleInput.addEventListener('pointerdown', keepEditorEditable);
  els.ideaTitleInput.addEventListener('click', keepEditorEditable);
  els.ideaContentEditor.addEventListener('pointerdown', (e) => {
    keepEditorEditable(e);
    requestAnimationFrame(() => {
      els.ideaContentEditor.focus({ preventScroll: true });
    });
  });
  els.ideaContentEditor.addEventListener('click', (e) => {
    keepEditorEditable(e);
    requestAnimationFrame(() => {
      els.ideaContentEditor.focus({ preventScroll: true });
    });
  });
  els.ideaContentEditor.addEventListener('keydown', keepEditorEditable);
  els.ideaContentEditor.addEventListener('input', keepEditorEditable);
  els.ideaContentEditor.addEventListener('paste', handleEditorPaste);

  els.closeEditorBtn.addEventListener('click', closeEditor);
  els.saveIdeaBtn.addEventListener('click', saveIdeaFromEditor);
  els.deleteIdeaBtn.addEventListener('click', deleteIdea);

  els.drawerRatingOptions.addEventListener('click', (e) => {
    const button = e.target.closest('[data-rating]');
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const idea = state.ideas.find(item => item.id === editingIdeaId);
    if (!idea) return;

    const selectedRating = normalizeRating(button.dataset.rating);
    const nextRating = getIdeaRating(idea) === selectedRating ? 'none' : selectedRating;
    setIdeaRating(idea, nextRating);
    idea.updatedAt = Date.now();
    updateDataTime();

    renderEditorRatingOptions(idea);
    refreshIdeaBlockRatingOnly(idea);
    saveState();
    toast(ratingToastText(nextRating));
  });

  document.querySelectorAll('.editor-toolbar button').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = btn.dataset.cmd;
      const value = btn.dataset.value || null;
      els.ideaContentEditor.focus();
      document.execCommand(cmd, false, value);
    });
  });

  els.canvas.addEventListener('wheel', zoomCanvasByWheel, { passive: false });
  els.canvas.addEventListener('pointerdown', startCanvasPan);

  window.addEventListener('beforeunload', () => {
    if (!hydrated || !isValidStateShape(state)) return;

    clearTimeout(saveTimer);
    writeLocalBackupState();

    if (window.ideaStore?.saveSync) {
      try {
        const result = window.ideaStore.saveSync(state);
        if (!result?.ok) {
          console.error('Synchronous disk save failed:', result?.message || result);
        }
      } catch (error) {
        console.error('Synchronous disk save failed:', error);
      }
    }
  });

  window.addEventListener('resize', drawConnectionsLive);
}
