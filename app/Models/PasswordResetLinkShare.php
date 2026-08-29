<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PasswordResetLinkShare extends Model
{
    use HasUuids;

    // Append-only: no updated_at
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'shared_by',
        'terms_accepted_at',
        'evidence_path',
        'evidence_original_filename',
        'note',
    ];

    protected $casts = [
        'terms_accepted_at' => 'datetime',
        'created_at'        => 'datetime',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            $model->created_at ??= now();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by');
    }
}
