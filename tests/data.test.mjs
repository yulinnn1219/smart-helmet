import test from 'node:test';
import assert from 'node:assert/strict';
import { resource, stateOf, riskView, speedView, frameState, executionSteps, validateSnapshot, safeUrl } from '../dist/js/domain.js';
import { MockAdapter } from '../dist/js/mock.js';
import { DataStore, HttpAdapter } from '../dist/js/data.js';
import { CONFIG } from '../dist/js/config.js';

const now = Date.now();
const stamp = new Date(now).toISOString();
const connected = { state: 'connected' };
test('在线不等于有效，也不等于及时；过期阈值因模块不同而不同', () => {
  const r = resource({ distanceM: 1.5 }, new Date(now - 20000).toISOString(), 'online', true);
  assert.equal(stateOf(r, connected, 'ultrasound', now), 'stale');
  assert.equal(stateOf(r, connected, 'environment', now), 'fresh');
  assert.equal(stateOf({ ...r, valid: false }, connected, 'environment', now), 'invalid');
  assert.equal(stateOf({ ...r, module: 'error' }, connected, 'environment', now), 'error');
  assert.equal(stateOf(resource(), connected, 'environment', now), 'empty');
  assert.equal(stateOf(r, { state: 'loading' }, 'environment', now), 'loading');
});
test('断连与过期的历史正常风险必须变为风险未知', () => {
  const risk = resource({ level: 'normal', reasons: ['未触发'] }, stamp, 'online', true);
  assert.equal(riskView({ risk, connection: { state: 'disconnected' } }, now).level, 'unknown');
  const stale = { ...risk, updatedAt: new Date(now - CONFIG.staleMs.risk - 1).toISOString() };
  assert.equal(riskView({ risk: stale, connection: connected }, now).level, 'unknown');
  assert.equal(riskView({ risk, connection: connected }, now).level, 'normal');
});
test('未定位不会以零速度替代，固定定位的零速度可以展示', () => {
  assert.equal(speedView({ fix: 'searching', speedKmh: 0 }), '未定位');
  assert.equal(speedView({ fix: 'fixed', speedKmh: 0 }), '0.0');
  assert.equal(speedView({ fix: 'fixed', speedKmh: null }), '无数据');
});
test('画面按采集时间独立判断过期，不使用接口刷新时间', () => {
  const r = resource({ frame: { url: '/frames/f.jpg', capturedAt: new Date(now - 30000).toISOString() } }, stamp, 'online', true);
  assert.equal(frameState(r, connected, now), 'stale');
  r.value.frame.url = null;
  assert.equal(frameState(r, connected, now), 'empty');
});
test('全部模拟场景使用相同的资源封装和协议版本', async () => {
  for (const key of ['normal', 'risk', 'no_fix', 'sensor_error', 'stale', 'disconnected', 'loading', 'empty']) {
    const s = validateSnapshot(await new MockAdapter(key).getSnapshot());
    assert.equal(s.schemaVersion, '1.0');
    assert.ok(Object.hasOwn(s.vision, 'valid'));
    if (key === 'no_fix') { assert.equal(s.ride.value.speedKmh, null); assert.equal(s.ride.valid, false); }
    if (key === 'sensor_error') { assert.equal(s.ultrasound.valid, false); assert.equal(s.risk.value.level, 'unknown'); }
    if (key === 'stale' || key === 'disconnected') assert.equal(riskView(s).level, 'unknown');
  }
});
test('语音手动模式在后续采样中保持，恢复自动才由规则重新控制', async () => {
  const a = new MockAdapter();
  await a.sendVoiceCommand('打开风扇');
  for (let i = 0; i < 3; i++) {
    const fan = (await a.getSnapshot()).devices.value.fan;
    assert.deepEqual([fan.output, fan.mode, fan.source], ['on', 'manual', 'voice']);
  }
  await a.sendVoiceCommand('恢复自动风扇');
  const fan = (await a.getSnapshot()).devices.value.fan;
  assert.deepEqual([fan.output, fan.mode, fan.source], ['off', 'auto', 'environment_rule']);
  await a.sendVoiceCommand('关闭灯光');
  assert.equal((await a.getSnapshot()).devices.value.lamp.mode, 'manual');
});
test('控制失败不能更新设备输出，也不能出现硬件确认', async () => {
  const a = new MockAdapter('sensor_error');
  const before = (await a.getSnapshot()).devices.value.fan;
  const result = await a.sendVoiceCommand('打开风扇');
  assert.equal(result.status, 'failed'); assert.equal(result.outputUpdatedAt, null);
  assert.deepEqual((await a.getSnapshot()).devices.value.fan, before);
  assert.match(executionSteps(result).at(-1)[1], /无法确认/);
});
test('没有硬件反馈只描述控制输出，有反馈才确认实际状态', () => {
  const r = { receivedAt: stamp, outputUpdatedAt: stamp, status: 'output_updated', hardwareFeedback: null };
  assert.match(executionSteps(r).at(-1)[1], /无法确认/);
  r.hardwareFeedback = { state: 'on', confirmedAt: stamp };
  assert.match(executionSteps(r).at(-1)[1], /已确认/);
  r.hardwareFeedback = { state: 'unknown', confirmedAt: stamp };
  assert.match(executionSteps(r).at(-1)[1], /无法确认/);
});
test('异常事件保留缺失字段，不使用当前实时数据补填', async () => {
  const a = new MockAdapter();
  const event = (await a.getEvents()).find((e) => e.type === 'suspected_fall');
  assert.equal(event.location, null); assert.equal(event.speedKmh, null); assert.equal(event.screenshotUrl, null);
  assert.ok((await a.getTrip(event.tripId)).eventIds.includes(event.id));
});
test('无法测距时识别目标不附带虚构的目标距离', async () => {
  const s = await new MockAdapter('sensor_error').getSnapshot();
  assert.equal(s.ultrasound.value.distanceM, null);
  const normal = await new MockAdapter('risk').getSnapshot();
  assert.equal(normal.vision.value.distanceAssociation, null);
  assert.ok(normal.vision.value.targets.every((t) => !Object.hasOwn(t, 'distanceM')));
});
test('接口失败保留旧采样，明确断连，绝不回退到模拟数据', async () => {
  const store = new DataStore(); await store.refresh(true);
  const old = store.snapshot;
  store.adapter = { getSnapshot: async () => { throw new Error('接口断开'); } };
  store.lastHistoryAt = Date.now(); await store.refresh(false);
  assert.equal(store.snapshot.connection.state, 'disconnected');
  assert.deepEqual(store.snapshot.ride, old.ride);
  assert.equal(store.errors.snapshot, '接口断开');
});
test('切换来源后，前一个未完成请求不能污染新来源', async () => {
  const store = new DataStore();
  let resolve;
  store.adapter = { getSnapshot: () => new Promise((r) => { resolve = r; }) };
  const waiting = store.refresh(false);
  await store.switchSource('mock', 'no_fix');
  resolve(await new MockAdapter('risk').getSnapshot()); await waiting;
  assert.equal(store.snapshot.ride.value.fix, 'searching'); assert.equal(store.scenario, 'no_fix');
});
test('拒绝错误协议与危险截图地址', () => {
  assert.throws(() => validateSnapshot({ connection: connected }), /协议/);
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('/media/frame.jpg'), '/media/frame.jpg');
});
test('真实适配器独立读取列表和行程详情，列表错误结构不得当作无记录', async () => {
  const http = new HttpAdapter();
  http.request = async (path) => path === '/trips/one' ? { id: 'one', points: [] } : { items: [{ id: 'one' }] };
  assert.equal((await http.getTrips())[0].id, 'one');
  assert.equal((await http.getTrip('one')).id, 'one');
  assert.throws(() => http.list({ wrong: [] }), /协议/);
});
