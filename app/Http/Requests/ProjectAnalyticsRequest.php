<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Workspace;
use App\Support\Analytics\DateRangeResolver;
use App\Support\Tenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Query parameters for the project overview analytics: range, from, to.
 *
 * The date rules live in DateRangeResolver::validate(); this request only adds
 * authorization, type checks, and the range/from/to combination rule.
 * Tenant selection (project, workspace, timezone) always comes from the route
 * and the project record, never from the query string.
 */
class ProjectAnalyticsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $workspace = $this->route('workspace');
        $project = $this->route('project');
        abort_unless($workspace instanceof Workspace && $project instanceof Project, 404);

        Tenant::project($workspace, $project);
        Tenant::role($this, $workspace);
        abort_unless($this->user()?->can('view', $project) === true, 404);

        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'range' => ['nullable', 'string'],
            'from' => ['nullable', 'string'],
            'to' => ['nullable', 'string'],
            'project_id' => ['prohibited'],
            'workspace_id' => ['prohibited'],
            'timezone' => ['prohibited'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $range = $this->filled('range') ? (string) $this->input('range') : null;
            $from = $this->filled('from') ? (string) $this->input('from') : null;
            $to = $this->filled('to') ? (string) $this->input('to') : null;
            $custom = ($range ?? DateRangeResolver::DEFAULT_RANGE) === DateRangeResolver::CUSTOM;

            if (! $custom) {
                foreach (['from' => $from, 'to' => $to] as $field => $value) {
                    if ($value !== null) {
                        $validator->errors()->add($field, "The {$field} date can only be used with range=custom.");
                    }
                }
            }

            /** @var Project $project */
            $project = $this->route('project');

            $errors = (new DateRangeResolver)->validate($project->timezone, $range, $from, $to);

            foreach ($errors as $field => $message) {
                $validator->errors()->add($field, $message);
            }
        }];
    }

    /** Send invalid requests back to the plain overview instead of the invalid URL. */
    protected function getRedirectUrl(): string
    {
        /** @var Workspace $workspace */
        $workspace = $this->route('workspace');
        /** @var Project $project */
        $project = $this->route('project');

        return route('projects.show', [$workspace, $project]);
    }
}
