/* لوحة إدارة المحطة — موقع مستقل متصل بنفس مشروع Supabase */
(() => {
const $app = document.getElementById('app');
const sb = (window.ENV && ENV.SUPABASE_URL) ? supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY) : null;
let me = null, isSuper = false, officesCache = null;

/* ---------- أدوات ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = n => Number(n || 0).toLocaleString('ar-EG');
const money = n => num(n) + ' ج.س';
const dt = d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const toast = m => { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2800); };
const val = id => (document.getElementById(id)?.value ?? '').trim();
const go = h => { location.hash = h; };
const ST = {pending:['قيد المراجعة','warn'],payment_review:['مراجعة الدفع','info'],confirmed:['مؤكد','ok'],cancelled:['ملغي','bad'],received:['تم الاستلام','info'],in_transit:['في الطريق','warn'],arrived:['وصلت للوجهة','info'],delivered:['تم التسليم','ok'],processing:['قيد التنفيذ','warn'],completed:['مكتمل','ok'],approved:['تمت الموافقة','ok'],rejected:['مرفوض','bad']};
const badge = s => `<span class="badge ${(ST[s]||[s,''])[1]}">${(ST[s]||[s])[0]}</span>`;
const fail = e => { console.error(e); toast(({forbidden:'لا تملك الصلاحية لهذا الإجراء.',user_not_found:'لا يوجد حساب بهذا البريد في التطبيق.'}[e?.message]) || e?.message || 'حدث خطأ'); };
const tz = iso => { if (!iso) return ''; const d = new Date(iso), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

const IC = {
  chart:'<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>',
  bus:'<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
  package:'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  banknote:'<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8M16 13H8M16 17H8"/>',
  building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  tag:'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  megaphone:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  badge:'<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  percent:'<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  report:'<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  compass:'<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  image:'<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'
};
const ico = (n, s = 20, w = 1.8) => `<svg class="svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || IC.file}</svg>`;

/* ---------- نافذة منبثقة ---------- */
function modal(title, html) {
  const m = document.createElement('div'); m.className = 'mod';
  m.innerHTML = `<div class="box"><div class="hd"><h2>${esc(title)}</h2><button class="x" aria-label="إغلاق">${ico('x', 18)}</button></div><div class="mb">${html}</div></div>`;
  const close = () => m.remove();
  m.querySelector('.x').onclick = close;
  m.addEventListener('mousedown', e => { if (e.target === m) close(); });
  document.body.appendChild(m);
  m.close = close; m.q = s => m.querySelector(s);
  return m;
}

/* ---------- نماذج عامة ---------- */
async function offices() {
  if (!officesCache) { const { data } = await sb.from('offices').select('slug,name_ar').order('sort'); officesCache = data || []; }
  return officesCache;
}
async function fieldHtml(f, v) {
  const id = 'f_' + f.k, val0 = v ?? f.def ?? '';
  const full = f.full || f.t === 'textarea' ? ' full' : '';
  let input;
  if (f.t === 'textarea') input = `<textarea id="${id}">${esc(val0)}</textarea>`;
  else if (f.t === 'bool') return `<div class="${full}"><label><input type="checkbox" id="${id}" ${(v ?? f.def ?? true) ? 'checked' : ''}>${esc(f.l)}</label></div>`;
  else if (f.t === 'select') {
    const opts = f.opts === 'offices' ? (await offices()).map(o => [o.slug, o.name_ar]) : f.opts;
    input = `<select id="${id}">${f.nullable ? '<option value="">— بدون —</option>' : ''}${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(val0) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  } else if (f.t === 'datetime') input = `<input id="${id}" type="datetime-local" value="${esc(tz(val0))}">`;
  else if (f.t === 'number') input = `<input id="${id}" type="number" step="any" inputmode="decimal" value="${esc(val0)}">`;
  else if (f.t === 'color') input = `<input id="${id}" type="color" value="${esc(val0 || '#0B4F6C')}" style="height:44px;padding:4px">`;
  else input = `<input id="${id}" value="${esc(val0)}" ${f.ro ? 'readonly' : ''} ${f.ltr ? 'dir="ltr"' : ''}>`;
  return `<div class="${full}"><label>${esc(f.l)}${f.req ? ' *' : ''}</label>${input}</div>`;
}
const readForm = fields => {
  const o = {};
  for (const f of fields) {
    const el = document.getElementById('f_' + f.k); if (!el || f.ro && f.edit) continue;
    let v;
    if (f.t === 'bool') v = el.checked;
    else if (f.t === 'number') v = el.value === '' ? null : Number(el.value);
    else if (f.t === 'datetime') v = el.value ? new Date(el.value).toISOString() : null;
    else v = el.value.trim() === '' && f.nullable ? null : el.value.trim();
    o[f.k] = v;
  }
  return o;
};
const missing = (fields, o) => fields.find(f => f.req && (o[f.k] === null || o[f.k] === '' || o[f.k] === undefined));

/* ---------- صفحة CRUD عامة ---------- */
function crudPage(cfg) {
  return async () => {
    const { data, error } = await sb.from(cfg.table).select('*').order(cfg.order || 'created_at', { ascending: cfg.asc ?? false }).limit(500);
    if (error) return page(cfg.title, `<div class="err">${esc(error.message)}</div>`);
    let q = '';
    const draw = () => {
      const rows = (data || []).filter(r => !q || JSON.stringify(r).toLowerCase().includes(q));
      document.getElementById('rows').innerHTML = rows.map(r => `<tr class="click" data-id="${esc(r[cfg.pk || 'id'])}">${cfg.cols.map(c => `<td>${c.f(r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cfg.cols.length}" class="empty">لا توجد بيانات</td></tr>`;
    };
    page(cfg.title, `<div class="tools"><input id="q" placeholder="بحث…"><div class="grow"></div><button class="btn" id="add">${ico('plus', 18)} إضافة</button></div>
      <div class="tw"><table class="tbl"><thead><tr>${cfg.cols.map(c => `<th>${c.h}</th>`).join('')}</tr></thead><tbody id="rows"></tbody></table></div>`);
    draw();
    document.getElementById('q').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
    const open = async rec => {
      const edit = !!rec;
      const fh = (await Promise.all(cfg.fields.map(f => fieldHtml(edit && f.lock ? { ...f, ro: true } : f, rec?.[f.k])))).join('');
      const m = modal((edit ? 'تعديل: ' : 'إضافة: ') + cfg.single, `<div class="fg">${fh}</div><div class="act"><button class="btn" id="sv">حفظ</button>${edit && cfg.del !== false ? '<button class="btn red" id="dl">حذف</button>' : ''}</div>`);
      m.q('#sv').onclick = async e => {
        const ff = cfg.fields.map(f => edit && f.lock ? { ...f, ro: true, edit: true } : f);
        const o = readForm(ff); const bad = missing(ff.filter(f => !(f.ro && f.edit)), o);
        if (bad) return toast('أكمل الحقل: ' + bad.l);
        e.target.disabled = true;
        const r = edit ? await sb.from(cfg.table).update(o).eq(cfg.pk || 'id', rec[cfg.pk || 'id']) : await sb.from(cfg.table).insert(o);
        e.target.disabled = false; if (r.error) return fail(r.error);
        if (cfg.table === 'offices') officesCache = null;
        toast('تم الحفظ'); m.close(); route();
      };
      const dl = m.q('#dl'); if (dl) dl.onclick = async () => {
        if (!confirm('حذف هذا العنصر نهائياً؟')) return;
        const r = await sb.from(cfg.table).delete().eq(cfg.pk || 'id', rec[cfg.pk || 'id']); if (r.error) return fail(r.error);
        if (cfg.table === 'offices') officesCache = null;
        toast('تم الحذف'); m.close(); route();
      };
    };
    document.getElementById('add').onclick = () => open(null);
    document.getElementById('rows').onclick = e => { const tr = e.target.closest('tr.click'); if (!tr) return; open((data || []).find(r => String(r[cfg.pk || 'id']) === tr.dataset.id)); };
  };
}
const yn = v => v ? '<span class="badge ok">نعم</span>' : '<span class="badge">لا</span>';

/* ---------- صفحة طلبات بحالات ---------- */
const LBL = { ref_no:'رقم الطلب', tracking_no:'رقم التتبع', status:'الحالة', created_at:'التاريخ', passenger_name:'اسم المسافر', passenger_phone:'هاتف المسافر', passenger_id_no:'رقم الهوية', seats:'المقاعد', total:'الإجمالي', sender_name:'المرسل', sender_phone:'هاتف المرسل', from_place:'من', receiver_name:'المستلم', receiver_phone:'هاتف المستلم', to_place:'إلى', weight_kg:'الوزن (كجم)', description:'الوصف', cost:'التكلفة', kind:'النوع', country:'الدولة', currency:'العملة', amount:'المبلغ', fee:'الرسوم', note:'ملاحظة', service:'الخدمة', full_name:'الاسم', phone:'الهاتف', id_no:'رقم الهوية', notes:'ملاحظات', service_name:'الخدمة', details:'التفاصيل', office_slug:'المكتب' };
const HIDE = new Set(['id', 'user_id', 'trip_id', 'property_id', 'payment_proof_path', 'docs', 'lat', 'lng', 'trips', 'properties']);
const fmtV = (k, v) => k === 'status' ? badge(v) : k === 'created_at' ? dt(v) : k === 'seats' ? (v || []).join('، ') : ['total', 'cost', 'fee', 'amount'].includes(k) ? num(v) : k === 'kind' ? ({ viewing:'معاينة', booking:'حجز', domestic:'داخلي', international:'خارجي' }[v] || esc(v)) : esc(v ?? '—');

function reqPage(cfg) {
  return async () => {
    const { data, error } = await sb.from(cfg.table).select(cfg.select || '*').order('created_at', { ascending: false }).limit(500);
    if (error) return page(cfg.title, `<div class="err">${esc(error.message)}</div>`);
    let f = '', q = '';
    const draw = () => {
      const rows = (data || []).filter(r => (!f || r.status === f) && (!q || JSON.stringify(r).toLowerCase().includes(q)));
      document.getElementById('rows').innerHTML = rows.map(r => `<tr class="click" data-id="${r.id}">${cfg.cols.map(c => `<td>${c.f(r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cfg.cols.length}" class="empty">لا توجد طلبات</td></tr>`;
    };
    const cnt = s => (data || []).filter(r => r.status === s).length;
    page(cfg.title, `<div class="tools"><div class="chips" id="chips"><button class="chip on" data-s="">الكل (${(data || []).length})</button>${cfg.statuses.map(s => `<button class="chip" data-s="${s}">${ST[s][0]} (${cnt(s)})</button>`).join('')}</div><div class="grow"></div><input id="q" placeholder="بحث…"></div>
      <div class="tw"><table class="tbl"><thead><tr>${cfg.cols.map(c => `<th>${c.h}</th>`).join('')}</tr></thead><tbody id="rows"></tbody></table></div>`);
    draw();
    document.getElementById('chips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; f = b.dataset.s; document.querySelectorAll('#chips .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); };
    document.getElementById('q').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
    document.getElementById('rows').onclick = e => { const tr = e.target.closest('tr.click'); if (tr) detail(cfg, (data || []).find(r => r.id === tr.dataset.id)); };
  };
}

async function signed(bucket, path) {
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, 900);
  return data?.signedUrl || null;
}

async function detail(cfg, r) {
  const kvs = Object.keys(r).filter(k => !HIDE.has(k)).map(k => `<div class="kv"><span>${LBL[k] || k}</span><b>${fmtV(k, r[k])}</b></div>`).join('');
  let extra = '';
  if (cfg.table === 'bookings') {
    const t = r.trips; if (t) extra += `<div class="kv"><span>الرحلة</span><b>${esc(t.from_city)} ← ${esc(t.to_city)}<br><small class="mut">${dt(t.depart_at)}</small></b></div>`;
    if (r.payment_proof_path) {
      const u = await signed('payment-proofs', r.payment_proof_path);
      extra += `<h3 style="margin:14px 0 4px">إثبات الدفع</h3>` + (u ? (/\.pdf$/i.test(r.payment_proof_path) ? `<a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">فتح ملف PDF</a>` : `<a href="${u}" target="_blank" rel="noopener"><img class="proof" src="${u}" alt="إثبات الدفع"></a>`) : '<div class="err">تعذّر تحميل الملف</div>');
    } else extra += '<div class="note">لم يرفع العميل إثبات دفع بعد.</div>';
  }
  if (cfg.table === 'security_requests' && (r.docs || []).length) {
    const links = await Promise.all(r.docs.map(async (p, i) => { const u = await signed('documents', p); return u ? `<a class="btn ghost sm" href="${u}" target="_blank" rel="noopener">مستند ${i + 1}</a>` : ''; }));
    extra += `<h3 style="margin:14px 0 4px">المستندات</h3><div class="row wrap">${links.join('')}</div>`;
  }
  if (cfg.table === 'shipments') {
    extra += `<h3 style="margin:14px 0 0">موقع الإرسالية على الخريطة</h3><div class="fg"><div><label>خط العرض (lat)</label><input id="lat" type="number" step="any" value="${r.lat ?? ''}" dir="ltr"></div><div><label>خط الطول (lng)</label><input id="lng" type="number" step="any" value="${r.lng ?? ''}" dir="ltr"></div></div>`;
  }
  const opts = cfg.statuses.map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${ST[s][0]}</option>`).join('');
  const m = modal(cfg.single || cfg.title, `${kvs}${extra}<label>تغيير الحالة</label><select id="st">${opts}</select>
    <div class="act"><button class="btn" id="sv">حفظ الحالة</button>${cfg.table === 'bookings' && r.status !== 'confirmed' ? '<button class="btn green" id="ok">تأكيد الحجز</button>' : ''}${cfg.table === 'bookings' && r.status !== 'cancelled' ? '<button class="btn red" id="no">إلغاء الحجز</button>' : ''}<button class="btn ghost" id="nt">${ico('bell', 16)} إشعار للعميل</button></div>`);
  const save = async status => {
    const upd = { status };
    if (cfg.table === 'shipments') { upd.lat = val('lat') === '' ? null : Number(val('lat')); upd.lng = val('lng') === '' ? null : Number(val('lng')); }
    const x = await sb.from(cfg.table).update(upd).eq('id', r.id); if (x.error) return fail(x.error);
    toast('تم التحديث'); m.close(); route();
  };
  m.q('#sv').onclick = () => save(val('st'));
  if (m.q('#ok')) m.q('#ok').onclick = () => save('confirmed');
  if (m.q('#no')) m.q('#no').onclick = () => { if (confirm('إلغاء الحجز وتحرير مقاعده؟')) save('cancelled'); };
  m.q('#nt').onclick = () => notifyModal(r.user_id);
}

function notifyModal(uid, name) {
  const m = modal('إرسال إشعار' + (name ? ' إلى ' + name : ''), `<label>العنوان</label><input id="nt1"><label>النص</label><textarea id="nt2"></textarea><div class="act"><button class="btn" id="go">إرسال</button></div>`);
  m.q('#go').onclick = async () => {
    if (!val('nt1')) return toast('اكتب عنوان الإشعار');
    const { error } = await sb.rpc('admin_notify', { p_user: uid, p_title: val('nt1'), p_body: val('nt2') });
    if (error) return fail(error); toast('تم إرسال الإشعار'); m.close();
  };
}

/* ---------- الإطار العام ---------- */
const NAV = [
  ['', 'لوحة التحكم', 'chart', 'home'],
  ['grp', 'الطلبات'],
  ['bookings', 'الحجوزات', 'bus'], ['shipments', 'الإرساليات', 'package'], ['transfers', 'التحويلات', 'banknote'],
  ['security', 'الموافقات الأمنية', 'shield'], ['proprequests', 'طلبات العقارات', 'home'], ['servicereq', 'طلبات الخدمات', 'file'],
  ['grp', 'المحتوى'],
  ['trips', 'الرحلات', 'bus'], ['properties', 'العقارات', 'building'], ['offices', 'المكاتب والأقسام', 'list'],
  ['services', 'الخدمات والأسعار', 'tag'], ['offers', 'العروض', 'percent'], ['banners', 'الإعلانات', 'megaphone'],
  ['grp', 'الإدارة'],
  ['customers', 'العملاء', 'users'], ['staff', 'الموظفون', 'badge'], ['rates', 'العمولات', 'percent'], ['reports', 'التقارير', 'report'], ['settings', 'الإعدادات', 'settings']
];
let current = '';
function page(title, html) {
  const items = NAV.map(n => n[0] === 'grp' ? `<div class="grp">${n[1]}</div>` : `<a class="it ${current === n[0] ? 'on' : ''}" href="#/${n[0]}">${ico(n[2], 19)}${n[1]}</a>`).join('');
  $app.innerHTML = `<div class="layout"><aside class="side" id="side"><div class="brand"><img src="assets/logo.svg" alt=""><div><b>المحطة</b><small>ADMIN</small></div></div>${items}
    <div class="foot"><div>${esc(me.email)}</div><div style="opacity:.7">${isSuper ? 'مدير عام' : 'موظف'}</div><button id="lo">${ico('logout', 16)} خروج</button></div></aside>
    <div class="scrim" id="scrim"></div>
    <main class="content"><div class="bar"><button class="menu" id="mn" aria-label="القائمة">${ico('menu', 22)}</button><h1>${esc(title)}</h1></div><div class="page">${html}</div></main></div>`;
  const side = document.getElementById('side'), scrim = document.getElementById('scrim');
  document.getElementById('mn').onclick = () => { side.classList.add('open'); scrim.classList.add('open'); };
  scrim.onclick = () => { side.classList.remove('open'); scrim.classList.remove('open'); };
  side.onclick = e => { if (e.target.closest('a.it')) scrim.onclick(); };
  document.getElementById('lo').onclick = () => sb.auth.signOut();
  window.scrollTo(0, 0);
}
const loading = () => { $app.innerHTML = '<div class="spin">جارٍ التحميل…</div>'; };

/* ---------- الدخول ---------- */
function viewLogin(msg) {
  $app.innerHTML = `<div class="login"><div class="box"><div class="logo"><img src="assets/logo.svg" alt=""><h1>لوحة إدارة المحطة</h1><div class="mut">للمديرين والموظفين فقط</div></div>
  <div id="msg">${msg ? `<div class="err">${esc(msg)}</div>` : ''}</div><label>البريد الإلكتروني</label><input id="em" type="email" dir="ltr" autocomplete="email"><label>كلمة المرور</label><input id="pw" type="password" dir="ltr" autocomplete="current-password">
  <div style="height:16px"></div><button class="btn" id="go" style="width:100%;justify-content:center">دخول</button></div></div>`;
  const submit = async () => {
    const b = document.getElementById('go'); b.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: val('em'), password: document.getElementById('pw').value });
    b.disabled = false;
    if (error) document.getElementById('msg').innerHTML = `<div class="err">${/Invalid/i.test(error.message) ? 'البريد أو كلمة المرور غير صحيحة.' : esc(error.message)}</div>`;
  };
  document.getElementById('go').onclick = submit;
  document.getElementById('pw').onkeydown = e => { if (e.key === 'Enter') submit(); };
}

/* ---------- لوحة التحكم ---------- */
let rates = {};
async function loadRates() { const { data } = await sb.from('commission_rates').select('*'); rates = Object.fromEntries((data || []).map(r => [r.office_slug, Number(r.rate)])); }
const OFFICE_OF = { travel: 'السفر والترحيلات', parcels: 'الإرساليات', transfers: 'التحويلات المالية' };
const commission = (rev) => Object.keys(rev).reduce((s, k) => s + Number(rev[k]) * (rates[k] ?? 0) / 100, 0);

async function viewDashboard() {
  loading();
  const [{ data: s, error }] = await Promise.all([sb.rpc('admin_stats'), loadRates()]);
  if (error) return page('لوحة التحكم', `<div class="err">${esc(error.message)}</div>`);
  const rev = s.revenue, totalRev = Object.values(rev).reduce((a, b) => a + Number(b), 0);
  const max = Math.max(1, ...s.daily.map(x => x.n));
  const card = (ic, col, v, l) => `<div class="stat"><div class="ic" style="background:${col}1A;color:${col}">${ico(ic, 24)}</div><div><b>${v}</b><span>${l}</span></div></div>`;
  page('لوحة التحكم', `<div class="stats">${card('users', '#0B4F6C', num(s.customers), 'العملاء')}${card('building', '#6A3FA0', num(s.offices), 'المكاتب')}${card('bus', '#2E7D5B', num(s.bookings), 'الحجوزات')}${card('bell', '#B23A48', num(s.new_requests), 'طلبات جديدة تحتاج متابعة')}${card('banknote', '#C9871A', money(totalRev), 'إجمالي الإيرادات')}${card('percent', '#0E8A9B', money(Math.round(commission(rev))), 'عمولات المحطة')}</div>
  <div class="cols"><div class="card"><h3>النشاط خلال آخر 14 يوماً</h3><div class="chart">${s.daily.map(x => `<div class="c" title="${x.d}: ${x.n}"><span>${x.n || ''}</span><i style="height:${Math.round(x.n / max * 120) + 3}px"></i><span>${new Date(x.d).getDate()}</span></div>`).join('')}</div></div>
  <div class="card"><h3>الإيرادات حسب المكتب</h3><div class="bars">${Object.keys(rev).map(k => `<div class="bar-r"><span>${OFFICE_OF[k]}</span><div><i style="width:${totalRev ? Math.max(3, Number(rev[k]) / totalRev * 100) : 3}%"></i></div><b>${num(rev[k])}</b></div>`).join('')}</div>
  <div class="note" style="margin-top:12px">الإيراد يُحسب من: حجوزات مؤكدة، إرساليات غير ملغاة، رسوم تحويلات مكتملة.</div></div></div>
  <div class="card"><h3>عدد الطلبات حسب النوع</h3><div class="row wrap" style="gap:18px">${Object.entries({ bookings: 'حجوزات', shipments: 'إرساليات', transfers: 'تحويلات', security: 'موافقات أمنية', property: 'طلبات عقارات', services: 'طلبات خدمات' }).map(([k, l]) => `<div><b style="font-size:20px">${num(s.counts[k])}</b><div class="mut">${l}</div></div>`).join('')}</div></div>`);
}

/* ---------- التقارير ---------- */
const csv = (rows, cols) => '﻿' + [cols.map(c => c[1]).join(','), ...rows.map(r => cols.map(c => { let v = r[c[0]]; if (Array.isArray(v)) v = v.join(' '); v = v ?? ''; return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','))].join('\n');
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
async function viewReports() {
  const first = new Date(); first.setDate(1); const iso = d => d.toISOString().slice(0, 10);
  page('التقارير', `<div class="card"><div class="fg"><div><label>من تاريخ</label><input id="d1" type="date" value="${iso(first)}"></div><div><label>إلى تاريخ</label><input id="d2" type="date" value="${iso(new Date())}"></div></div><div style="height:12px"></div><button class="btn" id="run">عرض التقرير</button></div><div id="out"></div>`);
  const run = async () => {
    const f = new Date(val('d1') + 'T00:00:00').toISOString(), t = new Date(val('d2') + 'T23:59:59').toISOString();
    await loadRates();
    const { data: s, error } = await sb.rpc('admin_stats', { p_from: f, p_to: t }); if (error) return fail(error);
    const rows = Object.keys(s.revenue).map(k => ({ office: OFFICE_OF[k], revenue: Number(s.revenue[k]), rate: rates[k] ?? 0, com: Number(s.revenue[k]) * (rates[k] ?? 0) / 100 }));
    const tot = rows.reduce((a, r) => ({ revenue: a.revenue + r.revenue, com: a.com + r.com }), { revenue: 0, com: 0 });
    document.getElementById('out').innerHTML = `<div class="stats"><div class="stat"><div class="ic" style="background:#C9871A1A;color:#C9871A">${ico('banknote', 24)}</div><div><b>${money(tot.revenue)}</b><span>إجمالي الإيرادات</span></div></div><div class="stat"><div class="ic" style="background:#0E8A9B1A;color:#0E8A9B">${ico('percent', 24)}</div><div><b>${money(Math.round(tot.com))}</b><span>عمولات المحطة</span></div></div><div class="stat"><div class="ic" style="background:#2E7D5B1A;color:#2E7D5B">${ico('bus', 24)}</div><div><b>${num(s.counts.bookings)}</b><span>حجوزات</span></div></div><div class="stat"><div class="ic" style="background:#E07A1F1A;color:#E07A1F">${ico('package', 24)}</div><div><b>${num(s.counts.shipments)}</b><span>إرساليات</span></div></div><div class="stat"><div class="ic" style="background:#6A3FA01A;color:#6A3FA0">${ico('banknote', 24)}</div><div><b>${num(s.counts.transfers)}</b><span>تحويلات</span></div></div></div>
    <div class="tw"><table class="tbl"><thead><tr><th>المكتب</th><th>الإيراد</th><th>النسبة</th><th>العمولة</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.office}</td><td>${num(r.revenue)}</td><td>${r.rate}%</td><td>${num(Math.round(r.com))}</td></tr>`).join('')}</tbody></table></div>
    <div class="card" style="margin-top:14px"><h3>تصدير البيانات (CSV يفتح في Excel)</h3><div class="row wrap"><button class="btn ghost sm" data-x="bookings">${ico('download', 16)} الحجوزات</button><button class="btn ghost sm" data-x="shipments">${ico('download', 16)} الإرساليات</button><button class="btn ghost sm" data-x="transfers">${ico('download', 16)} التحويلات</button></div></div>`;
    const EX = { bookings: [['ref_no', 'رقم الحجز'], ['passenger_name', 'المسافر'], ['passenger_phone', 'الهاتف'], ['seats', 'المقاعد'], ['total', 'الإجمالي'], ['status', 'الحالة'], ['created_at', 'التاريخ']], shipments: [['tracking_no', 'رقم التتبع'], ['sender_name', 'المرسل'], ['from_place', 'من'], ['receiver_name', 'المستلم'], ['to_place', 'إلى'], ['weight_kg', 'الوزن'], ['cost', 'التكلفة'], ['status', 'الحالة'], ['created_at', 'التاريخ']], transfers: [['ref_no', 'رقم التحويل'], ['kind', 'النوع'], ['country', 'الدولة'], ['currency', 'العملة'], ['amount', 'المبلغ'], ['fee', 'الرسوم'], ['sender_name', 'المرسل'], ['receiver_name', 'المستلم'], ['status', 'الحالة'], ['created_at', 'التاريخ']] };
    document.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
      const k = b.dataset.x, { data, error } = await sb.from(k).select('*').gte('created_at', f).lte('created_at', t).order('created_at'); if (error) return fail(error);
      download(`${k}-${val('d1')}_${val('d2')}.csv`, csv((data || []).map(r => ({ ...r, status: (ST[r.status] || [r.status])[0] })), EX[k]));
    });
  };
  document.getElementById('run').onclick = run; run();
}

