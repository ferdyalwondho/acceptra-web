<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    use HasUuids;

    // Append-only: no updated_at
    public $timestamps = false;

    protected $fillable = [
        'document_id',
        'user_id',
        'event',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'created_at' => 'datetime',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    protected static function booted(): void
    {
        // $timestamps is disabled (append-only, no updated_at), so created_at is
        // never auto-managed by Eloquent. Set it explicitly via now() (app timezone)
        // instead of relying on the DB column's CURRENT_TIMESTAMP default, which
        // evaluates in Postgres' session timezone (UTC), not Asia/Jakarta.
        static::creating(function (self $model) {
            $model->created_at ??= now();
        });
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
