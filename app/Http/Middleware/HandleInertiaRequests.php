<?php

namespace App\Http\Middleware;

use App\Models\InAppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = Auth::user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'                 => $user->id,
                    'name'               => $user->name,
                    'email'              => $user->email,
                    'role'               => $user->role,
                    'initials'           => $user->initials,
                    'preferred_language' => $user->preferred_language,
                ] : null,
            ],
            'locale' => app()->getLocale(),
            'show_get_started_modal' => fn () => $request->session()->get('show_get_started_modal', false),
            'unreadNotifications' => fn () => $user
                ? InAppNotification::where('user_id', $user->id)->where('is_read', false)->count()
                : 0,
            'recentNotifications' => fn () => $user
                ? InAppNotification::where('user_id', $user->id)
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get()
                    ->map(fn ($n) => [
                        'id'         => $n->id,
                        'type'       => $n->type,
                        'title'      => $n->title,
                        'body'       => $n->body,
                        'action_url' => $n->action_url,
                        'is_read'    => $n->is_read,
                        'created_at' => $n->created_at->diffForHumans(),
                    ])->all()
                : [],
            'flash' => [
                'success' => fn () => $request->session()->get('status'),
                'error'   => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
