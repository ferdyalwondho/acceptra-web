<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// FR-RMD-03: Kirim reminder ke approver pending setiap hari kerja pukul 08:00 WIB
// Command SendPendingRemindersCommand juga melakukan internal weekday check sebagai safeguard
Schedule::command('reminders:send')->weekdays()->dailyAt('08:00');
