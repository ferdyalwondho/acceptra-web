<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Cluster extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'province',
        'display_name',
        'status',
    ];

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    // Single source of truth for the "NAME (PROVINCE)" identifier used for uniqueness,
    // document cluster_zone matching, and dropdown display everywhere in the app.
    public static function makeDisplayName(string $name, string $province): string
    {
        return mb_strtoupper(trim($name)) . ' (' . mb_strtoupper(trim($province)) . ')';
    }

    public function approvers(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ClusterApprover::class);
    }
}
