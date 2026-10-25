import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { ProjectForm } from '../../components/ProjectForm.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { AppLayout } from '../../layouts/AppLayout.tsx';
import { paths } from '../../lib/paths.ts';
import type { ProjectSummary, WorkspaceDetail } from '../../types/index.ts';
import { Button } from '../../components/Button.tsx';

export default function ProjectSettings({
  workspace,
  project,
  timezones,
}: {
  workspace: WorkspaceDetail;
  project: ProjectSummary;
  timezones: string[];
}) {
  const [confirming, setConfirming] = useState(false);
  const archiveForm = useForm({});

  function archive() {
    archiveForm.post(paths.projectArchive(workspace.id, project.id));
  }

  function restore() {
    archiveForm.post(paths.projectRestore(workspace.id, project.id));
  }

  return (
    <AppLayout title={`${project.name} settings`}>
      <PageHeader
        eyebrow="Project settings"
        title={project.name}
        description="Update the project details, or archive it when it should leave the active list. Archiving does not delete the project."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <div className="max-w-xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <ProjectForm
          workspaceId={workspace.id}
          project={project}
          timezones={timezones}
        />
      </div>
      <section className="max-w-xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="text-xl text-ink">
          {project.archivedAt ? 'Restore project' : 'Archive project'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {project.archivedAt
            ? 'Restoring puts this project back in the active list.'
            : 'Archived projects stay in this workspace and can be restored. No analytics are deleted, because event collection is not available yet.'}
        </p>
        {project.archivedAt ? (
          <Button
            type="button"
            className="mt-5"
            variant="secondary"
            disabled={archiveForm.processing}
            onClick={restore}
          >
            {archiveForm.processing ? 'Working...' : 'Restore project'}
          </Button>
        ) : (
          <Button
            type="button"
            className="mt-5"
            variant="danger"
            onClick={() => setConfirming(true)}
          >
            Archive project
          </Button>
        )}
      </section>
      {confirming ? (
        <ConfirmDialog
          title={`Archive ${project.name}?`}
          description="The project stays in this workspace and can be restored. This does not remove analytics, because none are collected yet."
          confirmLabel="Archive project"
          pending={archiveForm.processing}
          onConfirm={archive}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </AppLayout>
  );
}
