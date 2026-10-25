<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Workspace;
use App\Support\Tenant;

class UpdateProjectRequest extends StoreProjectRequest
{
    public function authorize(): bool
    {
        $workspace = $this->route('workspace');
        $project = $this->route('project');
        abort_unless($workspace instanceof Workspace && $project instanceof Project, 404);
        Tenant::manageProject($this, $workspace, $project);

        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Workspace $workspace */
        $workspace = $this->route('workspace');
        /** @var Project $project */
        $project = $this->route('project');

        return $this->projectRules($workspace, $project);
    }
}
