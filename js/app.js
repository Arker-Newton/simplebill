/* ============================================
   SimpleBill — App Logic
   ============================================ */

// ====== State ======
let state = {
  template: 'modern',
  currency: 'USD',
  taxRate: 0,
  fromName: '',
  fromEmail: '',
  fromPhone: '',
  fromAddress: '',
  toName: '',
  toEmail: '',
  toAddress: '',
  invNumber: 'INV-001',
  invDate: '',
  invDueDate: '',
  items: [
    { description: 'Web Development Services', quantity: 1, rate: 0 },
    { description: '', quantity: 1, rate: 0 }
  ],
  notes: '',
  terms: 'Payment is due within 30 days. Thank you for your business.'
};

const CURRENCY_MAP = {
  USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥', CAD: 'C$', AUD: 'A$'
};

// ====== Initialization ======
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  setDefaults();
  renderItems();
  renderPreview();
});

function setDefaults() {
  if (!state.invDate) {
    const d = new Date();
    state.invDate = d.toISOString().split('T')[0];
    state.invDueDate = new Date(d.getTime() + 30*24*60*60*1000).toISOString().split('T')[0];
  }
}

// ====== Template ======
function setTemplate(name) {
  state.template = name;
  document.querySelectorAll('.template-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.template === name);
  });
  saveToStorage();
  renderPreview();
}

// ====== Items ======
function addItem() {
  state.items.push({ description: '', quantity: 1, rate: 0 });
  renderItems();
  renderPreview();
  saveToStorage();
}

function removeItem(index) {
  if (state.items.length <= 1) return;
  state.items.splice(index, 1);
  renderItems();
  renderPreview();
  saveToStorage();
}

function updateItem(index, field, value) {
  state.items[index][field] = field === 'description' ? value : parseFloat(value) || 0;
  renderPreview();
  saveToStorage();
}

