<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Workspace;
use App\Support\Tenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        $workspace = $this->route('workspace');
        abort_unless($workspace instanceof Workspace, 404);
        Tenant::manage($this, $workspace);
        abort_unless($this->user()?->can('create', [Project::class, $workspace]) === true, 403);

        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim($this->string('name')->toString()),
            'description' => $this->blankToNull('description'),
            'website_url' => $this->blankToNull('website_url'),
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Workspace $workspace */
        $workspace = $this->route('workspace');

        return $this->projectRules($workspace, null);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function projectRules(Workspace $workspace, ?Project $project): array
    {
        $uniqueName = Rule::unique('projects', 'name')->where('workspace_id', $workspace->id);

        if ($project instanceof Project) {
            $uniqueName = $uniqueName->ignore($project->id);
        }

        return [
            'name' => ['required', 'string', 'max:120', $uniqueName],
            'description' => ['nullable', 'string', 'max:2000'],
            'website_url' => ['nullable', 'string', 'max:255', 'url', 'regex:/^https?:\/\//i'],
            'timezone' => ['required', 'timezone'],
        ];
    }

    protected function blankToNull(string $key): ?string
    {
        if (! $this->has($key)) {
            return null;
        }

        $value = trim($this->string($key)->toString());

        return $value === '' ? null : $value;
    }
}
