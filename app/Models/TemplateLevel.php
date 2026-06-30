<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TemplateLevel extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'template_id',
        'level_order',
        'role',
        'requires_signature',
    ];

    protected $casts = [
        'requires_signature' => 'boolean',
        'level_order' => 'integer',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
}
