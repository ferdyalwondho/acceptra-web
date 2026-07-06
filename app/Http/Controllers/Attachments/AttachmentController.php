<?php

namespace App\Http\Controllers\Attachments;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    private const ADMIN_ROLES  = ['admin', 'super_admin'];
    private const AVIAT_ROLES  = ['admin', 'super_admin', 'viewer'];
    private const APPROVER_ROLES = ['approver_ms_bo', 'approver_ms_bo_team', 'approver_ms_rts', 'approver_xls_rth_team', 'approver_xls_rth', 'approver_sme'];

    // GET /documents/{id}/attachments/{att_id}/download
    public function download(Request $request, string $documentId, string $attachmentId): StreamedResponse
    {
        $user       = $request->user();
        $document   = Document::with('approvalSteps')->findOrFail($documentId);
        $attachment = DocumentAttachment::where('id', $attachmentId)
            ->where('document_id', $documentId)
            ->firstOrFail();

        $this->authorizeAccess($user, $document);

        abort_if(! Storage::exists($attachment->file_path), 404, 'File not found.');

        return Storage::download($attachment->file_path, $attachment->original_filename);
    }

    // DELETE /documents/{id}/attachments/{att_id}
    public function destroy(Request $request, string $documentId, string $attachmentId): JsonResponse
    {
        $user       = $request->user();
        $document   = Document::findOrFail($documentId);
        $attachment = DocumentAttachment::where('id', $attachmentId)
            ->where('document_id', $documentId)
            ->firstOrFail();

        abort_if(! in_array($user->role, self::ADMIN_ROLES), 403, 'You are not authorized to delete attachments.');
        abort_if($document->status_code !== 'draft', 422, 'Cannot delete attachment on an active document.');

        Storage::delete($attachment->file_path);
        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted.']);
    }

    private function authorizeAccess(object $user, Document $document): void
    {
        // Aviat roles see all documents
        if (in_array($user->role, self::AVIAT_ROLES)) {
            return;
        }

        // Partner: only their own document
        if ($user->role === 'partner') {
            abort_if($document->submitted_by !== $user->id, 403, 'You are not authorized to access this attachment.');
            return;
        }

        // Approver: only documents where they have an approval step
        if (in_array($user->role, self::APPROVER_ROLES)) {
            $isInvolved = $document->approvalSteps
                ->contains(fn ($step) => $step->approver_id === $user->id);
            abort_if(! $isInvolved, 403, 'You are not authorized to access this attachment.');
            return;
        }

        abort(403, 'You are not authorized to access this attachment.');
    }
}
