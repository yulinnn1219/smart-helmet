// 所有过期阈值集中在这里，单位毫秒；按硬件实际采样频率调整。
export const CONFIG = Object.freeze({
  defaultSource: 'mock', // 树莓派正式部署时改为 'http'。
  pollMs: 2000,
  historyPollMs: 10000,
  timeoutMs: 5000,
  apiBase: '/api/v1',
  staleMs: Object.freeze({ ride: 10000, risk: 5000, ultrasound: 5000, vision: 5000, frame: 5000, imu: 5000, light: 15000, environment: 30000, devices: 10000, voice: 30000 })
});
export const SCENARIOS = [
  ['normal', '设备在线 · 测距未启动'], ['risk', '前后方告警'], ['no_fix', '定位不可用'],
  ['sensor_error', '传感器异常'], ['stale', '数据过期'], ['disconnected', '连接断开'],
  ['loading', '加载中'], ['empty', '无数据'], ['no_echo', '测距运行 · 无回波']
];
// 根据 boot-programs 源码确认的能力；后端接入后可在 snapshot.capabilities 覆盖。
export const HARDWARE_PROFILE = Object.freeze({ gps: false, illuminance: false, accidentDetection: false, frameUpload: false, controlPolicy: 'opposite_command_restores_auto' });
