import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '../../components/Button.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { TextField } from '../../components/TextField.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { AppLayout } from '../../layouts/AppLayout.tsx';
import { paths } from '../../lib/paths.ts';
import type { WorkspaceDetail } from '../../types/index.ts';

export default function WorkspaceSettings({
  workspace,
}: {
  workspace: WorkspaceDetail;
}) {
  const form = useForm({
    name: workspace.name,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.patch(paths.workspace(workspace.id));
  }

  return (
    <AppLayout title={`${workspace.name} settings`}>
      <PageHeader
        eyebrow="Workspace settings"
        title="Rename workspace"
        description="Owners and admins can change the workspace name. Members cannot."
      />
      <WorkspaceNav workspace={workspace} current="settings" />
      <form
        className="max-w-xl rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]"
        onSubmit={submit}
        noValidate
      >
        <TextField
          id="name"
          label="Workspace name"
          value={form.data.name}
          error={form.errors.name}
          autoComplete="organization"
          onChange={(value) => form.setData('name', value)}
        />
        <Button type="submit" className="mt-5" disabled={form.processing}>
          {form.processing ? 'Saving...' : 'Save name'}
        </Button>
      </form>
    </AppLayout>
  );
}
