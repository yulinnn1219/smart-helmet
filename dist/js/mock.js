import { resource } from './domain.js';
import { HARDWARE_PROFILE } from './config.js';

const iso = (ms) => new Date(ms).toISOString();
// 仅模拟经 boot-programs 源码确认的能力，不连接设备，也不读硬件日志。
export class MockAdapter {
  constructor(scenario = 'normal') { this.scenario = scenario; this.reset(); }
  reset() {
    this.frozenAt = Date.now(); this.overrides = {}; this.records = [];
    this.rangeEnabled = ['risk', 'no_echo', 'stale', 'disconnected'].includes(this.scenario);
    this.rangeStartedAt = this.rangeEnabled ? this.frozenAt - 1200 : null;
    this.rearAlertAt = null;
    this.temperatureC = 31.2; this.lightLevel = 'dark';
    const anchor = this.frozenAt;
    this.events = [
      { id: 'demo-event-1', type: 'proximity', level: null, occurredAt: iso(anchor - 120000), reason: '模拟：后方连续 3 次在 4 米内有回波，采集程序触发来车提醒', location: null, speedKmh: null, distanceM: 0.864, distanceDirection: 'rear', targets: null, screenshotUrl: null, tripId: null, reminder: { text: '注意后方来车', reason: '后方连续回波触发提醒', triggeredAt: iso(anchor - 120000), status: 'unknown' } },
      { id: 'demo-event-2', type: 'vision', level: null, occurredAt: iso(anchor - 750000), reason: '模拟：前方摄像头识别到人，采集程序给出告警文字', location: null, speedKmh: null, distanceM: null, distanceDirection: 'rear', targets: [{ label: '行人', confidence: 0.82, box: null }], screenshotUrl: null, tripId: null, reminder: { text: '画面中发现人，请减速观察', reason: '本地识别告警', triggeredAt: iso(anchor - 750000), status: 'unknown' } }
    ];
    this.trips = [];
  }
  setScenario(scenario) { this.scenario = scenario; this.reset(); }
  automaticDevice(target, previousOutput = 'off') {
    const lamp = target === 'lamp';
    const output = lamp ? (this.lightLevel === 'dark' ? 'on' : 'off') : this.temperatureC >= 30 ? 'on' : this.temperatureC <= 28 ? 'off' : previousOutput;
    return { output, mode: 'auto', source: lamp ? 'light_rule' : 'environment_rule', reason: lamp ? (output === 'on' ? '环境昏暗，光敏稳定后控制开启' : '环境明亮，光敏稳定后控制关闭') : (this.temperatureC >= 30 ? '舱温达到 30°C 开启阈值' : this.temperatureC <= 28 ? '舱温达到 28°C 关闭阈值' : '舱温位于 28–30°C，保持之前输出'), hardwareFeedback: null };
  }
  async getSnapshot() {
    const now = Date.now(), frozen = ['stale', 'disconnected'].includes(this.scenario);
    const stamp = iso(frozen ? this.frozenAt - 120000 : now), wrap = (v) => resource(v, stamp, 'online', true);
    const risk = this.scenario === 'risk', noEcho = this.scenario === 'no_echo', rangeEnabled = this.rangeEnabled;
    const distanceM = rangeEnabled && !noEcho ? 0.864 : null;
    const rearTriggered = rangeEnabled && !noEcho && now - this.rangeStartedAt >= 900;
    if (rearTriggered && !this.rearAlertAt) this.rearAlertAt = this.scenario === 'risk' ? this.frozenAt : ['stale', 'disconnected'].includes(this.scenario) ? this.frozenAt - 120000 : this.rangeStartedAt + 900;
    const lamp = this.overrides.lamp ?? this.automaticDevice('lamp'), fan = this.overrides.fan ?? this.automaticDevice('fan');
    const snapshot = {
      schemaVersion: '1.0', sampledAt: stamp, capabilities: { ...HARDWARE_PROFILE },
      connection: { state: this.scenario === 'disconnected' ? 'disconnected' : this.scenario === 'loading' ? 'loading' : 'connected', receivedAt: stamp, lastConnectedAt: stamp, lastError: this.scenario === 'disconnected' ? '模拟数据链路中断' : null },
      ride: resource({ fix: 'unavailable', speedKmh: null, location: null, durationSec: null, tripId: null }, null, 'unknown', false, '当前采集程序未提供 GPS、速度或行程统计'),
      risk: wrap({ level: 'unknown', alert: risk || rearTriggered, reasons: risk ? ['后方连续回波触发来车提醒', '前方摄像头给出行人告警；未提供联合风险分级'] : rearTriggered ? ['后方连续回波触发来车提醒；未提供联合风险分级'] : ['采集程序未提供联合风险分级', rangeEnabled ? (noEcho ? '后方无有效回波，不能据此认定安全' : '后方测距已启动；未提供告警分级') : '后方测距尚未启动'], distanceAssociation: null }),
      ultrasound: resource({ direction: 'rear', enabled: rangeEnabled, distanceM, rearState: rearTriggered ? 1 : 0 }, stamp, 'online', distanceM != null, noEcho ? '当前无有效回波' : null),
      vision: wrap({ targets: risk ? [{ label: '行人', confidence: 0.82, box: { x: 0.41, y: 0.28, width: 0.22, height: 0.63 } }] : null, frame: null, latencyMs: risk ? 860 : null, warning: risk ? '画面中发现人，请减速观察' : null, distanceAssociation: null }),
      imu: wrap({ motion: null, label: null, accelerationG: { x: 0.01, y: -0.02, z: 0.98 }, gyroDps: { x: 1.2, y: -0.4, z: 0.1 }, accelMagnitudeG: 0.98 }),
      light: wrap({ lux: null, level: this.lightLevel === 'dark' ? '昏暗' : '明亮', kind: 'binary' }),
      environment: wrap({ temperatureC: this.temperatureC, humidityPct: 45, comfort: null }),
      devices: wrap({ lamp, fan, voicePlayer: { status: 'unknown', hardwareFeedback: null } }),
      voice: wrap({ latest: this.records[0] ?? null, reminders: [...(rearTriggered ? [{ id: 'demo-reminder-1', reason: '后方连续回波触发提醒', text: '注意后方来车', triggeredAt: iso(this.rearAlertAt), status: 'unknown' }] : []), ...(risk ? [{ id: 'demo-reminder-2', reason: '前方本地识别告警', text: '画面中发现人，请减速观察', triggeredAt: iso(this.frozenAt), status: 'unknown' }] : [])] }),
      trends: { distance: frozen || !rangeEnabled || noEcho ? [] : Array.from({ length: Math.min(12, Math.floor((now - this.rangeStartedAt) / 300) + 1) }, (_, i) => ({ timestamp: iso(this.rangeStartedAt + (Math.max(0, Math.floor((now - this.rangeStartedAt) / 300) - 11) + i) * 300), value: 0.864 })), environment: frozen ? [] : Array.from({ length: 12 }, (_, i) => ({ timestamp: iso(now - (11 - i) * 60000), temperatureC: 30.1 + i * 0.1, humidityPct: 45 + Math.sin(i) * 2 })) }
    };
    if (this.scenario === 'sensor_error') {
      snapshot.ultrasound = resource({ direction: 'rear', enabled: true, distanceM: null, rearState: null }, stamp, 'error', false, '超声模块异常');
      snapshot.vision = resource(null, stamp, 'offline', false, '摄像头采集模块离线');
      snapshot.risk = wrap({ level: 'unknown', alert: null, reasons: ['摄像头与超声模块异常，当前风险无法判定'], distanceAssociation: null });
    }
    if (this.scenario === 'empty' || this.scenario === 'loading') {
      for (const key of ['ride', 'risk', 'ultrasound', 'vision', 'imu', 'light', 'environment', 'devices', 'voice']) snapshot[key] = resource();
      snapshot.trends = { distance: [], environment: [] };
    }
    return snapshot;
  }
  async getEvents() { return ['empty', 'loading'].includes(this.scenario) ? [] : structuredClone(this.events); }
  async getTrips() { return []; }
  async getTrip() { return null; }
  async getVoiceRecords() { return structuredClone(this.records); }
  async sendVoiceCommand(text) {
    if (['loading', 'empty', 'stale', 'disconnected'].includes(this.scenario)) throw new Error('当前场景不可发送模拟指令，请切换到设备在线');
    const range = text === '启动测距', match = /^(打开|关闭)(灯光|风扇)$/.exec(text);
    if (!range && !match) throw new Error('当前硬件程序仅支持开灯、关灯、开风扇、关风扇和启动测距；未实现独立恢复自动口令');
    const target = range ? 'ultrasound' : match[2] === '灯光' ? 'lamp' : 'fan', on = !range && match[1] === '打开';
    const receivedAt = iso(Date.now()), fail = this.scenario === 'sensor_error';
    let resultMode = null, resultOutput = null, resultReason = null;
    if (!fail && range) {
      resultReason = this.rangeEnabled ? '测距已在运行，保持采集状态' : '已启动后方测距'; if (!this.rangeEnabled) this.rangeStartedAt = Date.now(); this.rangeEnabled = true;
    } else if (!fail) {
      const previous = this.overrides[target] ?? this.automaticDevice(target);
      const opposite = previous.mode === 'manual' && previous.output !== (on ? 'on' : 'off'), repeated = previous.mode === 'manual' && !opposite;
      const device = opposite ? this.automaticDevice(target, previous.output) : { output: on ? 'on' : 'off', mode: 'manual', source: 'voice', reason: on ? '用户要求开启' : '用户要求关闭', hardwareFeedback: null };
      this.overrides[target] = device; resultMode = device.mode; resultOutput = device.output;
      resultReason = opposite ? `相反口令抵消手动要求，恢复自动；${device.reason}` : repeated ? '重复同方向口令，保持原手动输出' : device.reason;
    }
    const record = { id: `demo-command-${Date.now()}-${this.records.length}`, text, intent: range ? 'range_start' : on ? 'turn_on' : 'turn_off', target, receivedAt, outputUpdatedAt: fail ? null : receivedAt, status: fail ? 'failed' : 'output_updated', error: fail ? '模拟控制通道异常' : null, resultMode, resultOutput, resultReason, hardwareFeedback: null };
    this.records.unshift(record); return structuredClone(record);
  }
}
