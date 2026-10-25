export type HealthResponse = {
  status: 'ok';
  service: 'insight-api';
};

export type HealthState = 'pending' | 'connected' | 'unavailable';

export type AuthUser = {
  id: number;
  name: string;
};

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type WorkspaceSummary = {
  id: number;
  name: string;
  role: WorkspaceRole;
};

export type WorkspaceDetail = WorkspaceSummary & {
  canManage: boolean;
};

export type ProjectSummary = {
  id: number;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  timezone: string;
  archivedAt: string | null;
  canManage: boolean;
};

export type WorkspaceMember = {
  id: number;
  name: string;
  role: WorkspaceRole;
};

export type SharedProps = {
  name: string;
  auth: {
    user: AuthUser | null;
  };
  workspaces: WorkspaceSummary[];
  flash: {
    status: string | null;
  };
};
