import { CONFIG, HARDWARE_PROFILE } from './config.js';

export const STATUS = Object.freeze({ fresh: '正常', loading: '加载中', empty: '无数据', stale: '数据过期', disconnected: '连接断开', error: '模块异常', invalid: '数据无效', unsupported: '能力未提供', idle: '未启动' });
export const RISK_LABELS = { normal: '正常', attention: '注意', warning: '警告', high: '高风险', unknown: '风险未知' };
export const EVENT_LABELS = { proximity: '距离过近', vision: '视觉风险', sudden_brake: '急减速', vibration: '剧烈震动', suspected_collision: '疑似碰撞', suspected_fall: '疑似跌倒' };
export const ACTIVE_TYPES = ['proximity', 'vision'];
export const ACCIDENT_TYPES = ['sudden_brake', 'vibration', 'suspected_collision', 'suspected_fall'];
export const SOURCE_LABELS = { light_rule: '光敏规则', environment_rule: '温度规则', voice: '语音指令' };
export const PLAY_LABELS = { queued: '待播放', playing: '播放中', played: '已播放', failed: '播放失败', unknown: '播放状态未提供' };
export function capability(snapshot, key) { return snapshot?.capabilities?.[key] ?? HARDWARE_PROFILE[key]; }
export function rangingView(sample) {
  const value = sample?.value;
  if (value?.enabled === false) return { label: '尚未启动测距', distance: null };
  const distance = sample?.valid === true && Number.isFinite(value?.distanceM) && value.distanceM >= 0 ? value.distanceM : null;
  return { label: distance == null ? '距离不可用' : number(distance), distance };
}

export function resource(value = null, updatedAt = null, module = 'unknown', valid = null, error = null) {
  return { value, updatedAt, module, valid, error };
}
export function stateOf(r, connection, key, now = Date.now()) {
  if (connection?.state === 'loading') return 'loading';
  if (connection?.state === 'disconnected') return 'disconnected';
  if (r?.module === 'error' || r?.module === 'offline') return 'error';
  if (!r || r.value == null) return 'empty';
  if (key === 'ride' && r.value.fix === 'unavailable' && r.module === 'unknown') return 'unsupported';
  const idle = key === 'ultrasound' && r.value.enabled === false;
  if (r.valid !== true && !idle) return 'invalid';
  const time = Date.parse(r.updatedAt);
  if (!Number.isFinite(time)) return 'invalid';
  if (time > now + 5000) return 'invalid';
  if (now - time > (CONFIG.staleMs[key] ?? 10000)) return 'stale';
  return idle ? 'idle' : 'fresh';
}
export function frameState(vision, connection, now = Date.now()) {
  const outer = stateOf(vision, connection, 'vision', now);
  if (outer !== 'fresh') return outer;
  const frame = vision?.value?.frame;
  if (!frame?.url) return 'empty';
  return stateOf(resource(frame.url, frame.capturedAt, vision.module, true), connection, 'frame', now);
}
export function riskView(snapshot, now = Date.now()) {
  const state = stateOf(snapshot?.risk, snapshot?.connection, 'risk', now);
  const stored = snapshot?.risk?.value;
  return { state, level: state === 'fresh' ? (stored?.level ?? 'unknown') : 'unknown', lastLevel: stored?.level ?? 'unknown', alert: state === 'fresh' && stored?.alert === true, reasons: stored?.reasons ?? [] };
}
export function speedView(ride) {
  if (ride?.fix === 'unavailable') return '未提供 GPS';
  if (!ride || ride.fix !== 'fixed') return '未定位';
  return number(ride.speedKmh, 1);
}
export function number(value, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '无数据';
}
export function duration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '无数据';
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function time(value, full = false) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return '无数据';
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', ...(full ? { month: '2-digit', day: '2-digit' } : {}), hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
export function locationLabel(location) {
  if (!validLocation(location)) return '无数据';
  return location.label || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}
export function validLocation(p) {
  return p && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
}
export function safeUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try { const u = new URL(value, 'http://local/'); return ['http:', 'https:'].includes(u.protocol) ? value : null; } catch { return null; }
}
export function executionSteps(record) {
  return [
    ['指令已接收', record.receivedAt ? time(record.receivedAt) : '无数据'],
    [record.target === 'ultrasound' ? '采集状态已更新' : '控制输出已更新', record.outputUpdatedAt ? time(record.outputUpdatedAt) : '尚未更新'],
    [record.status === 'failed' ? '执行失败' : '执行结果', record.status === 'failed' ? (record.error || '原因无数据') : record.outputUpdatedAt ? (record.resultReason || '输出更新完成') : '等待结果'],
    ...(record.resultMode ? [['返回控制模式', record.resultMode === 'auto' ? '自动模式' : '手动模式']] : []),
    ['实际设备状态', confirmedFeedback(record.hardwareFeedback) ? `${record.hardwareFeedback.state === 'on' ? '开启' : '关闭'} · 已确认 ${time(record.hardwareFeedback.confirmedAt)}` : record.hardwareFeedback ? '硬件反馈状态未知，无法确认' : '未配置硬件反馈，无法确认']
  ];
}
export function confirmedFeedback(feedback) {
  return feedback && ['on', 'off'].includes(feedback.state) && typeof feedback.confirmedAt === 'string' && Number.isFinite(Date.parse(feedback.confirmedAt));
}
// 只检查对展示必需的协议边界。字段缺失保留 null，不补造后端结果。
export function validateSnapshot(input) {
  if (!input || input.schemaVersion !== '1.0' || !input.connection || !['connected', 'disconnected', 'loading'].includes(input.connection.state)) throw new Error('快照协议不匹配，需要 schemaVersion 1.0 与 connection');
  for (const key of ['ride', 'risk', 'ultrasound', 'vision', 'imu', 'light', 'environment', 'devices', 'voice']) {
    const r = input[key];
    if (r != null && (typeof r !== 'object' || !['online', 'offline', 'error', 'unknown'].includes(r.module) || ![true, false, null].includes(r.valid))) throw new Error(`${key} 数据封装不符合协议`);
  }
  if (input.risk?.value) {
    if (!Object.hasOwn(RISK_LABELS, input.risk.value.level) || !Array.isArray(input.risk.value.reasons) || !input.risk.value.reasons.every((r) => typeof r === 'string')) throw new Error('risk 风险等级与原因不符合协议');
  }
  if (input.vision?.value?.targets != null && !Array.isArray(input.vision.value.targets)) throw new Error('vision.targets 需要数组或 null');
  if (input.voice?.value?.reminders != null && !Array.isArray(input.voice.value.reminders)) throw new Error('voice.reminders 需要数组');
  return input;
}
