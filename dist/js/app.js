import { DataStore } from './data.js';
import { SCENARIOS } from './config.js';
import { icon, escape, overview, safety, accidents, assistance, comfort, trips, eventDetail } from './ui.js';
import { ACTIVE_TYPES, ACCIDENT_TYPES, EVENT_LABELS } from './domain.js';

const store = new DataStore();
const routes = [ ['overview', '骑行总览', 'grid'], ['safety', '主动安全', 'shield'], ['accidents', '事故异常', 'activity'], ['assistance', '骑行辅助', 'lamp'], ['comfort', '舒适体验', 'fan'], ['trips', '行程记录', 'route'] ];
const main = document.querySelector('#main');
const dialog = document.querySelector('#detail-dialog');
let route = 'overview';
let eventFilter = 'accident', eventDate = '', selectedTrip = '', voicePending = false;
function eventDay(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }); }
const views = {
  overview,
  safety: (data) => safety(data, data.events.filter((e) => ACTIVE_TYPES.includes(e.type))),
  accidents: (data) => accidents(data, data.events.filter((e) => (eventFilter === 'all' || eventFilter === 'accident' && ACCIDENT_TYPES.includes(e.type) || e.type === eventFilter) && (!eventDate || eventDay(e.occurredAt) === eventDate)), eventFilter, eventDate),
  assistance: (data) => assistance(data, voicePending), comfort,
  trips: (data) => trips(data, selectedTrip)
};
const shortLabels = { overview: '总览', safety: '安全', accidents: '异常', assistance: '辅助', comfort: '舒适', trips: '行程' };
document.querySelector('#nav').innerHTML = routes.map(([key, label, symbol]) => `<a href="#${key}" class="nav-link" data-route="${key}" aria-label="${label}">${icon(symbol)}<span class="nav-label-wide">${label}</span><span class="nav-label-small">${shortLabels[key]}</span></a>`).join('');

