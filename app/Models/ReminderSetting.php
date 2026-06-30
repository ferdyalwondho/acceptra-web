<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ReminderSetting extends Model
{
    use HasUuids;

    protected $fillable = [
        'level_order',
        'interval_days',
        'is_weekday_only',
    ];

    protected $casts = [
        'level_order'    => 'integer',
        'interval_days'  => 'integer',
        'is_weekday_only' => 'boolean',
    ];
}
