<?php

namespace App\Http\Requests;

use App\Models\Workspace;
use App\Support\Tenant;
use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkspaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $workspace = $this->route('workspace');
        abort_unless($workspace instanceof Workspace, 404);
        Tenant::manage($this, $workspace);

        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge([
                'name' => trim($this->string('name')->toString()),
            ]);
        }
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
        ];
    }
}
