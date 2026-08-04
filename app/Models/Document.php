<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Document extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'unique_id',
        'pt_index',
        'link_id',
        'link_name',
        'project_code',
        'vendor_contractor',
        'partner_id',
        'submitted_by',
        'template_id',
        'template_snapshot',
        'sow_name',
        'cluster_zone',
        'original_pdf_path',
        'final_pdf_path',
        'previous_pdf_path',
        'previous_pdf_rejected_level',
        'status_code',
        'routing_pending',
        'date_atp_submission',
        'date_atp_approved',
        'atp_punchlist',
        'acceptance_status',
        'is_imported',
    ];

    protected $casts = [
        'template_snapshot'           => 'array',
        'date_atp_submission'         => 'date',
        'date_atp_approved'           => 'date',
        'is_imported'                 => 'boolean',
        'routing_pending'             => 'boolean',
        'previous_pdf_rejected_level' => 'integer',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(Template::class);
    }

    public function approvalSteps(): HasMany
    {
        return $this->hasMany(ApprovalStep::class)->orderBy('level_order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(DocumentAttachment::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class)->orderBy('created_at');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(InAppNotification::class);
    }

    public function punchlistVerifications(): HasMany
    {
        return $this->hasMany(PunchlistVerification::class);
    }
}
