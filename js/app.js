/* ============================================
   SimpleBill — App Logic
   ============================================ */

const SAMPLE_DATA = {
  template: 'modern', currency: 'USD', taxRate: 8.5,
  fromName: 'Sarah Chen', fromEmail: 'sarah@creativestudio.io',
  fromPhone: '+1 (555) 234-5678',
  fromAddress: '245 Bryant St, Suite 200\nSan Francisco, CA 94107',
  toName: 'Acme Digital Inc.', toEmail: 'billing@acme.com',
  toAddress: '1000 Market Street\nWilmington, DE 19801',
  invNumber: 'INV-2024-0042',
  items: [
    { description: 'UI/UX Design — Homepage Redesign', quantity: 40, rate: 95 },
    { description: 'Frontend Development — React Components', quantity: 25, rate: 120 },
    { description: 'Brand Identity Package', quantity: 1, rate: 1800 }
  ],
  notes: 'Thank you for the opportunity to work on this project!',
  terms: 'Payment is due within 30 days. Please include invoice number with payment.',
  logo: '', paymentStatus: 'unpaid', discountType: 'percentage', discountValue: 0
};

const EMPTY_STATE = {
  template: 'modern', currency: 'USD', taxRate: 0,
  fromName: '', fromEmail: '', fromPhone: '', fromAddress: '',
  toName: '', toEmail: '', toAddress: '',
  invNumber: 'INV-001',
  items: [{ description: '', quantity: 1, rate: 0 }, { description: '', quantity: 1, rate: 0 }],
  notes: '', terms: 'Payment is due within 30 days. Thank you for your business.',
  logo: '', paymentStatus: 'unpaid', discountType: 'percentage', discountValue: 0
};

const CURRENCY_MAP = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥', CAD: 'C$', AUD: 'A$' };

// ====== State ======
let state = { ...EMPTY_STATE };

// ====== Init ======
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('simplebill_state');
  if (saved) {
    try {
      state = JSON.parse(saved);
      // Backfill new fields for existing saves
      if (state.logo === undefined) state.logo = '';
      if (state.paymentStatus === undefined) state.paymentStatus = 'unpaid';
      if (state.discountType === undefined) state.discountType = 'percentage';
      if (state.discountValue === undefined) state.discountValue = 0;
    } catch(e) {}
  } else {
    state = { ...SAMPLE_DATA };
    showToast('👋 Welcome! Here\'s a sample invoice.');
  }
  setDefaults();
  syncFormFromState();
  renderItems();
  renderPreview();
  renderHistory();
});

function setDefaults() {
  if (!state.invDate) {
    const d = new Date();
    state.invDate = d.toISOString().split('T')[0];
    state.invDueDate = new Date(d.getTime() + 30*24*60*60*1000).toISOString().split('T')[0];
  }
}

// ====== Pro ======
function isPro() { return localStorage.getItem('simplebill_pro') === 'true'; }

// ====== Template ======
function setTemplate(name) {
  state.template = name;
  document.querySelectorAll('.template-opt').forEach(b => b.classList.toggle('active', b.dataset.template === name));
  saveState();
  renderPreview();
}

// ====== Items ======
function addItem() {
  state.items.push({ description: '', quantity: 1, rate: 0 });
  renderItems(); renderPreview(); saveState();
}
function removeItem(i) {
  if (state.items.length <= 1) return;
  state.items.splice(i, 1);
  renderItems(); renderPreview(); saveState();
}
function updateItem(i, field, val) {
  state.items[i][field] = field === 'description' ? val : parseFloat(val) || 0;
  renderPreview(); saveState();
}
function renderItems() {
  document.getElementById('itemsContainer').innerHTML = state.items.map((item, i) => `
    <div class="item-row">
      <input class="input item-desc" placeholder="Service / product" value="${escHtml(item.description)}" oninput="updateItem(${i},'description',this.value)">
      <input class="input item-qty" type="number" placeholder="Qty" min="0" step="1" value="${item.quantity}" oninput="updateItem(${i},'quantity',this.value)">
      <input class="input item-rate" type="number" placeholder="Rate" min="0" step="0.01" value="${item.rate}" oninput="updateItem(${i},'rate',this.value)">
      <div class="item-amount">${fmt(item.quantity * item.rate)}</div>
      <button class="item-del" onclick="removeItem(${i})"><i class="fas fa-times"></i></button>
    </div>`).join('');
}

