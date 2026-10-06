import { resource, validLocation } from './domain.js';

const iso = (ms) => new Date(ms).toISOString();
export class MockAdapter {
  constructor(scenario = 'normal') { this.scenario = scenario; this.reset(); }
  reset() {
    this.startedAt = Date.now() - 2537 * 1000;
    this.frozenAt = Date.now();
    this.overrides = {};
    this.records = [];
    const anchor = this.frozenAt;
    this.events = [
      { id: 'demo-event-1', type: 'proximity', level: 'warning', occurredAt: iso(anchor - 120000), reason: '前方超声距离小于配置阈值', location: { latitude: 39.9832, longitude: 116.3110, label: '示例路段 A' }, speedKmh: 18.6, distanceM: 1.5, targets: [{ label: '车辆', confidence: 0.94, box: null }, { label: '行人', confidence: 0.88, box: null }], screenshotUrl: null, tripId: 'demo-trip-1', reminder: { text: '请注意前方，减速慢行', reason: '前方超声距离小于配置阈值', triggeredAt: iso(anchor - 120000), status: 'played' } },
      { id: 'demo-event-2', type: 'sudden_brake', level: 'attention', occurredAt: iso(anchor - 750000), reason: 'IMU 检测到急减速', location: { latitude: 39.9811, longitude: 116.3086, label: '示例路段 B' }, speedKmh: 12.4, distanceM: null, targets: null, screenshotUrl: null, tripId: 'demo-trip-1', reminder: null },
      { id: 'demo-event-3', type: 'suspected_fall', level: 'high', occurredAt: iso(anchor - 86400000), reason: '姿态变化达到疑似跌倒条件，尚未确认事故', location: null, speedKmh: null, distanceM: null, targets: null, screenshotUrl: null, tripId: 'demo-trip-2', reminder: { text: '检测到异常，请确认安全', reason: null, triggeredAt: null, status: 'played' } }
    ];
    const points = Array.from({ length: 24 }, (_, i) => ({ latitude: 39.978 + i * 0.00025 + Math.sin(i / 3) * 0.00015, longitude: 116.306 + i * 0.00026 + Math.sin(i / 4) * 0.0006, timestamp: iso(this.startedAt + i * 100000) }));
    this.trips = [
      { id: 'demo-trip-1', name: '本次骑行', startedAt: iso(this.startedAt), endedAt: null, durationSec: 2537, distanceKm: 8.42, avgSpeedKmh: 16.8, maxSpeedKmh: 27.3, points, eventIds: ['demo-event-1', 'demo-event-2'], basemap: { status: 'unavailable', imageUrl: null, bounds: null } },
      { id: 'demo-trip-2', name: '上次骑行', startedAt: iso(anchor - 87000000), endedAt: iso(anchor - 85000000), durationSec: 2000, distanceKm: 6.1, avgSpeedKmh: 15.2, maxSpeedKmh: 23.1, points: [], eventIds: ['demo-event-3'], basemap: { status: 'unavailable', imageUrl: null, bounds: null } }
    ];
  }
  setScenario(scenario) { this.scenario = scenario; this.reset(); }
  async getSnapshot() {
    const now = Date.now();
    const frozen = ['stale', 'disconnected'].includes(this.scenario);
    const stamp = iso(frozen ? this.frozenAt - 120000 : now);
    const wrap = (v) => resource(v, stamp, 'online', true);
    const risk = this.scenario === 'risk';
    const noFix = this.scenario === 'no_fix';
    const lamp = this.overrides.lamp ?? { output: 'on', mode: 'auto', source: 'light_rule', reason: '环境昏暗', hardwareFeedback: null };
    const fan = this.overrides.fan ?? { output: 'off', mode: 'auto', source: 'environment_rule', reason: '未达到开启阈值', hardwareFeedback: null };
    const latest = this.records[0];
    const snapshot = {
      schemaVersion: '1.0', sampledAt: stamp,
      connection: { state: this.scenario === 'disconnected' ? 'disconnected' : this.scenario === 'loading' ? 'loading' : 'connected', receivedAt: stamp, lastConnectedAt: stamp, lastError: this.scenario === 'disconnected' ? '模拟 Wi-Fi 连接中断' : null },
      ride: wrap({ fix: noFix ? 'searching' : 'fixed', speedKmh: noFix ? null : 21.6, location: noFix ? null : { latitude: 39.9838, longitude: 116.3120, label: '示例骑行路段' }, durationSec: 2537 + (frozen ? 0 : Math.floor((now - this.frozenAt) / 1000)), tripId: 'demo-trip-1' }),
      risk: wrap({ level: risk ? 'warning' : 'normal', reasons: risk ? ['前方超声距离小于配置阈值'] : ['树莓派规则结果：当前未触发风险条件'], distanceAssociation: null }),
      ultrasound: wrap({ distanceM: risk ? 1.5 : 4.8 }),
      vision: wrap({ targets: [{ id: 'v1', label: '车辆', confidence: 0.94, box: null }, { id: 'v2', label: '行人', confidence: 0.88, box: null }], frame: { url: null, capturedAt: stamp, width: 1280, height: 720 }, distanceAssociation: null }),
      imu: wrap({ motion: 'normal', label: '正常骑行', acceleration: { x: 0.02, y: 0.08, z: 9.81 } }),
      light: wrap({ lux: 86, level: '昏暗' }),
      environment: wrap({ temperatureC: 25.4, humidityPct: 62, comfort: '舒适' }),
      devices: wrap({ lamp, fan, voicePlayer: { status: 'ready', hardwareFeedback: null } }),
      voice: wrap({ latest: latest ?? null, reminders: risk ? [{ id: 'demo-reminder-1', reason: '前方超声距离小于配置阈值', text: '请注意前方，减速慢行', triggeredAt: iso(this.frozenAt), status: 'playing' }] : [] }),
      trends: { distance: frozen ? [] : Array.from({ length: 12 }, (_, i) => ({ timestamp: iso(now - (11 - i) * 5000), value: risk ? 4.3 - i * 0.255 : 4.8 + Math.sin(i) * 0.4 })), environment: frozen ? [] : Array.from({ length: 12 }, (_, i) => ({ timestamp: iso(now - (11 - i) * 60000), temperatureC: 24.2 + i * 0.1, humidityPct: 60 + Math.sin(i) * 2 })) }
    };
    if (this.scenario === 'sensor_error') {
      snapshot.ultrasound = resource({ distanceM: null }, stamp, 'error', false, '超声回波无效');
      snapshot.vision = resource(null, stamp, 'offline', false, '摄像头采集模块离线');
      snapshot.risk = wrap({ level: 'unknown', reasons: ['摄像头与超声模块异常，风险无法判定'], distanceAssociation: null });
    }
    if (noFix) snapshot.ride.valid = false;
    if (this.scenario === 'empty' || this.scenario === 'loading') {
      for (const key of ['ride', 'risk', 'ultrasound', 'vision', 'imu', 'light', 'environment', 'devices', 'voice']) snapshot[key] = resource();
      snapshot.trends = { distance: [], environment: [] };
    }
    return snapshot;
  }
  async getEvents() { return ['empty', 'loading'].includes(this.scenario) ? [] : structuredClone(this.events); }
  async getTrips() { return ['empty', 'loading'].includes(this.scenario) ? [] : structuredClone(this.trips.map(({ points, ...summary }) => summary)); }
  async getTrip(id) {
    const trip = this.trips.find((t) => t.id === id);
    return trip ? structuredClone(trip) : null;
  }
  async getVoiceRecords() { return structuredClone(this.records); }
  // 模拟树莓派处理指令。页面不自行推导设备模式或规则结果。
  async sendVoiceCommand(text) {
    if (['loading', 'empty', 'stale', 'disconnected'].includes(this.scenario)) throw new Error('当前场景不可发送模拟指令，请切换到正常骑行');
    const match = /^(打开|关闭|恢复自动)(灯光|风扇)$/.exec(text);
    if (!match) throw new Error('未识别的模拟指令');
    const target = match[2] === '灯光' ? 'lamp' : 'fan';
    const auto = match[1] === '恢复自动';
    const on = match[1] === '打开';
    const receivedAt = iso(Date.now());
    const fail = this.scenario === 'sensor_error';
    if (!fail) this.overrides[target] = auto ? { output: target === 'lamp' ? 'on' : 'off', mode: 'auto', source: target === 'lamp' ? 'light_rule' : 'environment_rule', reason: target === 'lamp' ? '环境昏暗' : '未达到开启阈值', hardwareFeedback: null } : { output: on ? 'on' : 'off', mode: 'manual', source: 'voice', reason: on ? '用户要求开启' : '用户要求关闭', hardwareFeedback: null };
    const record = { id: `demo-command-${Date.now()}-${this.records.length}`, text, intent: auto ? 'restore_auto' : on ? 'turn_on' : 'turn_off', target, receivedAt, outputUpdatedAt: fail ? null : receivedAt, status: fail ? 'failed' : 'output_updated', error: fail ? '模拟控制通道异常' : null, hardwareFeedback: null };
    this.records.unshift(record);
    return structuredClone(record);
  }
}
