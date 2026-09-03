<?php

namespace App\Http\Controllers\Users;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PendingUsersExcelExport;
use App\Support\ExportFilterSummary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserExportController extends Controller
{
    // FR-USR: export daftar user yang belum mengaktifkan akun (email_verified_at NULL),
    // lintas semua role. Mengikuti filter yang sedang aktif di halaman Users.
    public function __invoke(Request $request): StreamedResponse|RedirectResponse
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

        // A leftover search term (say "Choi") narrows this to nothing and PhpSpreadsheet
        // happily writes a header-only workbook — indistinguishable from a broken export.
        // Send the user back to the page with an explanation instead.
        if ((clone $query)->count() === 0) {
            return redirect()->back()->with(
                'error',
                'Tidak ada user belum aktivasi yang cocok' . ExportFilterSummary::describe($request, [
                    'search' => 'pencarian',
                    'role'   => 'role',
                    'status' => 'status',
                ]) . '. Bersihkan filter lalu coba lagi.',
            );
        }

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
