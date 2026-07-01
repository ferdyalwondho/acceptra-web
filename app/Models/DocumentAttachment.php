<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DocumentAttachment extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'document_id',
        'type',
        'file_path',
        'original_filename',
        'file_size_bytes',
        'uploaded_by',
        'notes',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    protected static function booted(): void
    {
        // $timestamps is disabled, so created_at is never auto-managed by Eloquent.
        // Set it explicitly via now() (app timezone) instead of relying on the DB
        // column's CURRENT_TIMESTAMP default, which evaluates in Postgres' session
        // timezone (UTC), not Asia/Jakarta.
        static::creating(function (self $model) {
            $model->created_at ??= now();
        });
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
