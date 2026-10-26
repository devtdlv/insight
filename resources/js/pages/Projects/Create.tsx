import { PageHeader } from '../../components/PageHeader.tsx';
import { ProjectForm } from '../../components/ProjectForm.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import type { WorkspaceDetail } from '../../types/index.ts';

function CreateProject({
  workspace,
  timezones,
}: {
  workspace: WorkspaceDetail;
  timezones: string[];
}) {
  return (
    <>
      <PageHeader
        eyebrow={workspace.name}
        title="Create a project"
        description="A project is a website or application. Events are recorded only when that application calls the SDK."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <div className="max-w-xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <ProjectForm workspaceId={workspace.id} timezones={timezones} />
      </div>
    </>
  );
}

appPage(CreateProject, 'Create a project');

export default CreateProject;
