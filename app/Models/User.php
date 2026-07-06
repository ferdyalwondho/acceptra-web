<?php

namespace App\Models;

use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use App\Models\Partner;

class User extends Authenticatable implements CanResetPasswordContract
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasUuids, SoftDeletes, CanResetPassword;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'region',
        'partner_id',
        'status',
        'preferred_language',
        'has_seen_get_started',
        'email_verified_at',
        'invitation_token',
        'invitation_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'invitation_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'     => 'datetime',
            'invitation_expires_at' => 'datetime',
            'password'              => 'hashed',
            'has_seen_get_started'  => 'boolean',
        ];
    }

    // UUID v7 untuk semua ID baru (SRS C-7)
    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function redirectRoute(): string
    {
        return route('dashboard');
    }

    public function canLogin(): bool
    {
        return $this->status === 'active';
    }

    public function getInitialsAttribute(): string
    {
        return collect(explode(' ', $this->name))
            ->map(fn ($word) => strtoupper($word[0] ?? ''))
            ->filter()
            ->take(2)
            ->implode('');
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }

    public function partner(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Document::class, 'submitted_by');
    }

    public function approvalSteps(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ApprovalStep::class, 'approver_id');
    }

    public function clusterApprovers(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ClusterApprover::class);
    }

    public function clusters(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Cluster::class, 'cluster_approvers')->withPivot('role')->withTimestamps();
    }
}