function render() {
  route = location.hash.slice(1).split('?')[0] || 'overview';
  if (!routes.some(([key]) => key === route)) route = 'overview';
  document.querySelectorAll('[data-route]').forEach((node) => { const active = node.dataset.route === route; node.classList.toggle('active', active); if (active) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
  document.querySelector('#breadcrumb').textContent = `骑行工作台 / ${routes.find(([key]) => route === key)[1]}`;
  const active = main.contains(document.activeElement) ? document.activeElement : null;
  const focusedId = active?.id;
  const focusAttribute = ['data-voice', 'data-event', 'data-trip-retry', 'data-refresh'].find((name) => active?.hasAttribute(name));
  const focusValue = focusAttribute ? active.getAttribute(focusAttribute) : null;
  const expanded = [...main.querySelectorAll('details')].map((node, i) => node.open ? i : null).filter((i) => i !== null);
  main.innerHTML = views[route](store);
  if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
  else if (focusAttribute) main.querySelector(`[${focusAttribute}="${CSS.escape(focusValue)}"]`)?.focus({ preventScroll: true });
  expanded.forEach((i) => { const item = main.querySelectorAll('details')[i]; if (item) item.open = true; });
  document.title = `${routes.find(([key]) => route === key)[1]} · 智能头盔`;
  const mock = store.mode === 'mock';
  document.querySelector('#source-tag').textContent = mock ? '模拟数据' : '树莓派接口';
  document.querySelector('#source-tag').classList.toggle('real', !mock);
  document.querySelector('#mode-label').textContent = mock ? '模拟模式' : '树莓派接口模式';
  document.querySelector('#mode-description').textContent = mock ? '界面与数据逻辑演示 · 未连接硬件' : '本地接口 /api/v1 · 连接结果见页面状态';
  document.querySelector('.demo-bar').classList.toggle('real', !mock);
  document.querySelector('#scenario-control').hidden = !mock;
  document.querySelector('#scenario-select').value = store.scenario;
  document.querySelector('#footer-source').textContent = mock ? '模拟数据 · 树莓派接口待对接' : '树莓派接口模式 · 仅展示接口返回结果';
  if (route === 'trips') {
    const id = store.trips.some((t) => t.id === selectedTrip) ? selectedTrip : store.trips[0]?.id;
    if (id && !store.tripStatus[id]) queueMicrotask(() => store.loadTrip(id));
  }
}
function showDialog(title, html) { document.querySelector('#dialog-title').textContent = title; document.querySelector('#dialog-content').innerHTML = html; if (!dialog.open) dialog.showModal(); }
function toast(text) { const node = document.querySelector('#toast'); node.textContent = text; node.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 5000); }

document.querySelector('#scenario-select').innerHTML = SCENARIOS.map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
document.querySelector('#scenario-select').addEventListener('change', async (e) => { await store.switchSource('mock', e.target.value); toast('已切换模拟场景'); });
document.querySelector('#settings-button').addEventListener('click', () => showDialog('数据来源设置', `<p class="small-note">模拟与真实接口共用同一套数据结构。默认使用模拟数据，接口模式不会用模拟结果填补请求失败。</p><form id="source-form"><div class="source-options"><label class="source-option"><input type="radio" name="source" value="mock" ${store.mode === 'mock' ? 'checked' : ''}><span><strong>模拟数据</strong><p>验证正常、风险提醒、未定位、异常、过期和断连状态。</p></span></label><label class="source-option"><input type="radio" name="source" value="http" ${store.mode === 'http' ? 'checked' : ''}><span><strong>树莓派本地接口 · 待后端对接</strong><p>请求同源 /api/v1。目前预览服务没有树莓派后端；未接入时会显示连接断开。</p></span></label></div><div class="notice">实际风险、规则判断和设备模式均由树莓派返回。页面不会替代硬件端判断。</div><div class="settings-actions"><button class="button primary" type="submit">应用数据来源</button></div></form>`));
document.addEventListener('submit', async (e) => { if (e.target.id === 'source-form') { e.preventDefault(); const source = new FormData(e.target).get('source'); dialog.close(); await store.switchSource(source, store.scenario); toast(source === 'mock' ? '已切换到模拟数据' : '已切换到树莓派接口模式'); } });
document.addEventListener('click', async (e) => {
  if (e.target.closest('.skip-link')) { e.preventDefault(); main.focus(); main.scrollIntoView(); return; }
  if (e.target.closest('[data-close-dialog]')) dialog.close();
  const eventId = e.target.closest('[data-event]')?.dataset.event;
  if (eventId) openEvent(eventId);
  const tripId = e.target.closest('[data-trip]')?.dataset.trip;
  if (tripId) {
    if (!store.trips.some((t) => t.id === tripId)) { toast('关联行程未返回，请接入行程详情接口'); return; }
    selectedTrip = tripId; dialog.close(); location.hash = 'trips'; render();
  }
  if (e.target.closest('[data-clear-date]')) { eventDate = ''; render(); }
  const retryId = e.target.closest('[data-trip-retry]')?.dataset.tripRetry;
  if (retryId) await store.loadTrip(retryId, true);
  if (e.target.closest('[data-refresh]')) { await store.refresh(true); toast('记录查询完成'); }
  const voice = e.target.closest('[data-voice]')?.dataset.voice;
  if (voice && !voicePending) {
    voicePending = true; render();
    try { const result = await store.sendVoice(voice); toast(result.status === 'failed' ? `执行失败：${result.error || '原因无数据'}` : '模拟控制输出已更新；实际设备状态未确认'); }
    catch (error) { toast(error.message); }
    finally { voicePending = false; render(); }
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'event-filter') { eventFilter = e.target.value; render(); }
  if (e.target.id === 'event-date') { eventDate = e.target.value; render(); }
  if (e.target.id === 'trip-select') { selectedTrip = e.target.value; render(); }
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.event-pin')) { e.preventDefault(); openEvent(e.target.dataset.event); } });
document.addEventListener('error', (e) => {
  if (e.target?.dataset?.imageKind) {
    const node = document.createElement('div'); node.className = 'notice warning'; node.textContent = '图像资源不可用；采集结果与轨迹数据仍单独保留。';
    if (e.target.dataset.imageKind === 'basemap') { e.target.remove(); document.querySelector('.map-key')?.after(node); }
    else e.target.replaceWith(node);
  }
}, true);
function openEvent(id) { const event = store.events.find((item) => item.id === id); if (event) showDialog(`${EVENT_LABELS[event.type] || '安全事件'} · 事件详情`, eventDetail(event)); else toast('事件无数据'); }
dialog.addEventListener('click', (e) => { if (e.target === dialog && (e.clientX < dialog.getBoundingClientRect().left || e.clientX > dialog.getBoundingClientRect().right || e.clientY < dialog.getBoundingClientRect().top || e.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
window.addEventListener('hashchange', () => { dialog.close(); render(); window.scrollTo({ top: 0, behavior: 'instant' }); main.focus({ preventScroll: true }); });
store.addEventListener('change', () => {
  // 正在选择筛选项或输入日期时保留控件，避免轮询中断输入。
  if (main.contains(document.activeElement) && document.activeElement.matches('select,input')) return;
  render();
});
main.addEventListener('focusout', (event) => {
  if (!event.target.matches('select,input')) return;
  queueMicrotask(() => { if (!main.contains(document.activeElement) || !document.activeElement.matches('select,input')) render(); });
});
render();
store.start();

// 可选 WebMCP：与可见界面共享同一组操作；不支持的浏览器直接忽略。
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const tools = [
    { name: 'read_riding_status', title: '读取骑行状态', description: '读取当前可见数据来源、连接状态与安全风险采样。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute(input) { if (!input || Object.keys(input).length) throw new Error('不接受参数'); return { mode: store.mode, connection: store.snapshot.connection, risk: store.snapshot.risk, ride: store.snapshot.ride }; } },
    { name: 'navigate_helmet_page', title: '打开头盔页面', description: '导航到六个骑行工作台页面之一。', inputSchema: { type: 'object', properties: { page: { type: 'string', enum: routes.map(([key]) => key) } }, required: ['page'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || Object.keys(input).length !== 1 || !routes.some(([key]) => key === input.page)) throw new Error('页面无效'); location.hash = input.page; render(); return { page: input.page }; } },
    { name: 'open_safety_event', title: '查看安全事件', description: '打开已有安全事件详情，不创建或修改记录。', inputSchema: { type: 'object', properties: { eventId: { type: 'string' } }, required: ['eventId'], additionalProperties: false }, annotations: { readOnlyHint: true }, execute(input) { if (!input || Object.keys(input).length !== 1 || !store.events.some((e) => e.id === input.eventId)) throw new Error('事件不存在'); openEvent(input.eventId); return { eventId: input.eventId, opened: true }; } }
  ];
  tools.forEach((tool) => { try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} });
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
