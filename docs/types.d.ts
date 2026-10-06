/** 建议协议，待树莓派后端确认；与模拟模式共用。所有可缺失采样用 null。 */
export type ISOTime = string;
export type ModuleState = 'online' | 'offline' | 'error' | 'unknown';
export type RiskLevel = 'normal' | 'attention' | 'warning' | 'high' | 'unknown';
export interface Sample<T> { value: T | null; updatedAt: ISOTime | null; module: ModuleState; valid: boolean | null; error: string | null }
export interface Location { latitude: number; longitude: number; label?: string | null }
export interface Connection { state: 'connected' | 'disconnected' | 'loading'; receivedAt: ISOTime | null; lastConnectedAt: ISOTime | null; lastError: string | null }
export interface Ride { fix: 'fixed' | 'searching' | 'unavailable'; speedKmh: number | null; location: Location | null; durationSec: number | null; tripId: string | null }
export interface HardwareFeedback { state: 'on' | 'off' | 'unknown'; confirmedAt: ISOTime; }
export interface Device { output: 'on' | 'off' | 'unknown'; mode: 'auto' | 'manual'; source: 'light_rule' | 'environment_rule' | 'voice'; reason: string | null; hardwareFeedback: HardwareFeedback | null }
export interface Target { id?: string; label: string; confidence: number | null; box: { x: number; y: number; width: number; height: number } | null }
export interface Frame { url: string | null; capturedAt: ISOTime | null; width: number | null; height: number | null }
export interface Reminder { id?: string; reason: string | null; text: string | null; triggeredAt: ISOTime | null; status: 'queued' | 'playing' | 'played' | 'failed' | 'unknown' }
export interface VoiceRecord { id: string; text: string | null; intent: 'turn_on' | 'turn_off' | 'restore_auto' | null; target: 'lamp' | 'fan' | null; receivedAt: ISOTime | null; outputUpdatedAt: ISOTime | null; status: 'received' | 'output_updated' | 'failed'; error: string | null; hardwareFeedback: HardwareFeedback | null }
export interface Snapshot {
  schemaVersion: '1.0'; sampledAt: ISOTime | null; connection: Connection;
  ride: Sample<Ride>;
  risk: Sample<{ level: RiskLevel; reasons: string[]; distanceAssociation: null }>;
  ultrasound: Sample<{ distanceM: number | null }>;
  vision: Sample<{ targets: Target[] | null; frame: Frame | null; distanceAssociation: null }>;
  imu: Sample<{ motion: string | null; label: string | null; acceleration: { x: number | null; y: number | null; z: number | null } | null }>;
  light: Sample<{ lux: number | null; level: string | null }>;
  environment: Sample<{ temperatureC: number | null; humidityPct: number | null; comfort: string | null }>;
  devices: Sample<{ lamp: Device | null; fan: Device | null; voicePlayer: { status: 'ready' | 'playing' | 'error' | 'unknown'; hardwareFeedback: null } | null }>;
  voice: Sample<{ latest: VoiceRecord | null; reminders: Reminder[] }>;
  trends?: { distance: { timestamp: ISOTime; value: number | null }[]; environment: { timestamp: ISOTime; temperatureC: number | null; humidityPct: number | null }[] };
}
export type EventType = 'proximity' | 'vision' | 'sudden_brake' | 'vibration' | 'suspected_collision' | 'suspected_fall';
export interface SafetyEvent { id: string; type: EventType; level: RiskLevel | null; occurredAt: ISOTime | null; reason: string | null; location: Location | null; speedKmh: number | null; distanceM: number | null; targets: Target[] | null; screenshotUrl: string | null; tripId: string | null; reminder: Reminder | null }
export interface TripSummary { id: string; name: string | null; startedAt: ISOTime | null; endedAt: ISOTime | null; durationSec: number | null; distanceKm: number | null; avgSpeedKmh: number | null; maxSpeedKmh: number | null; eventIds: string[] }
export interface Trip extends TripSummary { points: (Location & { timestamp: ISOTime })[]; basemap: { status: 'available' | 'unavailable'; imageUrl: string | null; bounds: { north: number; south: number; east: number; west: number } | null } }
export interface ListResponse<T> { items: T[] }
export interface ErrorResponse { code: string; message: string }
export interface CommandRequest { text: string; source: 'voice'; clientRequestId: string }
