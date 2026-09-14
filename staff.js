/**
 * staff.js — drives staff.html (the canteen staff dashboard)
 */
(function () {
  const { STATUS } = Store;
  let state = Store.loadState();
  let activeFilter = 'new';
  let toastTimer = null;

  function showToast(text) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  const screens = document.querySelectorAll('.screen');
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(b => b.addEventListener('click', () => {
    render();
    screens.forEach(s => s.classList.toggle('active', s.id === 'screen-' + b.dataset.screen));
    navBtns.forEach(nb => nb.classList.toggle('active', nb === b));
    window.scrollTo(0, 0);
  }));

  // ---------------------------------------------------------------
  // Canteen open/closed toggle
  // ---------------------------------------------------------------
  document.getElementById('canteen-toggle-btn').addEventListener('click', () => {
    state = Store.loadState();
    state.canteenOpen = !state.canteenOpen;
    Store.saveState(state);
    showToast(state.canteenOpen ? 'Canteen marked Open.' : 'Canteen marked Closed.');
    render();
  });

  // ---------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------
  document.getElementById('staff-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.category-tab');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    [...document.getElementById('staff-filters').children].forEach(c => c.classList.toggle('active', c === btn));
    render();
  });

  function groupOf(order) {
    if (order.status === STATUS.RECEIVED || order.status === STATUS.ACCEPTED) return 'new';
    if (order.status === STATUS.PREPARING) return 'preparing';
    if (order.status === STATUS.READY) return 'ready';
    return 'completed';
  }

  function isToday(iso) {
    const d = new Date(iso), n = new Date();
    return d.toDateString() === n.toDateString();
  }

  // ---------------------------------------------------------------
  // Summary cards
  // ---------------------------------------------------------------
  function renderSummary() {
    const orders = state.orders;
    document.getElementById('sum-new').textContent = orders.filter(o => groupOf(o) === 'new').length;
    document.getElementById('sum-preparing').textContent = orders.filter(o => groupOf(o) === 'preparing').length;
    document.getElementById('sum-ready').textContent = orders.filter(o => groupOf(o) === 'ready').length;
    document.getElementById('sum-completed').textContent = orders.filter(o => o.status === STATUS.COMPLETED && o.completedTime && isToday(o.completedTime)).length;

    const pill = document.getElementById('canteen-toggle-btn');
    pill.classList.toggle('open', state.canteenOpen);
    pill.classList.toggle('closed', !state.canteenOpen);
    pill.innerHTML = `<span class="status-dot"></span>${state.canteenOpen ? 'Open' : 'Closed'}`;
  }

  // ---------------------------------------------------------------
  // Order queue cards
  // ---------------------------------------------------------------
  const STATUS_CLASS = {
    [STATUS.RECEIVED]: 'st-new',
    [STATUS.ACCEPTED]: 'st-accepted',
    [STATUS.PREPARING]: 'st-preparing',
    [STATUS.READY]: 'st-ready',
    [STATUS.COMPLETED]: 'st-completed',
  };

  const NEXT_ACTION = {
    [STATUS.RECEIVED]: { label: 'Accept Order', cls: 'a-accept', next: STATUS.ACCEPTED },
    [STATUS.ACCEPTED]: { label: 'Start Preparing', cls: 'a-prepare', next: STATUS.PREPARING },
    [STATUS.PREPARING]: { label: 'Mark Ready', cls: 'a-ready', next: STATUS.READY },
    [STATUS.READY]: { label: 'Mark Collected', cls: 'a-collect', next: STATUS.COMPLETED },
  };

  function orderCardHtml(order) {
    const action = NEXT_ACTION[order.status];
    const cls = STATUS_CLASS[order.status];
    return `
    <div class="card order-queue-card ${cls}" data-id="${order.id}">
      <div class="oq-top">
        <div>
          <div class="oq-token">${order.tokenNumber}</div>
          <div class="oq-time">${Store.escapeHtml(order.studentName)} · ${new Date(order.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <span class="oq-status-tag ${cls}">${order.status}</span>
      </div>
      <div class="oq-items">
        ${order.items.map(i => `<div><span class="q">${i.qty}×</span>${i.name}</div>`).join('')}
      </div>
      <div class="oq-bottom">
        <span class="oq-total">₹${order.totalPrice}</span>
        ${action ? `<button class="oq-action ${action.cls}" data-act="advance">${action.label}</button>` : ''}
      </div>
    </div>`;
  }

  function renderDailySummary() {
    const wrap = document.getElementById('daily-summary-wrap');
    if (activeFilter !== 'completed') { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    const completedToday = state.orders.filter(o => o.status === STATUS.COMPLETED && o.completedTime && isToday(o.completedTime));
    const ordersToday = state.orders.filter(o => isToday(o.orderTime));
    let avgPrep = '—';
    if (completedToday.length) {
      const totalMin = completedToday.reduce((sum, o) => sum + (new Date(o.completedTime) - new Date(o.orderTime)) / 60000, 0);
      avgPrep = Math.round(totalMin / completedToday.length) + ' min';
    }
    wrap.innerHTML = `
      <div class="card staff-daily-summary">
        <div class="dsum-row"><span>Orders today</span><span class="v">${ordersToday.length}</span></div>
        <div class="dsum-row"><span>Completed today</span><span class="v">${completedToday.length}</span></div>
        <div class="dsum-row"><span>Average preparation time</span><span class="v">${avgPrep}</span></div>
        <div class="mock-tag">Prototype data — calculated from this browser's demo orders only, not a real production report.</div>
      </div>`;
  }

  function renderQueue() {
    renderDailySummary();
    const orders = state.orders
      .filter(o => groupOf(o) === activeFilter)
      .sort((a, b) => new Date(a.orderTime) - new Date(b.orderTime));
    const list = document.getElementById('queue-list');
    if (orders.length === 0) {
      list.innerHTML = `<p class="muted small" style="text-align:center; padding:30px 0;">No ${activeFilter} orders right now.</p>`;
      return;
    }
    list.innerHTML = orders.map(orderCardHtml).join('');
  }

  document.getElementById('queue-list').addEventListener('click', (e) => {
    if (e.target.dataset.act !== 'advance') return;
    const id = e.target.closest('.order-queue-card').dataset.id;
    state = Store.loadState();
    const order = state.orders.find(o => o.id === id);
    if (!order) return;
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    order.status = action.next;
    if (order.status === STATUS.COMPLETED) order.completedTime = new Date().toISOString();
    Store.saveState(state);
    showToast(`${order.tokenNumber} → ${order.status}`);
    render();
  });

  // ---------------------------------------------------------------
  // Availability management
  // ---------------------------------------------------------------
  function availRowHtml(item) {
    return `
    <div class="card avail-row" data-id="${item.id}">
      <div class="food-emoji">${item.emoji}</div>
      <div class="avail-info">
        <div class="avail-name">${item.name}</div>
        <input type="number" class="avail-price-input" data-act="price" value="${item.price}">
      </div>
      <button class="toggle ${item.available ? 'on' : ''}" data-act="toggle" aria-label="Toggle availability">
        <span class="knob"></span>
      </button>
    </div>`;
  }

  function renderAvailability() {
    document.getElementById('availability-list').innerHTML = state.menu.map(availRowHtml).join('');
  }

  document.getElementById('availability-list').addEventListener('click', (e) => {
    if (e.target.dataset.act !== 'toggle') return;
    const id = e.target.closest('.avail-row').dataset.id;
    state = Store.loadState();
    const item = state.menu.find(m => m.id === id);
    if (!item) return;
    item.available = !item.available;
    Store.saveState(state);
    showToast(`${item.name} marked ${item.available ? 'Available' : 'Sold Out'}.`);
    render();
  });

  document.getElementById('availability-list').addEventListener('change', (e) => {
    if (e.target.dataset.act !== 'price') return;
    const id = e.target.closest('.avail-row').dataset.id;
    const price = parseInt(e.target.value, 10);
    if (isNaN(price) || price < 0) return;
    state = Store.loadState();
    const item = state.menu.find(m => m.id === id);
    if (!item) return;
    item.price = price;
    Store.saveState(state);
    showToast(`${item.name} price updated to ₹${price}.`);
  });

  document.getElementById('btn-add-item').addEventListener('click', () => {
    const name = document.getElementById('new-item-name').value.trim();
    const category = document.getElementById('new-item-cat').value;
    const price = parseInt(document.getElementById('new-item-price').value, 10);
    if (!name || isNaN(price) || price <= 0) {
      showToast('Enter a name and a valid price.');
      return;
    }
    state = Store.loadState();
    state.menu.push({
      id: 'f' + Date.now(),
      name, category, price, available: true,
      desc: 'Added by staff', prepMin: 6, emoji: '🍴',
    });
    Store.saveState(state);
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-price').value = '';
    showToast(`${name} added to the menu.`);
    render();
  });

  // ---------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------
  function renderFeedback() {
    const rated = state.orders.filter(o => o.feedback).sort((a, b) => new Date(b.feedback.submittedAt) - new Date(a.feedback.submittedAt));
    const summary = document.getElementById('rating-summary');
    if (rated.length === 0) {
      summary.innerHTML = `<div class="sub">No feedback submitted yet.</div>`;
    } else {
      const avg = rated.reduce((s, o) => s + o.feedback.rating, 0) / rated.length;
      const rounded = Math.round(avg);
      summary.innerHTML = `
        <div class="big-num">${avg.toFixed(1)}</div>
        <div class="big-stars">${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}</div>
        <div class="sub">from ${rated.length} order${rated.length === 1 ? '' : 's'}</div>`;
    }

    const list = document.getElementById('feedback-list');
    if (rated.length === 0) {
      list.innerHTML = '<p class="muted small">Ratings will show up here once students start collecting orders.</p>';
      return;
    }
    list.innerHTML = rated.map(o => `
      <div class="card feedback-card">
        <div class="feedback-top">
          <span class="oq-token" style="font-size:13.5px;">${o.tokenNumber}</span>
          <span class="feedback-stars">${'★'.repeat(o.feedback.rating)}${'☆'.repeat(5 - o.feedback.rating)}</span>
        </div>
        ${o.feedback.comment ? `<div class="feedback-comment">"${Store.escapeHtml(o.feedback.comment)}"</div>` : ''}
        <div class="feedback-meta">${Store.escapeHtml(o.studentName)} · ${new Date(o.feedback.submittedAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}</div>
      </div>`).join('');
  }

  // ---------------------------------------------------------------
  window.addEventListener('canteengo:update', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('pageshow', render);
  function render() {
    state = Store.loadState();
    renderSummary();
    renderQueue();
    renderAvailability();
    renderFeedback();
  }
  render();
})();
