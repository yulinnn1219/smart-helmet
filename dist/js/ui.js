import { stateOf, STATUS, RISK_LABELS, SOURCE_LABELS, PLAY_LABELS, number, time, duration, riskView, speedView, locationLabel, executionSteps, frameState, safeUrl, validLocation, EVENT_LABELS, confirmedFeedback } from './domain.js';

export const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  lamp: '<path d="M9 18h6m-6 3h6M8 14a6 6 0 1 1 8 0l-1 2H9z"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M11 10c-5-2-5-7-1-7 3 0 5 4 3 7m1 2c4-4 8-2 6 2-2 3-6 3-8 0m0 0c1 5-3 8-5 5-2-3 0-7 4-7"/>',
  route: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v7a5 5 0 0 0 10 0V8a2 2 0 0 1 4 0v4"/>',
  speed: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 13 4-5M5 10l2 1m10 0 2-1M12 4v2"/><circle cx="12" cy="14" r="2"/>',
  pin: '<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  temp: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 9v9"/>',
  drop: '<path d="M12 3c-3 4-7 8-7 12a7 7 0 0 0 14 0c0-4-4-8-7-12z"/>',
  voice: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v3m-4 0h8"/>',
  speaker: '<path d="m11 4-5 4H3v8h3l5 4zM15 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m8 6 1-3h6l1 3"/><circle cx="12" cy="13" r="4"/>',
  wifi: '<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".6"/>',
  alert: '<path d="m12 3 10 17H2zM12 9v5m0 3v.1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  file: '<path d="M14 2H5v20h14V7zM14 2v5h5M8 12h8m-8 4h6"/>'
};
export const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
export const badge = (label, state = 'fresh') => `<span class="badge ${escape(state)}">${escape(label)}</span>`;
export const empty = (title, hint = '', name = 'file') => `<div class="empty-state">${icon(name)}<p>${escape(title)}</p>${hint ? `<p class="small-note">${escape(hint)}</p>` : ''}</div>`;
export function panel(title, content, name = '', extra = '', className = '') {
  return `<section class="panel ${className}"><div class="panel-title"><h2>${name ? icon(name) : ''}${escape(title)}</h2>${extra}</div>${content}</section>`;
}
export function heading(title, description, code, snapshot) {
  return `<div class="page-heading"><div><div class="eyebrow">${escape(code)}</div><h1>${escape(title)}</h1><p>${escape(description)}</p></div><div class="heading-meta">${icon('clock')}最近接收 ${time(snapshot?.connection?.receivedAt)}</div></div>`;
}
export function freshness(r, snapshot, key) {
  const state = stateOf(r, snapshot.connection, key);
  const old = (state === 'stale' || state === 'disconnected') && r?.value != null;
  return `<div class="metric-footer">${badge(STATUS[state], state)}<span class="small-note">${old ? '上次更新值 · ' : ''}${time(r?.updatedAt)}</span>${r?.error ? `<span class="small-note">${escape(r.error)}</span>` : ''}</div>`;
}
export function metric(title, value, unit, name, r, snapshot, key, small = false) {
  return `<section class="panel metric-card"><div class="metric-title">${icon(name)}${escape(title)}</div><div class="metric-value ${small ? 'small' : ''}">${escape(value)}${unit && value !== '无数据' && value !== '未定位' ? `<span class="unit">${escape(unit)}</span>` : ''}</div>${freshness(r, snapshot, key)}</section>`;
}
export function deviceCard(name, key, snapshot) {
  const r = snapshot.devices, state = stateOf(r, snapshot.connection, 'devices');
  const d = r?.value?.[key];
  const valid = d && r.valid === true;
  const output = valid ? (d.output === 'on' ? '开启' : d.output === 'off' ? '关闭' : '无数据') : '无数据';
  const feedback = d?.hardwareFeedback;
  return `<section class="panel"><div class="device-line"><div class="device-name"><span class="device-icon">${icon(key === 'lamp' ? 'lamp' : 'fan')}</span>${escape(name)}</div><span class="device-output ${valid && d.output === 'on' ? 'on' : ''}">${escape(output)}</span></div><div class="small-note">控制输出${state === 'stale' || state === 'disconnected' ? ' · 上次更新值' : ''}</div><dl class="device-fields"><dt>控制模式</dt><dd>${valid ? badge(d.mode === 'auto' ? '自动模式' : d.mode === 'manual' ? '手动模式' : '无数据', d.mode === 'manual' ? 'attention' : 'fresh') : '无数据'}</dd><dt>控制来源</dt><dd>${escape(valid ? SOURCE_LABELS[d.source] || '无数据' : '无数据')}</dd><dt>触发原因</dt><dd>${escape(valid ? d.reason || '无数据' : '无数据')}</dd></dl><p class="feedback-note">${confirmedFeedback(feedback) ? `硬件反馈：${escape(feedback.state === 'on' ? '实际设备开启' : '实际设备关闭')} · ${time(feedback.confirmedAt)}` : '未配置硬件反馈，当前只展示控制输出。'}</p>${freshness(r, snapshot, 'devices')}</section>`;
}
export function riskCard(snapshot) {
  const view = riskView(snapshot);
  const voiceState = stateOf(snapshot.voice, snapshot.connection, 'voice');
  const reminder = snapshot.voice?.value?.reminders?.[0];
  const uncertain = view.state !== 'fresh';
  const reasons = uncertain ? `${STATUS[view.state]}，当前风险无法确认` : view.reasons.join('；') || '触发原因无数据';
  return `<section class="risk-card ${escape(view.level)}"><div class="risk-main"><div class="risk-emblem">${icon(view.level === 'normal' ? 'shield' : 'alert')}</div><div><div class="risk-label">当前安全风险${uncertain ? ` · ${STATUS[view.state]}` : ''}</div><h2>${escape(RISK_LABELS[view.level] || '风险未知')}${view.level === 'normal' ? ' · 平稳骑行' : ''}</h2><p>${escape(reasons)}</p>${uncertain && snapshot.risk?.value ? `<p class="small-note">上次更新值：${escape(RISK_LABELS[view.lastLevel])} · ${time(snapshot.risk.updatedAt)}</p>` : ''}</div></div><div class="reminder-brief"><div class="mini-title">${icon('speaker')}安全语音提醒</div><p>${escape(reminder?.text || (voiceState === 'fresh' ? '暂无安全提醒' : '提醒状态未知'))}</p><div class="metric-footer">${badge(reminder ? PLAY_LABELS[reminder.status] || '无数据' : voiceState === 'fresh' ? '未触发' : STATUS[voiceState], voiceState === 'fresh' ? reminder?.status === 'failed' ? 'failed' : 'fresh' : voiceState)}${reminder ? `<span class="small-note">${time(reminder.triggeredAt)}</span>` : ''}</div>${reminder ? `<p class="small-note">触发原因：${escape(reminder.reason || '无数据')}${voiceState !== 'fresh' ? ' · 上次更新值' : ''}</p>` : ''}</div></section>`;
}
export function systemPanel(snapshot) {
  const conn = snapshot.connection;
  const defs = [['摄像头', 'vision'], ['超声测距', 'ultrasound'], ['GPS', 'ride'], ['IMU', 'imu'], ['光照', 'light'], ['温湿度', 'environment'], ['控制输出', 'devices'], ['语音模块', 'voice']];
  const modules = defs.map(([label, key]) => {
    const r = snapshot[key], state = stateOf(r, conn, key);
    const moduleLabel = { online: '在线', offline: '离线', error: '异常', unknown: '未知' }[r?.module] || '未知';
    return `<div class="module"><strong>${label} ${badge(moduleLabel, r?.module === 'online' ? 'fresh' : r?.module === 'unknown' ? 'unknown' : 'error')}</strong><p>数据有效：${r?.valid === true ? '是' : r?.valid === false ? '否' : '未知'}</p><p>时效：${escape(STATUS[state])}</p>${r?.error ? `<p>${escape(r.error)}</p>` : ''}</div>`;
  }).join('');
  return `<section class="panel system-panel section-gap"><div class="system-summary"><div>${icon('wifi')}<strong>连接与模块状态</strong>${badge(conn.state === 'connected' ? '已连接' : conn.state === 'loading' ? '加载中' : '连接断开', conn.state === 'connected' ? 'fresh' : conn.state)}</div><span>最近接收 ${time(conn.receivedAt)}${conn.state === 'disconnected' ? ' · 保留上次更新值' : ''}</span></div>${conn.lastError ? `<p class="notice error">${escape(conn.lastError)}</p>` : ''}<div class="modules">${modules}</div></section>`;
}
export function overview(store) {
  const s = store.snapshot, ride = s.ride?.value, env = s.environment?.value;
  const speed = ride?.fix !== 'fixed' && ride ? '未定位' : s.ride?.valid === false ? '无数据' : ride ? speedView(ride) : '无数据';
  const location = !ride ? '无数据' : ride.fix === 'fixed' ? locationLabel(ride.location) : '未定位';
  return heading('骑行状态总览', '关注当前风险，了解骑行与设备状态。', 'RIDING OVERVIEW', s) + riskCard(s) + `<div class="grid three metrics-overview">${metric('当前速度', speed, 'km/h', 'speed', s.ride, s, 'ride')}${metric('当前位置', location, '', 'pin', s.ride, s, 'ride', true)}${metric('骑行时间', duration(ride?.durationSec), '', 'clock', s.ride, s, 'ride', true)}</div><div class="section-heading"><h2>辅助设备与环境</h2><a class="text-link" href="#assistance">查看控制记录</a></div><div class="grid three">${deviceCard('照明灯', 'lamp', s)}${deviceCard('风扇', 'fan', s)}${panel('骑行环境', `<div class="environment-grid"><div><div class="metric-title">温度</div><div class="metric-value">${number(env?.temperatureC)}<span class="unit">°C</span></div></div><div><div class="metric-title">湿度</div><div class="metric-value">${number(env?.humidityPct, 0)}<span class="unit">%</span></div></div></div><div class="inline-info">环境状态 ${badge(env?.comfort || '无数据', env ? 'fresh' : 'empty')}</div>${freshness(s.environment, s, 'environment')}`, 'temp', '<a class="text-link" href="#comfort">详情</a>')}</div>${systemPanel(s)}`;
}

