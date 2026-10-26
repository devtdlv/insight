import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { CopyButton } from '../../components/CopyButton.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { ProjectSectionNav } from '../../components/ProjectSectionNav.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import { paths } from '../../lib/paths.ts';
import type { TrackingProject, WorkspaceDetail } from '../../types/index.ts';

function ProjectTracking({
  workspace,
  project,
  endpoint,
}: {
  workspace: WorkspaceDetail;
  project: TrackingProject;
  endpoint: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const rotateForm = useForm({});
  const sample = `import { Insight } from '@insight/sdk';

const insight = new Insight({
  writeKey: '${project.writeKey}',
  endpoint: '${endpoint}',
});

insight.track('note_created', {
  notebook: 'Field notes',
});`;

  function rotate() {
    rotateForm.post(paths.projectWriteKey(workspace.id, project.id), {
      onSuccess: () => setConfirming(false),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={workspace.name}
        title="Tracking setup"
        description="Send named events from your application. Insight does not record page views, clicks, or form contents on its own."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <ProjectSectionNav
        workspaceId={workspace.id}
        projectId={project.id}
        canManage={project.canManage}
        current="tracking"
      />
      {project.archivedAt ? (
        <p
          className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning"
          role="status"
        >
          This project is archived, so Insight will reject new events until it
          is restored.
        </p>
      ) : null}
      <section className="max-w-3xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="text-xl text-ink">Public write key</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This key is public. It will be visible in the browser code of the
          application you track. It can only record events. It cannot read
          events, change project settings, or open this workspace.
        </p>
        <p className="mt-4 overflow-x-auto rounded-lg bg-canvas px-3 py-3 font-mono text-sm break-all text-ink">
          {project.writeKey}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton value={project.writeKey} label="Copy key" />
          {project.canManage ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirming(true)}
            >
              Rotate key
            </Button>
          ) : (
            <p className="self-center text-sm text-muted">
              Owners and admins can rotate this key.
            </p>
          )}
        </div>
      </section>
      <section className="max-w-3xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="text-xl text-ink">Install the SDK</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The SDK is not published to npm. Copy <code>sdk/src/index.ts</code>{' '}
          into the application, or point the bundler at that file. The import
          below is the package name to use when you bundle it yourself.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted">
          Endpoint: <span className="font-mono text-ink">{endpoint}</span>
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-canvas p-4 text-sm leading-6 text-ink">
          <code>{sample}</code>
        </pre>
        <div className="mt-4">
          <CopyButton value={sample} label="Copy example" />
        </div>
      </section>
      <section className="max-w-3xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="text-xl text-ink">Identity and privacy</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6 text-muted">
          <li>
            Insight creates a random anonymous id and, by default, stores it in
            localStorage. It does not set a cookie.
          </li>
          <li>
            Pass <code>persistence: &apos;memory&apos;</code> to keep that id
            only for the current page.
          </li>
          <li>
            Call <code>identify()</code> with an id your application already
            has. Do not pass an email address.
          </li>
          <li>
            Call <code>reset()</code> to replace the anonymous id and clear the
            identified id.
          </li>
          <li>
            There is no automatic page tracking, click tracking, session
            recording, fingerprinting, or location lookup.
          </li>
          <li>Insight does not store IP addresses or user-agent strings.</li>
        </ul>
      </section>
      {confirming ? (
        <ConfirmDialog
          title="Rotate the write key?"
          description="The current key stops accepting events immediately. Update the application that sends events before it can record again."
          confirmLabel="Rotate key"
          pending={rotateForm.processing}
          onConfirm={rotate}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}

appPage(ProjectTracking, (props) => `${props.project.name} tracking`);

export default ProjectTracking;