function renderItems() {
  const container = document.getElementById('itemsContainer');
  container.innerHTML = state.items.map((item, i) => `
    <div class="item-row">
      <input class="input item-desc" type="text" placeholder="Description of service/product"
        value="${escHtml(item.description)}"
        oninput="updateItem(${i}, 'description', this.value)">
      <input class="input item-qty" type="number" placeholder="Qty" min="0" step="1"
        value="${item.quantity}"
        oninput="updateItem(${i}, 'quantity', this.value)">
      <input class="input item-rate" type="number" placeholder="Rate" min="0" step="0.01"
        value="${item.rate}"
        oninput="updateItem(${i}, 'rate', this.value)">
      <div class="item-amount">${formatMoney(item.quantity * item.rate)}</div>
      <button class="item-del" onclick="removeItem(${i})" title="Remove item">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

// ====== Form -> State binding ======
function bindForm() {
  const map = {
    currency: 'currency',
    taxRate: v => parseFloat(v) || 0,
    fromName: v=>v, fromEmail: v=>v, fromPhone: v=>v, fromAddress: v=>v,
    toName: v=>v, toEmail: v=>v, toAddress: v=>v,
    invNumber: v=>v, invDate: v=>v, invDueDate: v=>v,
    notes: v=>v, terms: v=>v
  };
  for (const [id, fn] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) {
      const val = typeof fn === 'function' ? fn(el.value) : el.value;
      if (id === 'taxRate') state[id] = parseFloat(val) || 0;
      else state[id] = val;
    }
  }
  saveToStorage();
}

function syncFormFromState() {
  const fields = ['currency','taxRate','fromName','fromEmail','fromPhone','fromAddress',
    'toName','toEmail','toAddress','invNumber','invDate','invDueDate','notes','terms'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state[id] || '';
  });
  document.querySelectorAll('.template-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.template === state.template);
  });
}

// ====== Preview Render ======
function renderPreview() {
  // Sync form inputs -> state
  bindForm();

  const preview = document.getElementById('invoicePreview');
  const tpl = state.template;
  const curr = state.currency;
  const sym = CURRENCY_MAP[curr] || '$';
  const subtotal = state.items.reduce((s, it) => s + (it.quantity || 0) * (it.rate || 0), 0);
  const tax = subtotal * (parseFloat(state.taxRate) || 0) / 100;
  const total = subtotal + tax;

  preview.className = `invoice-page tpl-${tpl}`;

  const header = renderHeader(tpl, curr, sym);
  const addresses = renderAddresses(tpl);
  const table = renderTable(tpl, sym);
  const totals = renderTotals(tpl, sym, subtotal, tax, total);
  const footer = renderFooter(tpl);

  preview.innerHTML = header + addresses + table + totals + footer;
}

function renderHeader(tpl, curr, sym) {
  const num = escHtml(state.invNumber);
  const date = state.invDate;
  const due = state.invDueDate;
  const brand = escHtml(state.fromName || 'Your Company');

  if (tpl === 'modern') {
    return `
      <div class="inv-header">
        <div class="inv-brand">
          <h1><span>${escHtml(brand.split(' ')[0])}</span> ${escHtml(brand.split(' ').slice(1).join(' '))}</h1>
        </div>
        <div class="inv-title">
          <h2>INVOICE</h2>
          <div class="inv-meta">${escHtml(num)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:24px;font-size:0.78rem;color:var(--inv-muted);margin-top:-20px;margin-bottom:8px;">
        <span>Date: ${date || '—'}</span>
        <span>Due: ${due || '—'}</span>
      </div>`;
  }

  if (tpl === 'classic') {
    return `
      <div class="inv-header">
        <h1>INVOICE</h1>
        <div style="font-size:1rem;font-weight:600;margin-top:2px;">${escHtml(brand)}</div>
        <div class="inv-meta">${escHtml(num)} &nbsp;|&nbsp; Date: ${date || '—'} &nbsp;|&nbsp; Due: ${due || '—'}</div>
      </div>`;
  }

  // minimal
  return `
    <div class="inv-header">
      <div class="inv-brand">
        <h1>${escHtml(brand)}</h1>
      </div>
      <div class="inv-title">
        <h2>INVOICE</h2>
        <div style="font-size:0.75rem;color:var(--inv-muted);margin-top:4px;">${escHtml(num)}</div>
        <div style="font-size:0.75rem;color:var(--inv-muted);">${date || '—'} &nbsp;|&nbsp; Due: ${due || '—'}</div>
      </div>
    </div>`;
}

function renderAddresses(tpl) {
  const from = `
    <p><strong>${escHtml(state.fromName || 'Your Name')}</strong></p>
    <p>${escHtml(state.fromEmail || '')}</p>
    ${state.fromPhone ? `<p>${escHtml(state.fromPhone)}</p>` : ''}
    <p>${escHtml(state.fromAddress || '').replace(/\n/g, '<br>')}</p>`;
  
  const to = `
    <p><strong>${escHtml(state.toName || 'Client Name')}</strong></p>
    <p>${escHtml(state.toEmail || '')}</p>
    <p>${escHtml(state.toAddress || '').replace(/\n/g, '<br>')}</p>`;

  if (tpl === 'modern') {
    return `
      <div class="inv-addresses">
        <div class="inv-addr-block">
          <h3>From</h3>
          ${from}
        </div>
        <div class="inv-addr-block">
          <h3>To</h3>
          ${to}
        </div>
      </div>`;
  }
  if (tpl === 'classic') {
    return `
      <div class="inv-addresses">
        <div class="inv-addr-block">
          <h3>From</h3>
          ${from}
        </div>
        <div class="inv-addr-block">
          <h3>To</h3>
          ${to}
        </div>
      </div>`;
  }
  // minimal
  return `
    <div class="inv-addresses">
      <div class="inv-addr-block">
        <p><strong>FROM</strong>${from.replace(/<p><strong>/g, '<br>').replace(/<\/strong><\/p>/, '')}</p>
      </div>
      <div class="inv-addr-block">
        <p><strong>TO</strong>${to.replace(/<p><strong>/g, '<br>').replace(/<\/strong><\/p>/, '')}</p>
      </div>
    </div>`;
}

function renderTable(tpl, sym) {
  const hasItems = state.items.some(it => it.description);
  if (!hasItems) {
    return `<p style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.85rem;">
      Add line items in the form to see the invoice table.</p>`;
  }

  const rows = state.items.map(it => `
    <tr>
      <td>${escHtml(it.description || '—')}</td>
      <td>${it.quantity}</td>
      <td class="amt">${sym}${Number(it.rate).toFixed(2)}</td>
      <td class="amt">${sym}${(it.quantity * it.rate).toFixed(2)}</td>
    </tr>
  `).join('');

  if (tpl === 'modern') {
    return `
      <table class="inv-table">
        <thead><tr>
          <th style="width:45%">Description</th>
          <th style="width:10%">Qty</th>
          <th style="width:18%" class="amt">Rate</th>
          <th style="width:20%" class="amt">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
  if (tpl === 'classic') {
    return `
      <table class="inv-table">
        <thead><tr>
          <th style="width:45%">Description</th>
          <th style="width:10%">Qty</th>
          <th style="width:18%" class="amt">Rate</th>
          <th style="width:20%" class="amt">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
  // minimal
  return `
    <table class="inv-table">
      <thead><tr>
        <th style="width:45%">Description</th>
        <th style="width:10%">Qty</th>
        <th style="width:18%" class="amt">Rate</th>
        <th style="width:20%" class="amt">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderTotals(tpl, sym, subtotal, tax, total) {
  const taxLabel = parseFloat(state.taxRate) > 0 ? `Tax (${state.taxRate}%)` : 'Tax';

  return `
    <div class="inv-totals">
      <table>
        <tr><td>Subtotal</td><td>${sym}${subtotal.toFixed(2)}</td></tr>
        <tr><td>${taxLabel}</td><td>${sym}${tax.toFixed(2)}</td></tr>
        <tr class="total-row"><td><strong>Total</strong></td><td><strong>${sym}${total.toFixed(2)}</strong></td></tr>
      </table>
    </div>`;
}

function renderFooter(tpl) {
  let html = '';
  if (state.notes) {
    html += `<div><h4>Notes</h4><p>${escHtml(state.notes).replace(/\n/g, '<br>')}</p></div>`;
  }
  if (state.terms) {
    html += `<div><h4>Terms</h4><p>${escHtml(state.terms).replace(/\n/g, '<br>')}</p></div>`;
  }
  if (!html) return '';
  return `<div class="inv-footer">${html}</div>`;
}

// ====== Actions ======
function handlePrint() {
  window.print();
}

function handleNew() {
  if (!confirm('Start a new invoice? Current data will be saved.')) return;
  handleSave(); // save current first
  localStorage.removeItem('simplebill_state');
  state = {
    template: 'modern', currency: 'USD', taxRate: 0,
    fromName: '', fromEmail: '', fromPhone: '', fromAddress: '',
    toName: '', toEmail: '', toAddress: '',
    invNumber: 'INV-001',
    invDate: new Date().toISOString().split('T')[0],
    invDueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, rate: 0 }, { description: '', quantity: 1, rate: 0 }],
    notes: '',
    terms: 'Payment is due within 30 days. Thank you for your business.'
  };
  syncFormFromState();
  renderItems();
  renderPreview();
  showToast('New invoice started');
}

function handleSave() {
  bindForm();
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${state.invNumber || 'draft'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Invoice saved as JSON');
}

function handleLoad() {
  document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      // Validate basic structure
      if (data.items && Array.isArray(data.items)) {
        state = data;
        syncFormFromState();
        renderItems();
        renderPreview();
        saveToStorage();
        showToast('Invoice loaded successfully');
      } else {
        showToast('Invalid invoice file');
      }
    } catch (err) {
      showToast('Error loading file: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ====== Persistence ======
function saveToStorage() {
  try {
    localStorage.setItem('simplebill_state', JSON.stringify(state));
  } catch (e) {/* storage full, ignore */}
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('simplebill_state');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.items && Array.isArray(data.items)) {
        state = Object.assign(state, data);
        syncFormFromState();
        renderItems();
        return;
      }
    }
  } catch (e) {/* ignore */}
  // Still render items even if no saved state
  renderItems();
}

// ====== Utilities ======
function formatMoney(n) {
  return `${CURRENCY_MAP[state.currency] || '$'}${(n || 0).toFixed(2)}`;
}

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2500);
}

// ====== Keyboard shortcuts ======
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    handlePrint();
  }
});
