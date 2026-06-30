<?php

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use App\Models\InAppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    // GET /notifications — halaman penuh (paginated)
    public function index(Request $request): Response
    {
        $userId = Auth::id();

        $paginated = InAppNotification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->through(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->type,
                'title'      => $n->title,
                'body'       => $n->body,
                'action_url' => $n->action_url,
                'is_read'    => $n->is_read,
                'created_at' => $n->created_at->diffForHumans(),
            ]);

        $unreadCount = InAppNotification::where('user_id', $userId)
            ->where('is_read', false)
            ->count();

        return Inertia::render('Notifications/Index', [
            'notifications' => array_merge($paginated->toArray(), [
                'meta' => [
                    'total'        => $paginated->total(),
                    'unread_count' => $unreadCount,
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                ],
            ]),
        ]);
    }

    // POST /notifications/{id}/read — mark satu sebagai dibaca, redirect ke action_url
    public function markRead(Request $request, string $id): RedirectResponse
    {
        $notification = InAppNotification::where('user_id', Auth::id())
            ->findOrFail($id);

        if (! $notification->is_read) {
            $notification->update(['is_read' => true, 'read_at' => now()]);
        }

        return redirect($notification->action_url ?? '/notifications');
    }

    // POST /notifications/read-all — mark semua sebagai dibaca
    public function markAllRead(Request $request): RedirectResponse
    {
        InAppNotification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return back();
    }

    // GET /api/notifications/unread-count — JSON per spec §4.2
    public function unreadCount(Request $request): JsonResponse
    {
        $count = InAppNotification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    // GET /api/notifications/recent?limit=10 — JSON per spec §4.2
    public function recent(Request $request): JsonResponse
    {
        $limit = min((int) $request->query('limit', 10), 20);

        $items = InAppNotification::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->type,
                'title'      => $n->title,
                'body'       => $n->body,
                'action_url' => $n->action_url,
                'is_read'    => $n->is_read,
                'created_at' => $n->created_at->diffForHumans(),
            ]);

        return response()->json(['data' => $items]);
    }
}
