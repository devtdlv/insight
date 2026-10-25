import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '../../components/Button.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { TextField } from '../../components/TextField.tsx';
import { AppLayout } from '../../layouts/AppLayout.tsx';
import { paths } from '../../lib/paths.ts';

export default function CreateWorkspace() {
  const form = useForm({
    name: '',
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    form.post(paths.workspaces());
  }

  return (
    <AppLayout title="Create a workspace">
      <PageHeader
        eyebrow="Workspaces"
        title="Create a workspace"
        description="You will be the owner. This does not start event collection."
      />
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
          {form.processing ? 'Creating workspace...' : 'Create workspace'}
        </Button>
      </form>
    </AppLayout>
  );
}
