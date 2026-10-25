import type { HealthResponse } from '../types/index.ts';

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);

  return (
    keys.length === 2 &&
    record.status === 'ok' &&
    record.service === 'insight-api'
  );
}

export async function fetchHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch('/api/v1/health', {
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  const body: unknown = await response.json();

  if (!isHealthResponse(body)) {
    throw new Error('Health check returned an unexpected payload');
  }

  return body;
}