export function trend(points, field = 'value', unit = '', color = '#22887b') {
  const data = (points || []).filter((p) => Number.isFinite(p[field]) && Number.isFinite(Date.parse(p.timestamp)));
  if (data.length < 2) return empty('暂无趋势数据', '至少需要两个有效采样点', 'activity');
  const values = data.map((p) => p[field]);
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const start = Date.parse(data[0].timestamp), end = Date.parse(data.at(-1).timestamp), elapsed = end - start || 1;
  const path = data.map((p, i) => `${i ? 'L' : 'M'} ${(20 + (Date.parse(p.timestamp) - start) / elapsed * 540).toFixed(1)},${(115 - (p[field] - lo) / span * 85).toFixed(1)}`).join(' ');
  return `<div class="chart-legend">${escape(unit)} · 范围 ${number(lo)}–${number(hi)}</div><svg class="trend" viewBox="0 0 580 145" role="img" aria-label="${escape(unit)}趋势，最低 ${number(lo)}，最高 ${number(hi)}"><path d="M20 30H560M20 73H560M20 115H560" stroke="#e5eceb" stroke-dasharray="4 5"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round"/></svg><div class="chart-caption"><span>${time(data[0].timestamp)}</span><span>${time(data.at(-1).timestamp)}</span></div>`;
}
export function targetList(targets) {
  if (!Array.isArray(targets)) return '<span class="small-note">识别结果无数据</span>';
  if (targets.length === 0) return '<span class="small-note">未识别到目标</span>';
  return `<div class="target-list">${targets.map((t) => `<div class="target-item">${escape(t.label || '无数据')}<span>置信度 ${typeof t.confidence === 'number' ? number(t.confidence * 100, 0) + '%' : '无数据'}</span></div>`).join('')}</div>`;
}
function cameraPanel(snapshot) {
  const r = snapshot.vision, value = r?.value, frame = value?.frame, url = safeUrl(frame?.url);
  const status = frameState(r, snapshot.connection);
  const boxes = url && r.valid === true ? (value.targets || []).filter((t) => t.box && Object.values(t.box).every(Number.isFinite) && t.box.x >= 0 && t.box.y >= 0 && t.box.width > 0 && t.box.height > 0 && t.box.x + t.box.width <= 1 && t.box.y + t.box.height <= 1).map((t) => `<div class="frame-box" style="left:${t.box.x * 100}%;top:${t.box.y * 100}%;width:${t.box.width * 100}%;height:${t.box.height * 100}%"><span>${escape(t.label)}</span></div>`).join('') : '';
  return panel('摄像头识别', `<div class="camera"><span class="camera-label">CAMERA / 最新采集画面</span>${url ? `<img src="${escape(url)}" alt="摄像头采集画面" data-image-kind="camera">${boxes}` : empty('暂无采集画面', '模拟场景未提供图像；真实采集画面待接入', 'camera')}</div><div class="inline-info">${badge(STATUS[status], status)}<span>画面采集时间 ${time(frame?.capturedAt)}</span></div>${status === 'stale' || status === 'disconnected' ? '<p class="notice warning">画面为上次采集结果，当前画面不可确认。</p>' : ''}<p class="small-note section-gap">识别目标（不自动关联超声距离）</p>${r?.valid === true ? targetList(value?.targets) : empty('识别结果无数据')} ${freshness(r, snapshot, 'vision')}`, 'camera');
}
export function historyNotice(store, key) {
  if (store.history[key] === 'loading') return empty('加载中', '正在读取记录');
  if (store.history[key] === 'error') return `<div class="notice error history-warning">记录查询失败：${escape(store.errors[key] || '原因无数据')}<button class="event-action" data-refresh>重新查询</button></div>`;
  if (store.snapshot.connection.state === 'disconnected' && store[key].length) return '<p class="notice warning history-warning">连接断开，下方为上次成功获取的历史记录。</p>';
  return '';
}
export function eventTable(events, store) {
  const notice = historyNotice(store, 'events');
  if (!events.length) return notice + (store.history.events === 'ready' ? empty('暂无符合条件的安全事件', '缺失数据不会自动补造') : '');
  return notice + `<div class="table-wrap"><table><thead><tr><th>发生时间</th><th>事件类型</th><th class="hide-mobile">关联信息</th><th>风险</th><th>详情</th></tr></thead><tbody>${events.map((e) => `<tr><td>${time(e.occurredAt, true)}</td><td>${escape(EVENT_LABELS[e.type] || e.type || '无数据')}<span class="small-note">${escape(e.reason || '触发原因无数据')}</span></td><td class="hide-mobile">${escape(locationLabel(e.location))}<span class="small-note">${e.speedKmh == null ? '速度无数据' : number(e.speedKmh) + ' km/h'}</span></td><td>${badge(RISK_LABELS[e.level] || '无数据', e.level || 'unknown')}</td><td><button type="button" class="event-action" data-event="${escape(e.id)}" aria-label="查看${escape(EVENT_LABELS[e.type] || '事件')}详情">查看</button></td></tr>`).join('')}</tbody></table></div>`;
}
export function safety(store, events) {
  const s = store.snapshot, ultrasound = s.ultrasound;
  const distance = ultrasound?.valid === true && Number.isFinite(ultrasound?.value?.distanceM) && ultrasound.value.distanceM >= 0 ? ultrasound.value.distanceM : null;
  const fresh = stateOf(ultrasound, s.connection, 'ultrasound') === 'fresh';
  const distanceContent = `<div class="small-note">前方超声测距 · 探测范围内的距离</div><div class="big-distance ${distance == null ? 'unavailable' : ''}">${distance == null ? '距离不可用' : number(distance)}${distance != null ? '<span>m</span>' : ''}</div>${freshness(ultrasound, s, 'ultrasound')}<p class="notice section-gap">摄像头提供目标类别；超声提供探测范围内的距离。未建立关联时，距离不绑定到任何识别目标。</p><div class="section-heading"><h2>距离变化</h2><span class="small-note">最近采样</span></div>${fresh ? trend(s.trends?.distance, 'value', '距离 / m') : empty('暂无有效实时趋势', '当前数据不可用于实时距离判断')}`;
  const reminders = s.voice?.value?.reminders || [];
  const remindersContent = reminders.length ? reminders.map((r) => `<div class="reminder-row"><div class="inline-info">${badge(PLAY_LABELS[r.status] || '无数据', r.status === 'failed' ? 'failed' : 'fresh')}<span>触发时间 ${time(r.triggeredAt)}</span></div><h3>${escape(r.text || '无数据')}</h3><p class="small-note">触发原因：${escape(r.reason || '无数据')}</p></div>`).join('') : empty(stateOf(s.voice, s.connection, 'voice') === 'fresh' ? '暂无安全提醒' : '提醒数据不可用', '', 'speaker');
  return heading('主动安全', '独立查看识别目标与前方距离，联合风险由树莓派返回。', 'ACTIVE SAFETY', s) + riskCard(s) + `<div class="grid two">${cameraPanel(s)}${panel('超声测距', distanceContent, 'activity')}</div>${panel('安全语音提醒', remindersContent + freshness(s.voice, s, 'voice'), 'speaker', '', 'section-gap')}${panel('主动安全事件', eventTable(events, store), 'file', `<span class="count">${events.length} 条记录</span>`, 'section-gap')}`;
}
export function accidents(store, events, filter = 'accident', date = '') {
  const s = store.snapshot, imu = s.imu;
  const content = `<div class="motion-status">${icon('activity')}<div><h3>${escape(imu?.valid === true ? imu.value?.label || '无数据' : '运动状态不可用')}</h3><p>IMU 运动判定结果</p></div></div>${freshness(imu, s, 'imu')}<p class="small-note">疑似碰撞与疑似跌倒属于待核实的异常，不代表事故已被确认。</p><details><summary>查看 IMU 原始采样</summary><p>X ${number(imu?.value?.acceleration?.x, 2)} · Y ${number(imu?.value?.acceleration?.y, 2)} · Z ${number(imu?.value?.acceleration?.z, 2)} m/s²</p></details>`;
  const options = [['accident', '事故与异常'], ['all', '全部安全事件'], ...Object.entries(EVENT_LABELS)];
  const filters = `<div class="filter-bar"><div class="inline-info"><label>事件类型<select id="event-filter" aria-label="事件类型">${options.map(([key, label]) => `<option value="${key}" ${filter === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>日期<input class="field-select" id="event-date" type="date" value="${escape(date)}" aria-label="事件日期"></label>${date ? '<button class="event-action" data-clear-date>清除日期</button>' : ''}</div><span class="count">${events.length} 条记录</span></div>`;
  return heading('事故与异常', '查看运动异常与统一安全事件，保留原始关联信息。', 'INCIDENTS & EVENTS', s) + `<div class="grid two">${panel('当前运动状态', content, 'activity')}${panel('事件关联说明', '<p class="muted">主动安全与事故异常使用同一份安全事件记录。事件详情可查看发生时间、位置、速度、测距、识别结果、截图及关联行程。</p><div class="notice">缺失的位置、速度或截图显示为“无数据”，不会以当前状态补填历史事件。</div>', 'file')}</div>${panel('安全事件记录', filters + eventTable(events, store), 'file', '<button class="button" data-refresh>刷新记录</button>', 'section-gap')}`;
}
export function voiceRecords(store) {
  const notice = historyNotice(store, 'records');
  if (!store.records.length) return notice + (store.history.records === 'ready' ? empty('暂无语音指令记录', store.mode === 'mock' ? '可在上方模拟一条语音指令' : '等待树莓派返回语音记录', 'voice') : '');
  return notice + store.records.map((record) => `<article class="log-record"><div class="log-heading"><h3>“${escape(record.text || '无数据')}”</h3>${badge(record.status === 'failed' ? '执行失败' : record.outputUpdatedAt ? '控制输出已更新' : record.receivedAt ? '指令已接收' : '无数据', record.status === 'failed' ? 'failed' : 'fresh')}</div><p class="small-note">目标：${record.target === 'lamp' ? '照明灯' : record.target === 'fan' ? '风扇' : '无数据'} · 意图：${escape(({ turn_on: '开启', turn_off: '关闭', restore_auto: '恢复自动' })[record.intent] || '无数据')}</p><div class="log-steps">${executionSteps(record).map(([label, text]) => `<div class="log-step"><strong>${label}</strong><p>${escape(text)}</p></div>`).join('')}</div></article>`).join('');
}
export function assistance(store, pending = false) {
  const s = store.snapshot, light = s.light;
  const disabled = pending || ['disconnected', 'stale', 'empty', 'loading'].includes(store.scenario);
  const demo = store.mode === 'mock' ? `<div class="voice-intro"><div class="voice-icon">${icon('voice')}</div><div><h3>模拟语音指令</h3><p>用于验证指令与反馈，不采集麦克风音频。</p></div></div><div class="notice">语音开启或关闭后保持手动模式；“恢复自动”后由传感器规则重新控制。</div><div class="command-buttons">${['打开灯光', '关闭灯光', '恢复自动灯光', '打开风扇', '关闭风扇', '恢复自动风扇'].map((text) => `<button type="button" class="button" data-voice="${text}" ${disabled ? 'disabled' : ''}>${text.startsWith('恢复自动') ? text.endsWith('灯光') ? '灯光恢复自动' : '风扇恢复自动' : text}</button>`).join('')}</div>` : '<div class="notice">语音由树莓派本地麦克风采集与识别。前端展示接口返回的指令和执行记录。</div>';
  return heading('骑行辅助', '查看光照、灯光控制，以及语音指令的执行过程。', 'RIDING ASSISTANCE', s) + `<div class="grid two">${deviceCard('照明灯', 'lamp', s)}${panel('环境光照', `<div class="metric-title">当前亮度等级</div><div class="metric-value small">${escape(light?.valid === true ? light.value?.level || '无数据' : '无数据')}</div><p class="small-note">光照采样 ${number(light?.value?.lux, 0)} lx</p>${freshness(light, s, 'light')}<p class="feedback-note">灯光触发规则与阈值由树莓派配置，前端展示返回的模式、来源及原因。</p>`, 'sun')}</div>${panel(store.mode === 'mock' ? '语音交互验证' : '本地语音识别', demo, 'voice', '', 'section-gap')}${panel('语音指令与执行反馈', voiceRecords(store), 'file', `<span class="count">${store.records.length} 条记录</span>`, 'section-gap')}`;
}
export function comfort(store) {
  const s = store.snapshot, env = s.environment?.value, fresh = stateOf(s.environment, s.connection, 'environment') === 'fresh';
  const envContent = `<div class="environment-hero"><div><div class="metric-title">当前温度</div><div class="metric-value">${number(env?.temperatureC)}<span class="unit">°C</span></div></div><div><div class="metric-title">相对湿度</div><div class="metric-value">${number(env?.humidityPct, 0)}<span class="unit">%</span></div></div></div><div class="inline-info">环境状态 ${badge(env?.comfort || '无数据', env ? 'fresh' : 'empty')}</div>${freshness(s.environment, s, 'environment')}<p class="feedback-note">环境状态和开启阈值由树莓派判断；当前环境值不会覆盖手动控制。</p>`;
  return heading('舒适体验', '查看温湿度和风扇控制，了解每次输出的触发原因。', 'COMFORT & ENVIRONMENT', s) + `<div class="grid two">${panel('温湿度环境', envContent, 'temp')}${deviceCard('风扇', 'fan', s)}</div><div class="grid two section-gap">${panel('温度变化', fresh ? trend(s.trends?.environment, 'temperatureC', '温度 / °C') : empty('暂无有效实时趋势'), 'temp')}${panel('湿度变化', fresh ? trend(s.trends?.environment, 'humidityPct', '相对湿度 / %', '#5585ad') : empty('暂无有效实时趋势'), 'drop')}</div><p class="notice section-gap">自动模式使用温湿度规则。语音指令开启或关闭风扇后，保持手动模式；收到“恢复自动”才重新按环境规则控制。<a class="text-link" href="#assistance"> 查看语音执行记录</a></p>`;
}
function routeGraphic(trip, events) {
  const points = (trip?.points || []).filter(validLocation);
  if (points.length < 2) return empty('暂无轨迹数据', '行程指标和关联事件仍可查看', 'route');
  const available = trip.basemap?.status === 'available' && safeUrl(trip.basemap.imageUrl) && trip.basemap.bounds && [trip.basemap.bounds.south, trip.basemap.bounds.north, trip.basemap.bounds.west, trip.basemap.bounds.east].every(Number.isFinite);
  const locations = [...points, ...events.map((e) => e.location).filter(validLocation)];
  const bounds = available ? trip.basemap.bounds : { south: Math.min(...locations.map((p) => p.latitude)), north: Math.max(...locations.map((p) => p.latitude)), west: Math.min(...locations.map((p) => p.longitude)), east: Math.max(...locations.map((p) => p.longitude)) };
  const latitudeSpan = bounds.north - bounds.south || .00001, longitudeSpan = bounds.east - bounds.west || .00001;
  const cos = Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180);
  const ratio = longitudeSpan * cos / latitudeSpan;
  const mapW = available ? 600 : Math.min(490, 280 * ratio), mapH = available ? 320 : Math.min(280, 490 / ratio);
  const canvasW = available ? 600 : Math.max(280, mapW + 100), canvasH = available ? 320 : mapH + 80;
  const offsetX = (canvasW - mapW) / 2, offsetY = (canvasH - mapH) / 2;
  const xy = (p) => [offsetX + (p.longitude - bounds.west) / longitudeSpan * mapW, offsetY + (bounds.north - p.latitude) / latitudeSpan * mapH];
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${xy(p).map((v) => v.toFixed(2)).join(' ')}`).join(' ');
  const pins = events.filter((e) => validLocation(e.location)).map((e, i) => { const [x, y] = xy(e.location); return `<g class="event-pin" role="button" tabindex="0" data-event="${escape(e.id)}" aria-label="查看${escape(EVENT_LABELS[e.type] || '安全事件')}详情"><circle cx="${x}" cy="${y}" r="10" fill="#d68a45" stroke="white" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" style="fill:white;font-size:11px">${i + 1}</text></g>`; }).join('');
  const [sx, sy] = xy(points[0]), [ex, ey] = xy(points.at(-1));
  return `<svg class="route-map" viewBox="0 0 ${canvasW} ${canvasH}" role="group" aria-label="骑行轨迹${available ? '与离线底图' : '示意图，无地图底图'}"><defs><pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#e5eeeb" stroke-width=".6"/></pattern></defs>${available ? `<image href="${escape(trip.basemap.imageUrl)}" width="600" height="320" preserveAspectRatio="none" data-image-kind="basemap"/>` : `<rect width="${canvasW}" height="${canvasH}" fill="url(#map-grid)"/>`}<path d="${line}" fill="none" stroke="#258778" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${sx}" cy="${sy}" r="7" fill="white" stroke="#258778" stroke-width="3"/><text x="${sx + 14}" y="${sy + 5}">起点</text><circle cx="${ex}" cy="${ey}" r="7" fill="#258778" stroke="white" stroke-width="2"/><text x="${ex > canvasW / 2 ? ex - 14 : ex + 14}" y="${ey + 5}" text-anchor="${ex > canvasW / 2 ? 'end' : 'start'}">${trip.endedAt ? '终点' : '最新点'}</text>${pins}</svg><div class="map-key"><span><i class="key-line"></i>GPS 轨迹</span><span><i class="key-event"></i>有位置的关联事件</span></div><div class="notice ${available ? '' : 'warning'}">${available ? '使用树莓派提供的本地底图。' : '离线底图不可用，当前展示 GPS 轨迹线与事件点；不请求在线地图。'}无位置的事件保留在记录列表中。</div>`;
}
export function trips(store, selected) {
  const s = store.snapshot;
  const summary = store.trips.find((t) => t.id === selected) || store.trips[0];
  const trip = store.tripDetails[summary?.id] || summary;
  const selector = `<label class="inline-info">行程<select class="field-select" id="trip-select" aria-label="选择行程">${store.trips.map((t) => `<option value="${escape(t.id)}" ${t.id === trip?.id ? 'selected' : ''}>${escape(t.name || '未命名行程')} · ${time(t.startedAt, true)}</option>`).join('')}</select></label>`;
  let output = heading('行程记录', '回看 GPS 轨迹、骑行指标和关联安全事件。', 'TRIPS & ROUTES', s) + historyNotice(store, 'trips');
  if (!trip) return output + empty('暂无行程记录', '等待 GPS 与本地行程数据', 'route');
  const events = store.events.filter((e) => e.tripId === trip.id);
  const facts = [['总里程', number(trip.distanceKm, 2), 'km'], ['骑行时长', duration(trip.durationSec), ''], ['平均速度', number(trip.avgSpeedKmh), 'km/h'], ['最高速度', number(trip.maxSpeedKmh), 'km/h']].map(([label, value, unit]) => `<div class="trip-fact"><div class="metric-title">${label}</div><div class="metric-value">${escape(value)}${unit && value !== '无数据' ? `<span class="unit">${unit}</span>` : ''}</div></div>`).join('');
  const linked = historyNotice(store, 'events') + (events.length ? events.map((e) => `<article class="trip-event"><div><strong>${escape(EVENT_LABELS[e.type] || '安全事件')}</strong><p>${time(e.occurredAt)} · ${escape(locationLabel(e.location))}</p></div><button type="button" class="event-action" data-event="${escape(e.id)}">查看详情</button></article>`).join('') : empty('暂无关联安全事件'));
  const tripState = store.tripStatus[trip.id];
  const routeContent = tripState === 'loading' ? empty('轨迹加载中') : tripState === 'error' ? `<div class="notice error">${escape(store.tripErrors[trip.id] || '行程查询失败')}<button class="event-action" data-trip-retry="${escape(trip.id)}">重新查询</button></div>` : routeGraphic(trip, events);
  output += `<div class="filter-bar">${selector}<span class="count">${trip.points ? trip.points.length + ' 个轨迹点' : '轨迹点待读取'}</span></div><div class="trip-layout">${panel('GPS 轨迹', routeContent, 'route', badge(trip.endedAt ? '已结束' : '骑行中'))}${panel('行程指标', `<div class="trip-facts">${facts}</div><p class="feedback-note">开始 ${time(trip.startedAt, true)}<br>结束 ${trip.endedAt ? time(trip.endedAt, true) : '尚未结束'}<br>当前速度 ${s.ride?.value?.tripId === trip.id ? speedView(s.ride.value) + (s.ride.value.fix === 'fixed' && Number.isFinite(s.ride.value.speedKmh) ? ' km/h' : '') : '无数据'}${['stale', 'disconnected'].includes(stateOf(s.ride, s.connection, 'ride')) ? ' · 上次更新值' : ''}</p><div class="trip-events"><div class="panel-title"><h2>关联安全事件</h2><span class="count">${events.length} 条</span></div>${linked}</div>`, 'speed')}</div>`;
  return output;
}
export function eventDetail(event) {
  const targets = event.targets == null ? '无数据' : targetList(event.targets);
  const url = safeUrl(event.screenshotUrl);
  const reminder = event.reminder;
  return `<div class="inline-info">${badge(EVENT_LABELS[event.type] || '无数据', 'unknown')}${badge(RISK_LABELS[event.level] || '无数据', event.level || 'unknown')}</div><div class="dialog-section"><dl class="definition"><dt>发生时间</dt><dd>${time(event.occurredAt, true)}</dd><dt>触发原因</dt><dd>${escape(event.reason || '无数据')}</dd><dt>事件位置</dt><dd>${escape(locationLabel(event.location))}</dd><dt>当时速度</dt><dd>${event.speedKmh == null ? '无数据' : number(event.speedKmh) + ' km/h'}</dd><dt>前方超声测距</dt><dd>${event.distanceM == null ? '无数据' : number(event.distanceM) + ' m'}</dd><dt>关联行程</dt><dd>${event.tripId ? `<button type="button" class="event-action" data-trip="${escape(event.tripId)}">查看关联行程</button>` : '无数据'}</dd></dl></div><div class="dialog-section"><h3>当时识别目标</h3>${targets}<p class="small-note">识别结果与超声距离独立记录，未建立目标与测距关联。</p></div><div class="dialog-section"><h3>事件截图</h3>${url ? `<img class="dialog-image" src="${escape(url)}" alt="安全事件截图" data-image-kind="event">` : empty('无数据', '本事件未提供截图', 'camera')}</div><div class="dialog-section"><h3>安全语音提醒</h3>${reminder ? `<dl class="definition"><dt>提醒内容</dt><dd>${escape(reminder.text || '无数据')}</dd><dt>触发原因</dt><dd>${escape(reminder.reason || '无数据')}</dd><dt>触发时间</dt><dd>${time(reminder.triggeredAt, true)}</dd><dt>播放状态</dt><dd>${escape(PLAY_LABELS[reminder.status] || '无数据')}</dd></dl>` : '无数据'}</div>`;
}
