export type InsightPersistence = 'local' | 'memory';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type InsightOptions = {
  writeKey: string;
  endpoint: string;
  persistence?: InsightPersistence;
  storagePrefix?: string;
  debug?: boolean;
  fetch?: typeof fetch;
};

export type TrackResult =
  { ok: true; status: 'accepted' | 'duplicate' } | { ok: false; error: string };

const namePattern = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/;
const identifierPattern = /^[A-Za-z0-9_-]{8,64}$/;

export class Insight {
  private readonly writeKey: string;
  private readonly endpoint: string;
  private readonly persistence: InsightPersistence;
  private readonly anonymousKey: string;
  private readonly userKey: string;
  private readonly debug: boolean;
  private readonly send: typeof fetch;
  private anonymousIdValue: string;
  private userIdValue: string | null;

  constructor(options: InsightOptions) {
    this.writeKey = options.writeKey.trim();
    this.endpoint = options.endpoint.trim();
    this.persistence = options.persistence ?? 'local';
    const prefix = options.storagePrefix?.trim() || 'insight';
    this.anonymousKey = `${prefix}.anonymous_id`;
    this.userKey = `${prefix}.user_id`;
    this.debug = options.debug === true;
    this.send = options.fetch ?? fetch.bind(globalThis);
    this.anonymousIdValue = this.readAnonymousId();
    this.userIdValue = this.readUserId();
  }

  anonymousId(): string {
    return this.anonymousIdValue;
  }

  userId(): string | null {
    return this.userIdValue;
  }

  identify(userId: string): boolean {
    const next = userId.trim();

    if (!identifierPattern.test(next)) {
      this.warn(
        'The user id must be 8 to 64 letters, numbers, underscores, or hyphens.',
      );

      return false;
    }

    this.userIdValue = next;
    this.writeStored(this.userKey, next);

    return true;
  }

  reset(): void {
    this.anonymousIdValue = this.createAnonymousId();
    this.userIdValue = null;
    this.writeStored(this.anonymousKey, this.anonymousIdValue);
    this.removeStored(this.userKey);
  }

  async track(
    name: string,
    properties?: { [key: string]: JsonValue },
  ): Promise<TrackResult> {
    const eventName = name.trim();

    if (this.writeKey === '' || this.endpoint === '') {
      return this.fail('Insight needs a write key and an endpoint.');
    }

    if (!namePattern.test(eventName)) {
      return this.fail('The event name is not valid.');
    }

    if (properties !== undefined && !this.propertiesFit(properties)) {
      return this.fail('The event properties are too large.');
    }

    const body: {
      write_key: string;
      name: string;
      anonymous_id: string;
      occurred_at: string;
      event_id: string;
      user_id?: string;
      properties?: { [key: string]: JsonValue };
    } = {
      write_key: this.writeKey,
      name: eventName,
      anonymous_id: this.anonymousIdValue,
      occurred_at: new Date().toISOString(),
      event_id: this.createEventId(),
    };

    if (this.userIdValue) {
      body.user_id = this.userIdValue;
    }

    if (properties !== undefined) {
      body.properties = properties;
    }

    try {
      const response = await this.send(this.endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'omit',
        keepalive: true,
      });

      if (!response.ok) {
        return this.fail('The event was rejected.');
      }

      const payload = (await response.json()) as { status?: string };

      if (payload.status === 'duplicate') {
        return { ok: true, status: 'duplicate' };
      }

      return { ok: true, status: 'accepted' };
    } catch {
      return this.fail('The event could not be sent.');
    }
  }

  private readAnonymousId(): string {
    const stored = this.readStored(this.anonymousKey);

    if (stored && identifierPattern.test(stored)) {
      return stored;
    }

    const created = this.createAnonymousId();
    this.writeStored(this.anonymousKey, created);

    return created;
  }

  private readUserId(): string | null {
    const stored = this.readStored(this.userKey);

    if (stored && identifierPattern.test(stored)) {
      return stored;
    }

    return null;
  }

  private readStored(key: string): string | null {
    if (this.persistence !== 'local') {
      return null;
    }

    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStored(key: string, value: string): void {
    if (this.persistence !== 'local') {
      return;
    }

    try {
      globalThis.localStorage.setItem(key, value);
    } catch {
      this.warn('Insight could not store the anonymous id in localStorage.');
    }
  }

  private removeStored(key: string): void {
    if (this.persistence !== 'local') {
      return;
    }

    try {
      globalThis.localStorage.removeItem(key);
    } catch {
      this.warn('Insight could not clear the stored identity.');
    }
  }

  private createAnonymousId(): string {
    return `anon_${this.randomHex(16)}`;
  }

  private createEventId(): string {
    return `evt_${this.randomHex(16)}`;
  }

  private randomHex(bytes: number): string {
    const values = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(values);

    return Array.from(values, (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('');
  }

  private propertiesFit(properties: { [key: string]: JsonValue }): boolean {
    try {
      return JSON.stringify(properties).length <= 8192;
    } catch {
      return false;
    }
  }

  private fail(error: string): TrackResult {
    this.warn(error);

    return { ok: false, error };
  }

  private warn(message: string): void {
    if (this.debug) {
      console.warn(message);
    }
  }
}
