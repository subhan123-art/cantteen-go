/**
 * data.js — Canteen Go shared data layer
 * ----------------------------------------------------------------
 * This is a MOCK backend for the prototype. Both the student app
 * (index.html) and the staff dashboard (staff.html) read/write the
 * same object, persisted in the browser's localStorage under one key.
 *
 * Why localStorage instead of a server?
 * The brief asks for a demo that runs without a real backend. Storing
 * state here lets the student and staff screens (opened as two tabs
 * on the same device/browser) reflect the same orders live, using the
 * browser's built-in "storage" event to notice when the other tab
 * changed something. This is a STAND-IN for a real database + API —
 * see the README for what changes when a real backend is added.
 * ----------------------------------------------------------------
 */

const STORAGE_KEY = 'canteenGoState_v1';

// Order lifecycle, in order. Every order moves left -> right, never backwards.
const STATUS = {
  RECEIVED: 'Order Received',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready for Pickup',
  COMPLETED: 'Completed',
};
const STATUS_ORDER = [STATUS.RECEIVED, STATUS.ACCEPTED, STATUS.PREPARING, STATUS.READY, STATUS.COMPLETED];

// Starter menu. Staff can edit/add/remove items from the Availability screen.
const DEFAULT_MENU = [
  { id: 'f1', name: 'Veg Samosa',       category: 'Snacks', price: 20, available: true,  desc: 'Crispy pastry, spiced potato filling', prepMin: 4,  emoji: '🥟' },
  { id: 'f2', name: 'Chicken Puff',     category: 'Snacks', price: 35, available: true,  desc: 'Flaky puff, spiced chicken filling',   prepMin: 4,  emoji: '🥐' },
  { id: 'f3', name: 'Masala Chowmein',  category: 'Meals',  price: 60, available: true,  desc: 'Stir-fried noodles with veg & spice',  prepMin: 10, emoji: '🍜' },
  { id: 'f4', name: 'Veg Thali',        category: 'Meals',  price: 80, available: true,  desc: 'Rice, dal, sabzi, roti, salad',        prepMin: 12, emoji: '🍛' },
  { id: 'f5', name: 'Classic Burger',   category: 'Meals',  price: 55, available: true,  desc: 'Grilled patty, cheese, veggies',       prepMin: 9,  emoji: '🍔' },
  { id: 'f6', name: 'Masala Tea',       category: 'Drinks', price: 15, available: true,  desc: 'Hot spiced milk tea',                  prepMin: 3,  emoji: '☕' },
  { id: 'f7', name: 'Cold Coffee',      category: 'Drinks', price: 40, available: true,  desc: 'Chilled coffee with whipped cream',    prepMin: 5,  emoji: '🧊' },
  { id: 'f8', name: 'Fresh Lime Soda',  category: 'Drinks', price: 25, available: false, desc: 'Sweet & tangy, served chilled',        prepMin: 3,  emoji: '🥤' },
];

function defaultState() {
  return {
    canteenOpen: true,
    menu: DEFAULT_MENU,
    orders: [],
    nextTokenNum: 27, // starts mid-sequence so the demo looks like a real busy day
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Canteen Go: could not read saved state, starting fresh.', e);
  }
  const fresh = defaultState();
  saveState(fresh);
  return fresh;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // The native "storage" event only fires in OTHER tabs, not this one,
  // so we also fire a custom event to refresh the current tab's own UI.
  window.dispatchEvent(new CustomEvent('canteengo:update'));
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatToken(num) {
  return 'CG-' + String(num).padStart(3, '0');
}

// Rough, explicitly-approximate prep estimate. Real logic would account
// for kitchen capacity, item complexity, and staff availability.
function estimateMinutes(state, items) {
  const ownPrep = Math.max(...items.map(i => i.prepMin), 3);
  const ordersAhead = state.orders.filter(o =>
    o.status !== STATUS.READY && o.status !== STATUS.COMPLETED
  ).length;
  return ownPrep + ordersAhead * 3;
}

function ordersAheadOf(state, order) {
  return state.orders.filter(o =>
    o.id !== order.id &&
    o.orderTime < order.orderTime &&
    o.status !== STATUS.READY &&
    o.status !== STATUS.COMPLETED
  ).length;
}

const Store = { STORAGE_KEY, STATUS, STATUS_ORDER, defaultState, loadState, saveState, formatToken, estimateMinutes, ordersAheadOf, escapeHtml };

// Any other open tab (staff dashboard while a student tab is open, or
// vice versa) should re-render when state changes.
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) window.dispatchEvent(new CustomEvent('canteengo:update'));
});
