<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ApprovalStep extends Model
{
    use HasUuids;

    protected $fillable = [
        'document_id',
        'level_order',
        'role',
        'requires_signature',
        'approver_id',
        'status',
        'action_at',
        'signature_id',
        'punchlist_notes',
        'reject_reason',
        'is_offline',
        'offline_date',
        'offline_approver_name',
        'is_active',
    ];

    protected $casts = [
        'requires_signature' => 'boolean',
        'is_offline'         => 'boolean',
        'is_active'          => 'boolean',
        'action_at'          => 'datetime',
        'offline_date'       => 'date',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function signature(): BelongsTo
    {
        return $this->belongsTo(Signature::class);
    }

    public function punchlistVerification(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(PunchlistVerification::class);
    }
}
