<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditService
{
    /**
     * Append an immutable audit entry for a document.
     *
     * Pass the authenticated user's ID for human-triggered events.
     * Pass null for system-generated events (e.g. document.auto_approved_l1, pdf.stamped).
     *
     * Include 'level' in $metadata for any step-level events so that
     * the Partner role filter (level <= 1) works correctly in DocumentController@show.
     */
    public static function log(
        string  $documentId,
        string  $event,
        string  $description,
        array   $metadata = [],
        ?string $userId   = null
    ): void {
        AuditLog::create([
            'document_id' => $documentId,
            'user_id'     => $userId,
            'event'       => $event,
            'description' => $description,
            'metadata'    => empty($metadata) ? null : $metadata,
        ]);
    }
}
