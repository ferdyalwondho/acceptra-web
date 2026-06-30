<?php

namespace App\Http\Controllers\Approvals;

use App\Http\Controllers\Controller;
use App\Jobs\NotifyAdminsJob;
use App\Models\Document;
use App\Models\PunchlistVerification;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PunchlistController extends Controller
{
    // POST /documents/{id}/verify
    public function verify(Request $request, string $id): RedirectResponse
    {
        $user     = $request->user();
        $document = Document::with('punchlistVerifications.approver')->findOrFail($id);

        abort_if($document->status_code !== '15', 422, 'Document is not awaiting punchlist verification.');

        $myVerification = $document->punchlistVerifications
            ->firstWhere('approver_id', $user->id);

        abort_if(! $myVerification, 403, 'You are not a punchlist verifier for this document.');
        abort_if($myVerification->status !== 'pending', 422, 'You have already submitted your verification.');

        $request->validate([
            'action' => ['required', 'in:verify,reject'],
            'notes'  => ['required_if:action,reject', 'nullable', 'string'],
        ]);

        $action = $request->input('action');

        DB::transaction(function () use ($user, $document, $myVerification, $action, $request) {
            if ($action === 'verify') {
                $myVerification->update([
                    'status'      => 'verified',
                    'verified_at' => now(),
                ]);

                $allVerified = ! $document->punchlistVerifications()
                    ->where('status', '!=', 'verified')
                    ->exists();

                if ($allVerified) {
                    $document->update(['status_code' => '16']);

                    AuditService::log(
                        $document->id,
                        'punchlist.verified',
                        "All punchlist verifications complete. Document closed.",
                        [],
                        $user->id,
                    );
                }
            } else {
                $myVerification->update([
                    'status' => 'rejected',
                    'notes'  => $request->input('notes'),
                ]);

                $document->update(['status_code' => '14']);

                // Reset other verifications to pending so admin can re-upload
                $document->punchlistVerifications()
                    ->where('id', '!=', $myVerification->id)
                    ->where('status', 'verified')
                    ->update(['status' => 'pending', 'verified_at' => null]);

                AuditService::log(
                    $document->id,
                    'punchlist.revision_rejected',
                    "Punchlist revision rejected by {$user->name}: {$request->input('notes')}",
                    [],
                    $user->id,
                );
            }
        });

        $document->refresh();

        if ($action === 'verify' && $document->status_code === '16') {
            NotifyAdminsJob::dispatch($document, 'flow_completed');
            $flash = 'All verifications complete. Document is now Closed (status 16).';
        } elseif ($action === 'verify') {
            $flash = 'Verification recorded. Waiting for other approvers.';
        } else {
            NotifyAdminsJob::dispatch($document, 'rejected');
            $flash = 'Revision rejected. Admin will be notified to upload a new revision.';
        }

        return redirect()->route('approvals.index')->with('success', $flash);
    }
}
