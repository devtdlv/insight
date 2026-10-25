export type HealthResponse = {
  status: 'ok';
  service: 'insight-api';
};

export type HealthState = 'pending' | 'connected' | 'unavailable';