// ====== Form binding ======
function bindForm() {
  const get = id => document.getElementById(id);
  state.currency = get('currency').value;
  state.taxRate = parseFloat(get('taxRate').value) || 0;
  state.fromName = get('fromName').value; state.fromEmail = get('fromEmail').value;
  state.fromPhone = get('fromPhone').value; state.fromAddress = get('fromAddress').value;
  state.toName = get('toName').value; state.toEmail = get('toEmail').value;
  state.toAddress = get('toAddress').value;
  state.invNumber = get('invNumber').value; state.invDate = get('invDate').value;
  state.invDueDate = get('invDueDate').value; state.notes = get('notes').value;
  state.terms = get('terms').value;
  state.paymentStatus = get('paymentStatus').value;
  state.discountType = get('discountType').value;
  state.discountValue = parseFloat(get('discountValue').value) || 0;
  saveState();
}

function syncFormFromState() {
  ['currency','taxRate','fromName','fromEmail','fromPhone','fromAddress',
   'toName','toEmail','toAddress','invNumber','invDate','invDueDate',
   'notes','terms','paymentStatus','discountType','discountValue'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state[id] ?? '';
  });
  document.querySelectorAll('.template-opt').forEach(b =>
    b.classList.toggle('active', b.dataset.template === state.template));
  // Logo preview
  if (state.logo) {
    const img = document.getElementById('logoPreview');
    if (img) { img.src = state.logo; img.style.display = 'inline'; }
  }
}

