import { PageHeader } from '../../components/PageHeader.tsx';
import { ProjectForm } from '../../components/ProjectForm.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { AppLayout } from '../../layouts/AppLayout.tsx';
import type { WorkspaceDetail } from '../../types/index.ts';

export default function CreateProject({
  workspace,
  timezones,
}: {
  workspace: WorkspaceDetail;
  timezones: string[];
}) {
  return (
    <AppLayout title="Create a project">
      <PageHeader
        eyebrow={workspace.name}
        title="Create a project"
        description="A project is a website or application. Creating one does not collect events."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <div className="max-w-xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <ProjectForm workspaceId={workspace.id} timezones={timezones} />
      </div>
    </AppLayout>
  );
}
