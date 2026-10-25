<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\WorkspaceMembership;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that Inertia renders inside.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Define the props shared with every Inertia response.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $status = $request->session()->get('status');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                ] : null,
            ],
            'workspaces' => $user instanceof User ? $this->workspacesFor($user) : [],
            'flash' => [
                'status' => is_string($status) ? $status : null,
            ],
        ];
    }

    /**
     * @return list<array{id: int, name: string, role: string}>
     */
    private function workspacesFor(User $user): array
    {
        return $user->memberships()
            ->with('workspace:id,name')
            ->get()
            ->sortBy(fn (WorkspaceMembership $membership) => mb_strtolower($membership->workspace->name))
            ->map(fn (WorkspaceMembership $membership) => [
                'id' => $membership->workspace->id,
                'name' => $membership->workspace->name,
                'role' => $membership->role->value,
            ])
            ->values()
            ->all();
    }
}
