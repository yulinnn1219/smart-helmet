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
  ['normal', '正常骑行'], ['risk', '风险提醒'], ['no_fix', 'GPS 未定位'],
  ['sensor_error', '传感器异常'], ['stale', '数据过期'], ['disconnected', '连接断开'],
  ['loading', '加载中'], ['empty', '无数据']
];