// ====== Logo ======
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 512 * 1024) { showToast('⚠️ Logo must be under 512KB'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.logo = ev.target.result;
    document.getElementById('logoPreview').src = state.logo;
    document.getElementById('logoPreview').style.display = 'inline';
    renderPreview(); saveState();
    showToast('✅ Logo uploaded');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
function removeLogo() {
  state.logo = '';
  document.getElementById('logoPreview').style.display = 'none';
  renderPreview(); saveState();
}

// ====== Invoice number ======
function nextInvoiceNumber() {
  let num = parseInt(localStorage.getItem('simplebill_last_num') || '0', 10) + 1;
  localStorage.setItem('simplebill_last_num', num.toString());
  state.invNumber = `INV-${String(num).padStart(4, '0')}`;
  document.getElementById('invNumber').value = state.invNumber;
  renderPreview(); saveState();
}

// ====== Preview ======
function renderPreview() {
  bindForm();
  const preview = document.getElementById('invoicePreview');
  const sym = CURRENCY_MAP[state.currency] || '$';
  const subtotal = state.items.reduce((s, it) => s + (it.quantity||0)*(it.rate||0), 0);
  let discountAmount = 0;
  if (state.discountType === 'percentage') discountAmount = subtotal * (state.discountValue||0) / 100;
  else discountAmount = Math.min(state.discountValue||0, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * (parseFloat(state.taxRate)||0) / 100;
  const total = afterDiscount + tax;

  preview.className = `invoice-page tpl-${state.template}`;
  preview.innerHTML = renderHeader(sym) + renderAddresses() + renderTable(sym) +
    renderTotals(sym, subtotal, discountAmount, tax, total) + renderFooter() +
    renderPaymentBadge() + (isPro() ? '' : '<div class="inv-watermark">SimpleBill FREE</div>');
}

function renderHeader(sym) {
  const num = escHtml(state.invNumber), d = state.invDate, due = state.invDueDate;
  const brand = escHtml(state.fromName || 'Your Company');
  const nameParts = brand.split(' ');
  const logoHtml = state.logo ? `<img src="${state.logo}" class="inv-logo" alt="Logo">` : '';

  if (state.template === 'modern') return `
    <div class="inv-header">
      <div class="inv-brand">${logoHtml}<h1><span>${escHtml(nameParts[0])}</span> ${escHtml(nameParts.slice(1).join(' '))}</h1></div>
      <div class="inv-title"><h2>INVOICE</h2><div class="inv-meta">${num}</div></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:24px;font-size:0.78rem;color:var(--inv-muted);margin-top:-20px;margin-bottom:8px;">
      <span>Date: ${d||'—'}</span><span>Due: ${due||'—'}</span></div>`;
  if (state.template === 'classic') return `
    <div class="inv-header">
      ${logoHtml}<h1>INVOICE</h1>
      <div style="font-size:1rem;font-weight:600;margin-top:2px;">${brand}</div>
      <div class="inv-meta">${num} | Date: ${d||'—'} | Due: ${due||'—'}</div></div>`;
  return `
    <div class="inv-header">
      <div class="inv-brand">${logoHtml}<h1>${brand}</h1></div>
      <div class="inv-title"><h2>INVOICE</h2>
      <div style="font-size:0.75rem;color:var(--inv-muted);">${num}<br>${d||'—'} | Due: ${due||'—'}</div></div></div>`;
}

function renderAddresses() {
  const from = `<p><strong>${escHtml(state.fromName||'Your Name')}</strong></p>
    <p>${escHtml(state.fromEmail||'')}</p>${state.fromPhone?`<p>${escHtml(state.fromPhone)}</p>`:''}
    <p>${escHtml(state.fromAddress||'').replace(/\n/g,'<br>')}</p>`;
  const to = `<p><strong>${escHtml(state.toName||'Client Name')}</strong></p>
    <p>${escHtml(state.toEmail||'')}</p>
    <p>${escHtml(state.toAddress||'').replace(/\n/g,'<br>')}</p>`;
  if (state.template === 'minimal') return `<div class="inv-addresses">
    <div class="inv-addr-block"><p><strong>FROM</strong><br>${from.replace(/<p><strong>/g,'').replace(/<\/strong><\/p>/,'')}</p></div>
    <div class="inv-addr-block"><p><strong>TO</strong><br>${to.replace(/<p><strong>/g,'').replace(/<\/strong><\/p>/,'')}</p></div></div>`;
  return `<div class="inv-addresses">
    <div class="inv-addr-block"><h3>From</h3>${from}</div>
    <div class="inv-addr-block"><h3>To</h3>${to}</div></div>`;
}

function renderTable(sym) {
  if (!state.items.some(it => it.description))
    return '<p style="text-align:center;padding:24px;color:var(--text-muted);">Add line items to see the invoice.</p>';
  const rows = state.items.map(it => `<tr>
    <td>${escHtml(it.description||'—')}</td><td>${it.quantity}</td>
    <td class="amt">${sym}${Number(it.rate).toFixed(2)}</td>
    <td class="amt">${sym}${(it.quantity*it.rate).toFixed(2)}</td></tr>`).join('');
  return `<table class="inv-table"><thead><tr>
    <th style="width:45%">Description</th><th style="width:10%">Qty</th>
    <th style="width:18%" class="amt">Rate</th><th style="width:20%" class="amt">Amount</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function renderTotals(sym, subtotal, discountAmt, tax, total) {
  const hasDiscount = discountAmt > 0;
  const taxLabel = parseFloat(state.taxRate)>0 ? `Tax (${state.taxRate}%)` : 'Tax';
  return `<div class="inv-totals"><table>
    <tr><td>Subtotal</td><td>${sym}${subtotal.toFixed(2)}</td></tr>
    ${hasDiscount ? `<tr><td>Discount ${state.discountType==='percentage' ? '('+state.discountValue+'%)' : ''}</td><td style="color:var(--red)">−${sym}${discountAmt.toFixed(2)}</td></tr>` : ''}
    <tr><td>${taxLabel}</td><td>${sym}${tax.toFixed(2)}</td></tr>
    <tr class="total-row"><td><strong>Total</strong></td><td><strong>${sym}${total.toFixed(2)}</strong></td></tr>
  </table></div>`;
}

function renderFooter() {
  let html = '';
  if (state.notes) html += `<div><h4>Notes</h4><p>${escHtml(state.notes).replace(/\n/g,'<br>')}</p></div>`;
  if (state.terms) html += `<div><h4>Terms</h4><p>${escHtml(state.terms).replace(/\n/g,'<br>')}</p></div>`;
  return html ? `<div class="inv-footer">${html}</div>` : '';
}

function renderPaymentBadge() {
  if (state.paymentStatus === 'paid')
    return `<div class="inv-badge inv-badge-paid">PAID</div>`;
  if (state.paymentStatus === 'overdue')
    return `<div class="inv-badge inv-badge-overdue">OVERDUE</div>`;
  return `<div class="inv-badge inv-badge-unpaid">UNPAID</div>`;
}

// ====== Pro Modal ======
function showProModal() { document.getElementById('proModal').classList.add('active'); }
function closeProModal(e) { if (e && e.target !== e.currentTarget) return; document.getElementById('proModal').classList.remove('active'); }
function unlockPro() { localStorage.setItem('simplebill_pro','true'); renderPreview(); closeProModal(); showToast('🎉 Pro unlocked!'); }
function handleProPurchase() {
  if (confirm('🎉 Try Pro FREE for evaluation! Support with a donation if you find it useful.')) {
    unlockPro(); showToast('🎉 Pro unlocked! Watermark removed, all features enabled.');
  }
}

// ====== Actions ======
function handlePrint() { localStorage.setItem('simplebill_has_used','true'); window.print(); }

function handleNew() {
  if (!confirm('Start a new invoice?')) return;
  saveToHistory(); // save current to history
  state = { ...EMPTY_STATE };
  const d = new Date();
  state.invDate = d.toISOString().split('T')[0];
  state.invDueDate = new Date(d.getTime()+30*24*60*60*1000).toISOString().split('T')[0];
  syncFormFromState(); renderItems(); renderPreview();
  document.getElementById('logoPreview').style.display = 'none';
  saveState(); showToast('New invoice started');
}

function handleDuplicate() {
  state.invNumber = state.invNumber + '-copy';
  document.getElementById('invNumber').value = state.invNumber;
  renderPreview(); saveState();
  showToast('📋 Invoice duplicated');
}

function handleSave() {
  bindForm();
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `invoice-${state.invNumber||'draft'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('💾 Saved as JSON');
}
function handleLoad() { document.getElementById('fileInput').click(); }
function handleFileLoad(e) {
  const file = e.target.files[0]; if (!file) return;
  new Response(file).json().then(data => {
    if (data.items && Array.isArray(data.items)) {
      state = data; syncFormFromState(); renderItems(); renderPreview(); saveState();
      showToast('✅ Invoice loaded');
    }
  }).catch(() => showToast('⚠️ Invalid file'));
  e.target.value = '';
}

// ===================================================================
// ====== INVOICE HISTORY ======
// ===================================================================
function getHistory() {
  try { return JSON.parse(localStorage.getItem('simplebill_history') || '[]'); } catch(e) { return []; }
}
function saveHistory(h) { localStorage.setItem('simplebill_history', JSON.stringify(h)); }

function saveToHistory() {
  bindForm();
  const h = getHistory();
  h.unshift({
    id: Date.now(),
    invNumber: state.invNumber,
    toName: state.toName,
    date: state.invDate,
    total: calcTotal(),
    currency: state.currency,
    state: JSON.parse(JSON.stringify(state))
  });
  if (h.length > 50) h.length = 50;
  saveHistory(h);
  renderHistory();
}

function calcTotal() {
  const subtotal = state.items.reduce((s,it) => s+(it.quantity||0)*(it.rate||0), 0);
  let d = 0;
  if (state.discountType === 'percentage') d = subtotal * (state.discountValue||0) / 100;
  else d = Math.min(state.discountValue||0, subtotal);
  const tax = (subtotal - d) * (parseFloat(state.taxRate)||0) / 100;
  return subtotal - d + tax;
}

function loadFromHistory(id) {
  const h = getHistory();
  const entry = h.find(e => e.id === id);
  if (!entry) return;
  state = JSON.parse(JSON.stringify(entry.state));
  syncFormFromState(); renderItems(); renderPreview(); saveState();
  showToast('✅ Invoice loaded from history');
}

function deleteFromHistory(id) {
  let h = getHistory();
  h = h.filter(e => e.id !== id);
  saveHistory(h);
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  const h = getHistory();
  if (h.length === 0) {
    container.innerHTML = '<div class="history-empty">No saved invoices yet</div>';
    return;
  }
  container.innerHTML = h.slice(0, 20).map(e => {
    const total = e.total || 0;
    const sym = CURRENCY_MAP[e.currency] || '$';
    return `<div class="history-item" onclick="loadFromHistory(${e.id})" title="Click to load">
      <div class="history-item-main">
        <span class="history-number">${escHtml(e.invNumber||'Draft')}</span>
        <span class="history-client">${escHtml(e.toName||'—')}</span>
      </div>
      <div class="history-item-side">
        <span class="history-amount">${sym}${total.toFixed(2)}</span>
        <button class="history-del" onclick="event.stopPropagation();deleteFromHistory(${e.id})" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ====== Persistence ======
function saveState() {
  try { localStorage.setItem('simplebill_state', JSON.stringify(state)); } catch(e) {}
}

// ====== Utilities ======
function fmt(n) { return `${CURRENCY_MAP[state.currency]||'$'}${(n||0).toFixed(2)}`; }
function escHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 3000);
}

// ====== Keyboard ======
document.addEventListener('keydown', e => {
  if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
  if ((e.ctrlKey||e.metaKey) && e.key === 'p') { e.preventDefault(); handlePrint(); }
  if (e.key === 'Escape') { const m = document.getElementById('proModal'); if (m.classList.contains('active')) closeProModal(); }
});

// Auto-save to history on page close
window.addEventListener('beforeunload', () => { saveToHistory(); });
