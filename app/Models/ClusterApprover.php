<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ClusterApprover extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'cluster_id',
        'role',
        'user_id',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function cluster(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Cluster::class);
    }

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Only rows whose user is currently active hold their (cluster, role) slot —
    // deactivated users' rows are kept as history but no longer occupy the slot.
    public function scopeActiveHolder(Builder $query): Builder
    {
        return $query->whereHas('user', fn (Builder $q) => $q->where('status', 'active'));
    }
}
