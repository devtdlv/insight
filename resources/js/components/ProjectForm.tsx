import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { paths } from '../lib/paths.ts';
import type { ProjectSummary } from '../types/index.ts';
import { Button } from './Button.tsx';
import { SelectField } from './SelectField.tsx';
import { TextArea } from './TextArea.tsx';
import { TextField } from './TextField.tsx';

export function ProjectForm({
  workspaceId,
  project,
  timezones,
}: {
  workspaceId: number;
  project?: ProjectSummary;
  timezones: string[];
}) {
  const form = useForm({
    name: project?.name ?? '',
    description: project?.description ?? '',
    website_url: project?.websiteUrl ?? '',
    timezone: project?.timezone ?? 'UTC',
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (project) {
      form.patch(paths.project(workspaceId, project.id));
      return;
    }

    form.post(paths.projects(workspaceId));
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <TextField
        id="name"
        label="Name"
        value={form.data.name}
        error={form.errors.name}
        autoComplete="off"
        onChange={(value) => form.setData('name', value)}
      />
      <TextArea
        id="description"
        label="Description"
        value={form.data.description}
        error={form.errors.description}
        hint="Optional. Say which website or application this project represents."
        onChange={(value) => form.setData('description', value)}
      />
      <TextField
        id="website_url"
        label="Website URL"
        type="text"
        value={form.data.website_url}
        error={form.errors.website_url}
        hint="Optional. Use an https address."
        autoComplete="url"
        required={false}
        onChange={(value) => form.setData('website_url', value)}
      />
      <SelectField
        id="timezone"
        label="Timezone"
        value={form.data.timezone}
        options={timezones}
        error={form.errors.timezone}
        hint="Used later when event times are shown. No events are collected yet."
        onChange={(value) => form.setData('timezone', value)}
      />
      <Button type="submit" disabled={form.processing}>
        {project
          ? form.processing
            ? 'Saving...'
            : 'Save project'
          : form.processing
            ? 'Creating project...'
            : 'Create project'}
      </Button>
    </form>
  );
}
