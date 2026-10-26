<?php

namespace App\Console\Commands;

use App\Enums\WorkspaceRole;
use App\Models\AnalyticsEvent;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Support\Demo\DemoAnalyticsGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Local-only generator of a fictional analytics dataset for screenshots.
 *
 * It only ever adds rows: a new workspace, one membership, one project and
 * that project's events. It never updates or deletes existing data, and it
 * refuses to run when a demo workspace or project already exists.
 */
class SeedDemoAnalytics extends Command
{
    public const WORKSPACE_NAME = 'Showcase Labs';

    public const PROJECT_NAME = 'Atlas Demo';

    public const PROJECT_TIMEZONE = 'America/New_York';

    private const BATCH_SIZE = 250;

    protected $signature = 'insight:seed-demo
        {--user= : Email of the existing user who will own the demo workspace}
        {--seed=42 : Integer seed, so the same value gives the same dataset}';

    protected $description = 'Create a fictional "Showcase Labs / Atlas Demo" project with about 12,000 events (local only)';

    public function handle(): int
    {
        if (! $this->laravel->environment('local')) {
            $this->components->error('This command only runs when APP_ENV is "local". Nothing was changed.');

            return self::FAILURE;
        }

        $email = $this->option('user');

        if (! is_string($email) || trim($email) === '') {
            $this->components->error('Pass the owner with --user=<email>. There is no signed-in user in the CLI, so none is assumed.');

            return self::FAILURE;
        }

        $seedOption = $this->option('seed');

        if (! is_scalar($seedOption) || filter_var($seedOption, FILTER_VALIDATE_INT) === false) {
            $this->components->error('--seed must be an integer.');

            return self::FAILURE;
        }

        $user = User::query()->where('email', trim($email))->first();

        if (! $user instanceof User) {
            $this->components->error("No user with the email {$email} exists. Create or register that account first. Nothing was changed.");

            return self::FAILURE;
        }

        $existingWorkspace = Workspace::query()->where('name', self::WORKSPACE_NAME)->exists();
        $existingProject = Project::query()->where('name', self::PROJECT_NAME)->exists();

        if ($existingWorkspace || $existingProject) {
            $this->components->warn('Demo data already exists ("'.self::WORKSPACE_NAME.'" or "'.self::PROJECT_NAME.'"). Nothing was changed, and nothing is deleted or regenerated.');

            return self::FAILURE;
        }

        $generator = new DemoAnalyticsGenerator(
            seed: (int) $seedOption,
            now: now()->toImmutable(),
            timezone: self::PROJECT_TIMEZONE,
        );

        $inserted = 0;
        $project = null;

        DB::transaction(function () use ($user, $generator, &$inserted, &$project): void {
            $workspace = Workspace::query()->create(['name' => self::WORKSPACE_NAME]);
            $workspace->memberships()->create([
                'user_id' => $user->id,
                'role' => WorkspaceRole::Owner,
            ]);

            $project = $workspace->projects()->create([
                'name' => self::PROJECT_NAME,
                'description' => 'Fictional demo data created by insight:seed-demo. These events are not real analytics.',
                'website_url' => null,
                'timezone' => self::PROJECT_TIMEZONE,
            ]);

            $batch = [];

            foreach ($generator->events() as $row) {
                $row['project_id'] = $project->id;
                $row['properties'] = $row['properties'] === null ? null : json_encode($row['properties']);
                $batch[] = $row;

                if (count($batch) >= self::BATCH_SIZE) {
                    AnalyticsEvent::query()->insert($batch);
                    $inserted += count($batch);
                    $batch = [];
                }
            }

            if ($batch !== []) {
                AnalyticsEvent::query()->insert($batch);
                $inserted += count($batch);
            }
        });

        if (! $project instanceof Project) {
            return self::FAILURE;
        }

        $this->components->info("Created fictional demo data for {$user->email}.");
        $this->line('  Workspace: '.self::WORKSPACE_NAME." (id {$project->workspace_id})");
        $this->line('  Project:   '.self::PROJECT_NAME." (id {$project->id}, timezone ".self::PROJECT_TIMEZONE.')');
        $this->line("  Events:    {$inserted}");
        $this->line("  Open:      /workspaces/{$project->workspace_id}/projects/{$project->id}");
        $this->line('  Database:  '.config('database.default').' / '.config('database.connections.'.config('database.default').'.database'));

        return self::SUCCESS;
    }
}
