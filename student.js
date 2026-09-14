/**
 * student.js — drives index.html (the student-facing app)
 */
(function () {
  const { STATUS, STATUS_ORDER } = Store;
  const NAME_KEY = 'canteenGo_studentName';

  let state = Store.loadState();
  let cart = {};              // { foodId: qty }
  let activeCategory = 'All';
  let toastTimer = null;

  const studentName = () => localStorage.getItem(NAME_KEY) || '';

  // ---------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------
  const screens = document.querySelectorAll('.screen');
  const navBtns = document.querySelectorAll('.nav-btn');

  function goTo(name) {
    render(); // always pull the latest saved state before showing a screen
    screens.forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === name));
    window.scrollTo(0, 0);
  }
  navBtns.forEach(b => b.addEventListener('click', () => goTo(b.dataset.screen)));
  document.getElementById('btn-order-now').addEventListener('click', () => goTo('menu'));

  // ---------------------------------------------------------------
  // Profile / name capture
  // ---------------------------------------------------------------
  const profileModal = document.getElementById('profile-modal');
  document.getElementById('btn-profile').addEventListener('click', () => {
    document.getElementById('student-name-input').value = studentName();
    profileModal.classList.add('show');
  });
  document.getElementById('btn-save-name').addEventListener('click', () => {
    const val = document.getElementById('student-name-input').value.trim();
    if (val) localStorage.setItem(NAME_KEY, val);
    profileModal.classList.remove('show');
    render();
  });
  if (!studentName()) {
    // First launch: ask once, non-blocking (defaults to "Guest" if skipped).
    setTimeout(() => { document.getElementById('btn-profile').click(); }, 400);
  }

  // ---------------------------------------------------------------
  // Toast notifications (in-app, since real push isn't possible here)
  // ---------------------------------------------------------------
  function showToast(text) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ---------------------------------------------------------------
  // Menu rendering
  // ---------------------------------------------------------------
  const categoryTabs = document.getElementById('category-tabs');
  categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-tab');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    [...categoryTabs.children].forEach(c => c.classList.toggle('active', c === btn));
    renderMenu();
  });

  function foodCardHtml(item) {
    const soldOut = !item.available;
    const qty = cart[item.id] || 0;
    return `
    <div class="card food-card ${soldOut ? 'sold-out' : ''}" data-id="${item.id}">
      <div class="food-emoji">${item.emoji}</div>
      <div class="food-info">
        <div class="food-name-row">
          <div class="food-name">${item.name}</div>
          <div class="food-price">₹${item.price}</div>
        </div>
        <div class="food-desc">${item.desc}</div>
        <div class="food-footer">
          ${soldOut ? '<span class="sold-out-badge">SOLD OUT</span>' : `
            <div class="qty-control">
              <button class="qty-btn" data-act="dec">−</button>
              <span class="qty-val">${qty}</span>
              <button class="qty-btn" data-act="inc">+</button>
            </div>
            <button class="add-btn ${qty > 0 ? 'added' : ''}" data-act="add">${qty > 0 ? 'In cart' : 'Add to Cart'}</button>
          `}
        </div>
      </div>
    </div>`;
  }

  function renderMenu() {
    const list = document.getElementById('menu-list');
    const items = state.menu.filter(m => activeCategory === 'All' || m.category === activeCategory);
    list.innerHTML = items.map(foodCardHtml).join('') || '<p class="muted small">No items in this category.</p>';
  }

  document.getElementById('menu-list').addEventListener('click', (e) => {
    const card = e.target.closest('.food-card');
    if (!card) return;
    const id = card.dataset.id;
    const item = state.menu.find(m => m.id === id);
    if (!item || !item.available) return;
    const act = e.target.dataset.act;
    if (act === 'inc' || act === 'add') cart[id] = (cart[id] || 0) + 1;
    if (act === 'dec') cart[id] = Math.max(0, (cart[id] || 0) - 1);
    if (cart[id] === 0) delete cart[id];
    renderMenu();
    renderCart();
    renderCartBadge();
  });

  function renderPopular() {
    const items = state.menu.filter(m => m.available).slice(0, 5);
    document.getElementById('popular-row').innerHTML = items.map(i => `
      <div class="card popular-item">
        <div class="emoji">${i.emoji}</div>
        <div class="name">${i.name}</div>
        <div class="price">₹${i.price}</div>
      </div>`).join('');
  }

  // ---------------------------------------------------------------
  // Cart screen
  // ---------------------------------------------------------------
  function cartLines() {
    return Object.entries(cart).map(([id, qty]) => {
      const item = state.menu.find(m => m.id === id);
      return item ? { item, qty } : null;
    }).filter(Boolean);
  }

  function cartTotal(lines) {
    return lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);
  }

  function renderCart() {
    const lines = cartLines();
    const empty = document.getElementById('cart-empty');
    const itemsCard = document.getElementById('cart-items-card');
    const summaryCard = document.getElementById('cart-summary-card');
    const reviewBtn = document.getElementById('btn-review-order');

    if (lines.length === 0) {
      empty.classList.remove('hidden');
      itemsCard.classList.add('hidden');
      summaryCard.classList.add('hidden');
      reviewBtn.setAttribute('disabled', 'true');
      return;
    }
    empty.classList.add('hidden');
    itemsCard.classList.remove('hidden');
    summaryCard.classList.remove('hidden');
    reviewBtn.removeAttribute('disabled');

    itemsCard.innerHTML = lines.map(({ item, qty }) => `
      <div class="cart-item" data-id="${item.id}">
        <div class="food-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-unit">₹${item.price} × ${qty}</div>
        </div>
        <div class="cart-item-total">₹${item.price * qty}</div>
        <button class="remove-btn" data-act="remove">✕</button>
      </div>`).join('');

    const total = cartTotal(lines);
    document.getElementById('cart-subtotal').textContent = '₹' + total;
    document.getElementById('cart-total').textContent = '₹' + total;
  }

  document.getElementById('cart-items-card').addEventListener('click', (e) => {
    if (e.target.dataset.act !== 'remove') return;
    const id = e.target.closest('.cart-item').dataset.id;
    delete cart[id];
    renderCart();
    renderCartBadge();
    renderMenu();
  });

  function renderCartBadge() {
    const count = Object.values(cart).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('cart-badge');
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }

  // ---------------------------------------------------------------
  // Review modal -> confirm order -> token generation
  // ---------------------------------------------------------------
  const reviewModal = document.getElementById('review-modal');
  document.getElementById('btn-review-order').addEventListener('click', () => {
    const lines = cartLines();
    if (lines.length === 0) return;
    const total = cartTotal(lines);
    const eta = Store.estimateMinutes(state, lines.map(l => l.item));
    document.getElementById('review-items').innerHTML = lines.map(({ item, qty }) =>
      `<div class="summary-row"><span>${qty} × ${item.name}</span><span class="val">₹${item.price * qty}</span></div>`
    ).join('');
    document.getElementById('review-total').textContent = '₹' + total;
    document.getElementById('review-eta').textContent = eta + ' min';
    reviewModal.classList.add('show');
  });
  document.getElementById('btn-cancel-review').addEventListener('click', () => reviewModal.classList.remove('show'));

  document.getElementById('btn-confirm-order').addEventListener('click', () => {
    const lines = cartLines();
    if (lines.length === 0) return;
    state = Store.loadState(); // pull latest before writing, in case staff changed something
    const tokenNum = state.nextTokenNum;
    const total = cartTotal(lines);
    const orderItems = lines.map(({ item, qty }) => ({ id: item.id, name: item.name, price: item.price, qty, prepMin: item.prepMin }));
    const eta = Store.estimateMinutes(state, lines.map(l => l.item));

    const order = {
      id: 'o_' + Date.now(),
      tokenNumber: Store.formatToken(tokenNum),
      studentName: studentName() || 'Guest',
      items: orderItems,
      totalPrice: total,
      orderTime: new Date().toISOString(),
      status: STATUS.RECEIVED,
      estimatedPreparationTime: eta,
      completedTime: null,
      feedback: null, // { rating: 1-5, comment, submittedAt } — set after pickup
    };

    state.orders.push(order);
    state.nextTokenNum += 1;
    Store.saveState(state);

    cart = {};
    renderCartBadge();
    reviewModal.classList.remove('show');
    showToast(`Order ${order.tokenNumber} received.`);
    goTo('orders');
    render();
  });

  // ---------------------------------------------------------------
  // Orders screen: active ticket + history
  // ---------------------------------------------------------------
  function myOrders() {
    const name = studentName() || 'Guest';
    return state.orders.filter(o => o.studentName === name).sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
  }

  function activeOrder() {
    return myOrders().find(o => o.status !== STATUS.COMPLETED);
  }

  const STEP_ICONS = { done: '✓', current: '' };

  function renderTicket() {
    const order = activeOrder();
    const wrap = document.getElementById('active-ticket-wrap');
    const noOrder = document.getElementById('no-order-state');
    const homeActive = document.getElementById('home-active-order');

    if (!order) {
      wrap.classList.add('hidden');
      noOrder.classList.remove('hidden');
      homeActive.classList.add('hidden');
      return;
    }
    noOrder.classList.add('hidden');
    wrap.classList.remove('hidden');

    document.getElementById('ticket-token').textContent = order.tokenNumber;
    document.getElementById('ticket-status-badge').textContent = order.status;
    document.getElementById('ticket-order-time').textContent = new Date(order.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('ticket-ahead').textContent = Store.ordersAheadOf(state, order);
    document.getElementById('ticket-eta').textContent = order.status === STATUS.READY ? 'Ready now' : order.estimatedPreparationTime + ' min';

    document.getElementById('ticket-items').innerHTML = order.items.map(i =>
      `<div class="small" style="padding:3px 0;">${i.qty} × ${i.name}</div>`
    ).join('');

    const currentIdx = STATUS_ORDER.indexOf(order.status);
    document.getElementById('ticket-stepper').innerHTML = STATUS_ORDER.map((s, idx) => {
      const cls = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : '';
      const connector = idx > 0 ? `<div class="step-connector ${idx <= currentIdx ? 'done' : ''}" style="margin-left:12px;"></div>` : '';
      return `${connector}<div class="step ${cls}"><div class="step-icon">${idx < currentIdx ? '✓' : ''}</div><div class="step-label">${s}</div></div>`;
    }).join('');

    const collectBtn = document.getElementById('btn-mark-collected');
    if (order.status === STATUS.READY) {
      collectBtn.removeAttribute('disabled');
      collectBtn.textContent = 'Mark as Collected';
    } else {
      collectBtn.setAttribute('disabled', 'true');
      collectBtn.textContent = order.status === STATUS.COMPLETED ? 'Collected ✓' : 'Available once your order is ready';
    }
    collectBtn.onclick = () => {
      if (order.status !== STATUS.READY) return;
      state = Store.loadState();
      const fresh = state.orders.find(o => o.id === order.id);
      if (fresh) {
        fresh.status = STATUS.COMPLETED;
        fresh.completedTime = new Date().toISOString();
        Store.saveState(state);
        showToast(`Enjoy your meal! ${fresh.tokenNumber} marked collected.`);
        render();
        openFeedbackModal(fresh.id);
      }
    };

    // Home banner
    homeActive.classList.remove('hidden');
    document.getElementById('home-active-token').textContent = order.tokenNumber;
    document.getElementById('home-active-status').textContent = order.status + ' →';
  }

  function renderHistory() {
    const past = myOrders().filter(o => o.status === STATUS.COMPLETED);
    const list = document.getElementById('history-list');
    if (past.length === 0) {
      list.innerHTML = '<p class="muted small">No completed orders yet.</p>';
      return;
    }
    list.innerHTML = past.map(o => `
      <div class="card history-card">
        <div class="history-top">
          <span class="history-token">${o.tokenNumber}</span>
          <span class="history-when">${new Date(o.orderTime).toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${new Date(o.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="history-items">${o.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</div>
        <div class="history-bottom">
          <span class="history-total">₹${o.totalPrice}</span>
          <span class="badge completed">Completed</span>
        </div>
        <div class="history-feedback-row">
          ${o.feedback
            ? `<span class="given-stars">${'★'.repeat(o.feedback.rating)}${'☆'.repeat(5 - o.feedback.rating)}</span><span class="small muted">Thanks for rating this order</span>`
            : `<button class="cta-btn ghost rate-btn" data-act="rate" data-id="${o.id}" style="padding:8px; margin-top:0;">Rate this order</button>`}
        </div>
      </div>`).join('');
  }

  document.getElementById('history-list').addEventListener('click', (e) => {
    if (e.target.dataset.act !== 'rate') return;
    openFeedbackModal(e.target.dataset.id);
  });

  // ---------------------------------------------------------------
  // Feedback modal
  // ---------------------------------------------------------------
  const feedbackModal = document.getElementById('feedback-modal');
  const starButtons = [...document.querySelectorAll('#feedback-stars .star')];
  let feedbackOrderId = null;
  let selectedRating = 0;

  function paintStars(val) {
    starButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.val) <= val));
  }

  function openFeedbackModal(orderId) {
    feedbackOrderId = orderId;
    selectedRating = 0;
    paintStars(0);
    document.getElementById('feedback-comment').value = '';
    const order = state.orders.find(o => o.id === orderId);
    document.getElementById('feedback-token').textContent = order ? order.tokenNumber : '';
    feedbackModal.classList.add('show');
  }

  document.getElementById('feedback-stars').addEventListener('click', (e) => {
    const btn = e.target.closest('.star');
    if (!btn) return;
    selectedRating = Number(btn.dataset.val);
    paintStars(selectedRating);
  });

  document.getElementById('btn-skip-feedback').addEventListener('click', () => {
    feedbackModal.classList.remove('show');
  });

  document.getElementById('btn-submit-feedback').addEventListener('click', () => {
    if (selectedRating === 0) {
      showToast('Pick at least one star, or tap Skip.');
      return;
    }
    state = Store.loadState();
    const order = state.orders.find(o => o.id === feedbackOrderId);
    if (order) {
      order.feedback = {
        rating: selectedRating,
        comment: document.getElementById('feedback-comment').value.trim(),
        submittedAt: new Date().toISOString(),
      };
      Store.saveState(state);
      showToast('Thanks for your feedback!');
    }
    feedbackModal.classList.remove('show');
    render();
  });

  // ---------------------------------------------------------------
  // Header status pill + home queue stats
  // ---------------------------------------------------------------
  function renderHeader() {
    const pill = document.getElementById('canteen-status-pill');
    pill.classList.toggle('open', state.canteenOpen);
    pill.classList.toggle('closed', !state.canteenOpen);
    pill.innerHTML = `<span class="status-dot"></span>${state.canteenOpen ? 'Open' : 'Closed'}`;

    const name = studentName();
    document.getElementById('welcome-msg').textContent = name ? `Hey, ${name.split(' ')[0]} 👋` : 'Hey there 👋';

    const activeCount = state.orders.filter(o => o.status !== STATUS.COMPLETED).length;
    document.getElementById('home-queue-len').textContent = activeCount;
    document.getElementById('home-wait-est').textContent = '~' + (5 + activeCount * 2) + ' min';
  }

  // ---------------------------------------------------------------
  // Master render + change tracking so we only toast on real status changes
  // ---------------------------------------------------------------
  let lastKnownStatuses = {};

  function checkForStatusNotifications() {
    const order = activeOrder();
    if (!order) return;
    const prev = lastKnownStatuses[order.id];
    if (prev && prev !== order.status) {
      if (order.status === STATUS.PREPARING) showToast(`Your order ${order.tokenNumber} is being prepared.`);
      if (order.status === STATUS.READY) showToast(`Your order ${order.tokenNumber} is ready for pickup!`);
      if (order.status === STATUS.ACCEPTED) showToast(`Your order ${order.tokenNumber} was accepted.`);
    }
    lastKnownStatuses[order.id] = order.status;
  }

  function render() {
    state = Store.loadState();
    checkForStatusNotifications();
    renderHeader();
    renderPopular();
    renderMenu();
    renderCart();
    renderTicket();
    renderHistory();
  }

  window.addEventListener('canteengo:update', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('pageshow', render);
  render();
})();