/* ---------- العملاء ---------- */
async function viewCustomers() {
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) return page('العملاء', `<div class="err">${esc(error.message)}</div>`);
  let q = '';
  const draw = () => { const rows = (data || []).filter(r => !q || JSON.stringify(r).toLowerCase().includes(q)); document.getElementById('rows').innerHTML = rows.map(r => `<tr class="click" data-id="${r.id}"><td>${esc(r.full_name || '—')}</td><td dir="ltr" style="text-align:right">${esc(r.phone || '—')}</td><td dir="ltr" style="text-align:right">${esc(r.email || '—')}</td><td>${esc(r.city || '—')}</td><td>${dt(r.created_at)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">لا يوجد عملاء</td></tr>'; };
  page('العملاء (' + num((data || []).length) + ')', `<div class="tools"><input id="q" placeholder="بحث بالاسم أو الهاتف أو البريد…" style="min-width:260px"></div><div class="tw"><table class="tbl"><thead><tr><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>المدينة</th><th>تاريخ التسجيل</th></tr></thead><tbody id="rows"></tbody></table></div>`);
  draw(); document.getElementById('q').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  document.getElementById('rows').onclick = async e => {
    const tr = e.target.closest('tr.click'); if (!tr) return; const r = data.find(x => x.id === tr.dataset.id);
    const c = async t => (await sb.from(t).select('id', { count: 'exact', head: true }).eq('user_id', r.id)).count || 0;
    const [b, s, t, sr] = await Promise.all([c('bookings'), c('shipments'), c('transfers'), c('security_requests')]);
    const m = modal(r.full_name || 'عميل', `<div class="kv"><span>الهاتف</span><b dir="ltr">${esc(r.phone || '—')}</b></div><div class="kv"><span>البريد</span><b dir="ltr">${esc(r.email || '—')}</b></div><div class="kv"><span>المدينة</span><b>${esc(r.city || '—')}</b></div><div class="kv"><span>التسجيل</span><b>${dt(r.created_at)}</b></div><div class="kv"><span>حجوزات</span><b>${num(b)}</b></div><div class="kv"><span>إرساليات</span><b>${num(s)}</b></div><div class="kv"><span>تحويلات</span><b>${num(t)}</b></div><div class="kv"><span>طلبات أمنية</span><b>${num(sr)}</b></div><div class="act"><button class="btn" id="nt">${ico('bell', 16)} إرسال إشعار</button></div>`);
    m.q('#nt').onclick = () => { m.close(); notifyModal(r.id, r.full_name); };
  };
}

/* ---------- الموظفون ---------- */
async function viewStaff() {
  const { data, error } = await sb.from('staff').select('*').order('created_at');
  if (error) return page('الموظفون', `<div class="err">${esc(error.message)}</div>`);
  page('الموظفون', `${isSuper ? `<div class="card"><h3>إضافة موظف</h3><div class="note">يجب أن يكون للشخص حساب في التطبيق أولاً (سجّل بنفس البريد).</div><div class="fg"><div><label>بريد الموظف</label><input id="se" type="email" dir="ltr"></div><div><label>الدور</label><select id="sr"><option value="staff">موظف (عمليات ومحتوى)</option><option value="admin">مدير (كامل الصلاحيات)</option></select></div></div><div style="height:12px"></div><button class="btn" id="add">إضافة</button></div>` : '<div class="note">إدارة الموظفين للمدير العام فقط.</div>'}
  <div class="tw"><table class="tbl"><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th>${isSuper ? '<th></th>' : ''}</tr></thead><tbody>${(data || []).map(r => `<tr><td>${esc(r.full_name || '—')}</td><td dir="ltr" style="text-align:right">${esc(r.email)}</td><td>${r.role === 'admin' ? 'مدير' : 'موظف'}</td><td>${r.active ? '<span class="badge ok">نشط</span>' : '<span class="badge bad">موقوف</span>'}</td>${isSuper ? `<td><button class="btn ghost sm" data-t="${r.user_id}" data-a="${r.active}">${r.active ? 'إيقاف' : 'تفعيل'}</button> <button class="btn red sm" data-d="${r.user_id}">حذف</button></td>` : ''}</tr>`).join('') || '<tr><td colspan="5" class="empty">لا يوجد موظفون. المدير العام الأصلي (is_admin) لا يظهر هنا.</td></tr>'}</tbody></table></div>`);
  if (!isSuper) return;
  document.getElementById('add').onclick = async () => { if (!val('se')) return toast('أدخل البريد'); const { error } = await sb.rpc('admin_add_staff', { p_email: val('se'), p_role: val('sr') }); if (error) return fail(error); toast('تمت الإضافة'); route(); };
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => { const { error } = await sb.from('staff').update({ active: b.dataset.a !== 'true' }).eq('user_id', b.dataset.t); if (error) return fail(error); route(); });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => { if (!confirm('حذف هذا الموظف؟')) return; const { error } = await sb.from('staff').delete().eq('user_id', b.dataset.d); if (error) return fail(error); route(); });
}

/* ---------- العمولات ---------- */
async function viewRates() {
  const [{ data: of }, { data: rt }] = await Promise.all([sb.from('offices').select('slug,name_ar').order('sort'), sb.from('commission_rates').select('*')]);
  const m = Object.fromEntries((rt || []).map(r => [r.office_slug, r.rate]));
  page('العمولات', `<div class="note">نسبة عمولة المحطة % من إيراد كل مكتب. تظهر الأرباح في لوحة التحكم والتقارير (المحسوبة حالياً للسفر والإرساليات والتحويلات).${isSuper ? '' : ' التعديل للمدير العام فقط.'}</div>
  <div class="tw"><table class="tbl"><thead><tr><th>المكتب</th><th style="width:160px">النسبة %</th></tr></thead><tbody>${(of || []).map(o => `<tr><td>${esc(o.name_ar)}</td><td><input type="number" min="0" max="100" step="0.5" data-r="${o.slug}" value="${m[o.slug] ?? 10}" ${isSuper ? '' : 'disabled'}></td></tr>`).join('')}</tbody></table></div>
  ${isSuper ? '<div style="height:14px"></div><button class="btn" id="sv">حفظ النسب</button>' : ''}`);
  if (isSuper) document.getElementById('sv').onclick = async () => {
    const rows = [...document.querySelectorAll('[data-r]')].map(i => ({ office_slug: i.dataset.r, rate: Math.min(100, Math.max(0, Number(i.value) || 0)) }));
    const { error } = await sb.from('commission_rates').upsert(rows); if (error) return fail(error); toast('تم حفظ النسب');
  };
}

/* ---------- الإعدادات ---------- */
async function viewSettings() {
  const { data, error } = await sb.from('app_settings').select('*').order('key');
  if (error) return page('الإعدادات', `<div class="err">${esc(error.message)}</div>`);
  const L = { payment_info: 'تعليمات الدفع (تظهر للعميل عند رفع إثبات الدفع)', support_phone: 'هاتف الدعم' };
  page('الإعدادات', `${isSuper ? '' : '<div class="note">التعديل للمدير العام فقط.</div>'}<div class="card">${(data || []).map(r => `<label>${esc(L[r.key] || r.key)}</label>${r.key === 'payment_info' ? `<textarea data-k="${esc(r.key)}" ${isSuper ? '' : 'disabled'}>${esc(r.value)}</textarea>` : `<input data-k="${esc(r.key)}" value="${esc(r.value)}" ${isSuper ? '' : 'disabled'}>`}`).join('')}${isSuper ? '<div style="height:14px"></div><button class="btn" id="sv">حفظ</button>' : ''}</div>`);
  if (isSuper) document.getElementById('sv').onclick = async () => { const rows = [...document.querySelectorAll('[data-k]')].map(i => ({ key: i.dataset.k, value: i.value })); const { error } = await sb.from('app_settings').upsert(rows); if (error) return fail(error); toast('تم الحفظ'); };
}

/* ---------- تعريف الصفحات ---------- */
const OFF = n => `<td>${n}</td>`;
const sp = (t, c) => ({ h: t, f: c });
const PAGES = {
  bookings: reqPage({ title: 'الحجوزات', single: 'تفاصيل الحجز', table: 'bookings', select: '*, trips(from_city,to_city,depart_at)', statuses: ['pending', 'payment_review', 'confirmed', 'cancelled'],
    cols: [sp('رقم الحجز', r => `<b dir="ltr">${esc(r.ref_no)}</b>`), sp('المسافر', r => esc(r.passenger_name)), sp('الرحلة', r => r.trips ? `${esc(r.trips.from_city)} ← ${esc(r.trips.to_city)}` : '—'), sp('المقاعد', r => (r.seats || []).join('، ')), sp('الإجمالي', r => num(r.total)), sp('الإثبات', r => r.payment_proof_path ? '✓' : '—'), sp('الحالة', r => badge(r.status)), sp('التاريخ', r => dt(r.created_at))] }),
  shipments: reqPage({ title: 'الإرساليات', single: 'تفاصيل الإرسالية', table: 'shipments', statuses: ['received', 'in_transit', 'arrived', 'delivered', 'cancelled'],
    cols: [sp('رقم التتبع', r => `<b dir="ltr">${esc(r.tracking_no)}</b>`), sp('المرسل', r => esc(r.sender_name)), sp('المسار', r => `${esc(r.from_place)} ← ${esc(r.to_place)}`), sp('المستلم', r => esc(r.receiver_name)), sp('التكلفة', r => num(r.cost)), sp('الحالة', r => badge(r.status)), sp('التاريخ', r => dt(r.created_at))] }),
  transfers: reqPage({ title: 'التحويلات', single: 'تفاصيل التحويل', table: 'transfers', statuses: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    cols: [sp('الرقم', r => `<b dir="ltr">${esc(r.ref_no)}</b>`), sp('النوع', r => r.kind === 'domestic' ? 'داخلي' : 'خارجي'), sp('الدولة', r => esc(r.country)), sp('المبلغ', r => `${num(r.amount)} ${esc(r.currency)}`), sp('الرسوم', r => num(r.fee)), sp('المستلم', r => esc(r.receiver_name)), sp('الحالة', r => badge(r.status)), sp('التاريخ', r => dt(r.created_at))] }),
  security: reqPage({ title: 'الموافقات الأمنية', single: 'تفاصيل الطلب', table: 'security_requests', statuses: ['pending', 'processing', 'approved', 'rejected', 'cancelled'],
    cols: [sp('الرقم', r => `<b dir="ltr">${esc(r.ref_no)}</b>`), sp('الخدمة', r => esc(r.service)), sp('مقدم الطلب', r => esc(r.full_name)), sp('الهاتف', r => esc(r.phone)), sp('المستندات', r => (r.docs || []).length), sp('الحالة', r => badge(r.status)), sp('التاريخ', r => dt(r.created_at))] }),
  proprequests: reqPage({ title: 'طلبات العقارات', single: 'تفاصيل الطلب', table: 'property_requests', select: '*, properties(title,city)', statuses: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    cols: [sp('الرقم', r => `<b dir="ltr">${esc(r.ref_no)}</b>`), sp('العقار', r => esc(r.properties?.title || '—')), sp('النوع', r => r.kind === 'viewing' ? 'معاينة' : 'حجز'), sp('الهاتف', r => esc(r.phone)), sp('الحالة', r => badge(r.status)), sp('التاريخ', r => dt(r.created_at))] }),
  servicereq: reqPage({ title: 'طلبات الخدمات', single: 'تفاصيل الطلب', table: 'service_requests', statuses: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    cols: [sp('الرقم', r => `<b dir="ltr">${esc(r.ref_no)}</b>`), sp('المكتب', r => esc(r.office_slug)), sp('الخدمة', r => esc(r.service_name)), sp('الهاتف', r => esc(r.phone)), sp('الحالة', r => badge(r.status)), sp('التاريخ', r => dt(r.created_at))] }),
  trips: crudPage({ title: 'الرحلات', single: 'رحلة', table: 'trips', order: 'depart_at', asc: false,
    fields: [{ k: 'from_city', l: 'من', req: 1 }, { k: 'to_city', l: 'إلى', req: 1 }, { k: 'depart_at', l: 'موعد المغادرة', t: 'datetime', req: 1 }, { k: 'price', l: 'السعر (ج.س)', t: 'number', req: 1 }, { k: 'seats_total', l: 'عدد المقاعد', t: 'number', def: 40, req: 1 }, { k: 'bus_type', l: 'نوع الباص', def: 'عادي' }, { k: 'active', l: 'الرحلة متاحة للحجز', t: 'bool' }],
    cols: [sp('الخط', r => `<b>${esc(r.from_city)} ← ${esc(r.to_city)}</b>`), sp('الموعد', r => dt(r.depart_at)), sp('السعر', r => num(r.price)), sp('المقاعد', r => r.seats_total), sp('النوع', r => esc(r.bus_type)), sp('متاحة', r => yn(r.active))] }),
  properties: crudPage({ title: 'العقارات', single: 'عقار', table: 'properties',
    fields: [{ k: 'title', l: 'العنوان', req: 1, full: 1 }, { k: 'kind', l: 'النوع', t: 'select', opts: [['شقة', 'شقة'], ['فيلا', 'فيلا'], ['منزل', 'منزل'], ['أرض', 'أرض'], ['محل', 'محل'], ['مكتب', 'مكتب']] }, { k: 'listing', l: 'العرض', t: 'select', opts: [['sale', 'بيع'], ['rent', 'إيجار']] }, { k: 'price', l: 'السعر (ج.س)', t: 'number', req: 1 }, { k: 'city', l: 'المدينة', req: 1 }, { k: 'area', l: 'الحي' }, { k: 'rooms', l: 'الغرف', t: 'number' }, { k: 'baths', l: 'الحمامات', t: 'number' }, { k: 'size_m2', l: 'المساحة م²', t: 'number' }, { k: 'image_url', l: 'رابط الصورة (https://…)', ltr: 1, full: 1 }, { k: 'details', l: 'التفاصيل', t: 'textarea' }, { k: 'active', l: 'ظاهر في التطبيق', t: 'bool' }],
    cols: [sp('العقار', r => `<b>${esc(r.title)}</b>`), sp('النوع', r => esc(r.kind)), sp('العرض', r => r.listing === 'sale' ? 'بيع' : 'إيجار'), sp('السعر', r => num(r.price)), sp('المدينة', r => esc(r.city)), sp('ظاهر', r => yn(r.active))] }),
  offices: crudPage({ title: 'المكاتب والأقسام', single: 'مكتب', table: 'offices', order: 'sort', asc: true, pk: 'slug',
    fields: [{ k: 'slug', l: 'المعرّف (إنجليزي بدون مسافات)', req: 1, ltr: 1, lock: 1 }, { k: 'name_ar', l: 'اسم المكتب', req: 1 }, { k: 'color', l: 'لون المكتب', t: 'color' }, { k: 'sort', l: 'الترتيب', t: 'number', def: 0 }, { k: 'phone', l: 'الهاتف', ltr: 1 }, { k: 'whatsapp', l: 'واتساب (أرقام فقط مع رمز الدولة)', ltr: 1 }, { k: 'description', l: 'الوصف', t: 'textarea' }, { k: 'active', l: 'ظاهر في التطبيق', t: 'bool' }],
    cols: [sp('الترتيب', r => r.sort), sp('المكتب', r => `<b>${esc(r.name_ar)}</b>`), sp('المعرّف', r => `<span dir="ltr">${esc(r.slug)}</span>`), sp('الهاتف', r => esc(r.phone || '—')), sp('ظاهر', r => yn(r.active))] }),
  services: crudPage({ title: 'الخدمات والأسعار', single: 'خدمة', table: 'services', order: 'office_slug', asc: true,
    fields: [{ k: 'office_slug', l: 'المكتب', t: 'select', opts: 'offices', req: 1 }, { k: 'name', l: 'اسم الخدمة', req: 1 }, { k: 'price_text', l: 'السعر (نص)' }, { k: 'sort', l: 'الترتيب', t: 'number', def: 0 }, { k: 'description', l: 'الوصف', t: 'textarea' }, { k: 'active', l: 'ظاهرة', t: 'bool' }],
    cols: [sp('المكتب', r => esc(r.office_slug)), sp('الخدمة', r => `<b>${esc(r.name)}</b>`), sp('السعر', r => esc(r.price_text || '—')), sp('ظاهرة', r => yn(r.active))] }),
  offers: crudPage({ title: 'العروض', single: 'عرض', table: 'offers',
    fields: [{ k: 'title', l: 'عنوان العرض', req: 1, full: 1 }, { k: 'office_slug', l: 'المكتب', t: 'select', opts: 'offices', nullable: 1 }, { k: 'price_text', l: 'السعر / الخصم' }, { k: 'badge', l: 'شارة (مثل: عرض، جديد)' }, { k: 'description', l: 'الوصف', t: 'textarea' }, { k: 'popular', l: 'الأكثر طلباً (يظهر في الرئيسية)', t: 'bool', def: false }, { k: 'active', l: 'ظاهر', t: 'bool' }],
    cols: [sp('العرض', r => `<b>${esc(r.title)}</b>`), sp('المكتب', r => esc(r.office_slug || 'عام')), sp('السعر', r => esc(r.price_text || '—')), sp('الأكثر طلباً', r => yn(r.popular)), sp('ظاهر', r => yn(r.active))] }),
  banners: crudPage({ title: 'الإعلانات (بانرات الرئيسية)', single: 'إعلان', table: 'banners', order: 'sort', asc: true,
    fields: [{ k: 'title', l: 'العنوان', req: 1, full: 1 }, { k: 'subtitle', l: 'النص الفرعي', full: 1 }, { k: 'color', l: 'اللون', t: 'color' }, { k: 'sort', l: 'الترتيب', t: 'number', def: 0 }, { k: 'link', l: 'الرابط داخل التطبيق (مثل #/trips أو #/office/hotels)', ltr: 1, full: 1 }, { k: 'active', l: 'ظاهر', t: 'bool' }],
    cols: [sp('الترتيب', r => r.sort), sp('الإعلان', r => `<b>${esc(r.title)}</b><div class="mut">${esc(r.subtitle || '')}</div>`), sp('اللون', r => `<span style="display:inline-block;width:22px;height:22px;border-radius:7px;background:${esc(r.color)};vertical-align:middle"></span>`), sp('ظاهر', r => yn(r.active))] }),
  customers: viewCustomers, staff: viewStaff, rates: viewRates, reports: viewReports, settings: viewSettings
};

/* ---------- الموجّه ---------- */
async function route() {
  if (!sb) { $app.innerHTML = '<div class="login"><div class="box"><div class="err">لم يتم ضبط اتصال Supabase. تأكد من أسرار المستودع ثم أعد النشر.</div></div></div>'; return; }
  if (!me) return viewLogin();
  const key = (location.hash || '#/').replace(/^#\/?/, '').split('/')[0];
  current = PAGES[key] || key === '' ? key : '';
  loading();
  try { await (key === '' || !PAGES[key] ? viewDashboard() : PAGES[key]()); } catch (e) { console.error(e); page('خطأ', `<div class="err">${esc(e.message || e)}</div>`); }
}
async function init(session) {
  if (!session) { me = null; return viewLogin(); }
  const { data: ok, error } = await sb.rpc('is_admin');
  if (error || !ok) { me = null; await sb.auth.signOut(); return viewLogin('هذا الحساب لا يملك صلاحية الدخول إلى لوحة الإدارة.'); }
  const { data: sup } = await sb.rpc('is_super');
  me = { id: session.user.id, email: session.user.email }; isSuper = !!sup;
  route();
}
async function boot() {
  window.addEventListener('hashchange', route);
  if (!sb) return route();
  const { data } = await sb.auth.getSession(); await init(data.session);
  sb.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_IN' && !me) init(s); if (ev === 'SIGNED_OUT') { me = null; setTimeout(() => { if (!document.querySelector('#msg .err')) viewLogin(); }, 80); } });
}
boot();
})();
