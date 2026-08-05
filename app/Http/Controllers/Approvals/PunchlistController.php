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
use Illuminate\Support\Facades\Storage;

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
            'action'        => ['required', 'in:verify,reject'],
            'notes'         => ['required_if:action,reject', 'nullable', 'string'],
            'evidence_file' => ['required_if:action,reject', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $action = $request->input('action');

        $evidencePath = null;
        $evidenceName = null;
        if ($request->hasFile('evidence_file')) {
            $evidenceFile = $request->file('evidence_file');
            $evidencePath = $evidenceFile->store('documents/approval-evidence');
            $evidenceName = $evidenceFile->getClientOriginalName();
        }

        DB::transaction(function () use ($user, $document, $myVerification, $action, $request, $evidencePath, $evidenceName) {
            if ($action === 'verify') {
                $myVerification->update([
                    'status'      => 'verified',
                    'verified_at' => now(),
                ]);

                $allVerified = ! $document->punchlistVerifications()
                    ->where('status', '!=', 'verified')
                    ->exists();

                if ($allVerified) {
                    // Status changes are stamped onto the cached final PDF — invalidate
                    // it so /documents/{id}/pdf regenerates with the '16' label instead
                    // of continuing to serve the '15'-stamped copy forever.
                    $document->update(['status_code' => '16', 'final_pdf_path' => null]);

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
                    'status'                      => 'rejected',
                    'notes'                       => $request->input('notes'),
                    'evidence_path'               => $evidencePath,
                    'evidence_original_filename'  => $evidenceName,
                ]);

                $document->update(['status_code' => '14', 'final_pdf_path' => null]);

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

    // GET /documents/{id}/punchlist-verifications/{verificationId}/evidence
    public function downloadEvidence(Request $request, string $id, string $verificationId)
    {
        $user         = $request->user();
        $document     = Document::with('punchlistVerifications')->findOrFail($id);
        $verification = $document->punchlistVerifications->firstWhere('id', $verificationId);

        abort_if(! $verification, 404);

        if ($user->role === 'partner') {
            abort_if($document->submitted_by !== $user->id, 403);
        } elseif (! in_array($user->role, ['admin', 'super_admin', 'viewer']) && $verification->approver_id !== $user->id) {
            abort(403);
        }

        abort_if(! $verification->evidence_path || ! Storage::exists($verification->evidence_path), 404, 'Evidence file not found.');

        return Storage::response($verification->evidence_path, $verification->evidence_original_filename ?? 'evidence');
    }
}
