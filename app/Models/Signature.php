<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Signature extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'image_path',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Clear the cached signed PDF (`documents.final_pdf_path`) for every document
     * whose approval steps reference any signature belonging to this user, so a
     * signature that was replaced / re-activated / deleted via the profile screen
     * actually propagates to already-generated PDFs. Returns the number of
     * documents whose cache was cleared.
     */
    public static function invalidateFinalPdfsForUser(string $userId): int
    {
        $signatureIds = static::where('user_id', $userId)->pluck('id');

        if ($signatureIds->isEmpty()) {
            return 0;
        }

        $documentIds = ApprovalStep::whereIn('signature_id', $signatureIds)
            ->pluck('document_id')
            ->unique();

        if ($documentIds->isEmpty()) {
            return 0;
        }

        return Document::whereIn('id', $documentIds)->update(['final_pdf_path' => null]);
    }
}
