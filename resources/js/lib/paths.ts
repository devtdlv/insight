export const paths = {
  workspaces: () => '/workspaces',
  workspaceCreate: () => '/workspaces/create',
  workspace: (id: number) => `/workspaces/${id}`,
  workspaceSettings: (id: number) => `/workspaces/${id}/settings`,
  workspaceMembers: (id: number) => `/workspaces/${id}/members`,
  projects: (workspaceId: number) => `/workspaces/${workspaceId}/projects`,
  projectCreate: (workspaceId: number) =>
    `/workspaces/${workspaceId}/projects/create`,
  project: (workspaceId: number, projectId: number) =>
    `/workspaces/${workspaceId}/projects/${projectId}`,
  projectSettings: (workspaceId: number, projectId: number) =>
    `/workspaces/${workspaceId}/projects/${projectId}/settings`,
  projectTracking: (workspaceId: number, projectId: number) =>
    `/workspaces/${workspaceId}/projects/${projectId}/tracking`,
  projectEvents: (workspaceId: number, projectId: number) =>
    `/workspaces/${workspaceId}/projects/${projectId}/events`,
  projectWriteKey: (workspaceId: number, projectId: number) =>
    `/workspaces/${workspaceId}/projects/${projectId}/write-key`,
  projectArchive: (workspaceId: number, projectId: number) =>
    `/workspaces/${workspaceId}/projects/${projectId}/archive`,
  projectRestore: (workspaceId: number, projectId: number) =>
    `/workspaces/${workspaceId}/projects/${projectId}/restore`,
};

export function roleLabel(role: 'owner' | 'admin' | 'member'): string {
  if (role === 'owner') {
    return 'Owner';
  }

  if (role === 'admin') {
    return 'Admin';
  }

  return 'Member';
}
