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

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
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
