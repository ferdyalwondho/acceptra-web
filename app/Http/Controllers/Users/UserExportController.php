<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PendingUsersExcelExport;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserExportController extends Controller
{
    // FR-USR: export daftar user yang belum mengaktifkan akun (email_verified_at NULL),
    // lintas semua role. Mengikuti filter yang sedang aktif di halaman Users.
    public function __invoke(Request $request): StreamedResponse
    {
        abort_if($request->user()->role !== 'super_admin', 403);

        $query = User::query()
            ->with('partner')
            ->whereNull('email_verified_at');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $query->orderBy('created_at', 'desc');

        $filename = 'pending_users_export_' . now()->format('Ymd_His') . '.xlsx';

        return response()->streamDownload(
            fn () => (new PendingUsersExcelExport)->stream($query),
            $filename,
            [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ],
        );
    }
}
