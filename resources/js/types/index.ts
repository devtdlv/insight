export type HealthResponse = {
  status: 'ok';
  service: 'insight-api';
};

export type HealthState = 'pending' | 'connected' | 'unavailable';

export type AuthUser = {
  id: number;
  name: string;
};

export type SharedProps = {
  name: string;
  auth: {
    user: AuthUser | null;
  };
  flash: {
    status: string | null;
  };
};
