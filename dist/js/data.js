import { CONFIG } from './config.js';
import { MockAdapter } from './mock.js';
import { resource, validateSnapshot } from './domain.js';

export class HttpAdapter {
  async request(path, options = {}) {
    const response = await fetch(CONFIG.apiBase + path, { ...options, signal: AbortSignal.timeout(CONFIG.timeoutMs), headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `接口请求失败 (${response.status})`);
    }
    return response.json();
  }
  async getSnapshot() { return validateSnapshot(await this.request('/snapshot')); }
  async getEvents() { return this.list(await this.request('/events')); }
  async getTrips() { return this.list(await this.request('/trips')); }
  async getTrip(id) { return this.request(`/trips/${encodeURIComponent(id)}`); }
  async getVoiceRecords() { return this.list(await this.request('/voice-records')); }
  async sendVoiceCommand(text) { return this.request('/commands', { method: 'POST', body: JSON.stringify({ text, source: 'voice', clientRequestId: crypto.randomUUID() }) }); }
  list(input) { if (!Array.isArray(input?.items)) throw new Error('列表协议不匹配，需要 items 数组'); return input.items; }
}
export function emptySnapshot(state = 'loading') {
  const snapshot = { schemaVersion: '1.0', connection: { state, receivedAt: null, lastConnectedAt: null, lastError: null }, trends: { distance: [], environment: [] } };
  for (const key of ['ride', 'risk', 'ultrasound', 'vision', 'imu', 'light', 'environment', 'devices', 'voice']) snapshot[key] = resource();
  return snapshot;
}
export class DataStore extends EventTarget {
  constructor() {
    super();
    this.mode = CONFIG.defaultSource; this.scenario = 'normal'; this.adapter = this.mode === 'http' ? new HttpAdapter() : new MockAdapter();
    this.snapshot = emptySnapshot(); this.events = []; this.trips = []; this.records = [];
    this.history = { events: 'loading', trips: 'loading', records: 'loading' }; this.errors = {}; this.generation = 0; this.busy = null;
    this.tripDetails = {}; this.tripStatus = {}; this.tripErrors = {};
    this.lastHistoryAt = 0;
  }
  emit() { this.dispatchEvent(new Event('change')); }
  async start() { await this.refresh(true); this.timer = setInterval(() => this.refresh(false), CONFIG.pollMs); }
  async switchSource(mode, scenario = 'normal') {
    this.generation++; this.mode = mode; this.scenario = scenario;
    this.adapter = mode === 'mock' ? new MockAdapter(scenario) : new HttpAdapter();
    this.snapshot = emptySnapshot(); this.events = []; this.trips = []; this.records = []; this.errors = {};
    this.tripDetails = {}; this.tripStatus = {}; this.tripErrors = {};
    this.lastHistoryAt = 0;
    this.history = { events: 'loading', trips: 'loading', records: 'loading' }; this.emit();
    await this.refresh(true);
  }
  async refresh(includeHistory = true) {
    const token = this.generation;
    if (this.busy === token) return;
    this.busy = token;
    includeHistory = includeHistory || Date.now() - this.lastHistoryAt >= CONFIG.historyPollMs;
    const adapter = this.adapter;
    try {
      const snapshot = await adapter.getSnapshot();
      if (token !== this.generation) return;
      this.snapshot = snapshot; delete this.errors.snapshot;
    } catch (error) {
      if (token !== this.generation) return;
      this.snapshot = { ...this.snapshot, connection: { ...this.snapshot.connection, state: 'disconnected', lastError: error.message } };
      this.errors.snapshot = error.message;
    }
    if (includeHistory) {
      const requests = [['events', 'getEvents'], ['trips', 'getTrips'], ['records', 'getVoiceRecords']];
      const results = await Promise.allSettled(requests.map(([, method]) => adapter[method]()));
      if (token !== this.generation) return;
      results.forEach((result, i) => {
        const key = requests[i][0];
        if (result.status === 'fulfilled') { this[key] = result.value; this.history[key] = this.mode === 'mock' && this.scenario === 'loading' ? 'loading' : 'ready'; delete this.errors[key]; }
        else { this.history[key] = 'error'; this.errors[key] = result.reason.message; }
      });
      this.lastHistoryAt = Date.now();
    }
    if (token === this.generation) { this.busy = null; this.emit(); }
  }
  async loadTrip(id, force = false) {
    if (!id || this.tripStatus[id] === 'loading' || !force && this.tripStatus[id] === 'ready') return;
    const token = this.generation;
    this.tripStatus[id] = 'loading'; this.emit();
    try {
      const detail = await this.adapter.getTrip(id);
      if (token !== this.generation) return;
      if (!detail || detail.id !== id) throw new Error('关联行程详情无数据');
      this.tripDetails[id] = detail; this.tripStatus[id] = 'ready'; delete this.tripErrors[id];
    } catch (error) { if (token !== this.generation) return; this.tripStatus[id] = 'error'; this.tripErrors[id] = error.message; }
    this.emit();
  }
  async sendVoice(text) {
    const token = this.generation;
    const result = await this.adapter.sendVoiceCommand(text);
    if (token === this.generation) await this.refresh(true);
    return result;
  }
}
