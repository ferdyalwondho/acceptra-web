<?php

namespace App\Console\Commands;

use App\Jobs\SendReminderJob;
use App\Models\ApprovalStep;
use App\Models\ReminderSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendPendingRemindersCommand extends Command
{
    protected $signature = 'reminders:send';

    protected $description = 'Send email reminders to approvers with pending approval steps (FR-RMD-03)';

    public function handle(): int
    {
        // FR-RMD-03: job hanya berjalan pada hari kerja; Sabtu–Minggu skip
        if (! Carbon::today()->isWeekday()) {
            $this->info('Skipping — not a weekday.');
            return self::SUCCESS;
        }

        // Load semua konfigurasi reminder; key-by level_order (null = global)
        $settings       = ReminderSetting::all()->keyBy('level_order');
        $globalInterval = $settings->get(null)?->interval_days ?? 1;

        // Query semua step pending yang aktif dan bukan offline
        $pendingSteps = ApprovalStep::with(['document', 'approver'])
            ->where('status', 'pending')
            ->where('is_active', true)
            ->where('is_offline', false)
            ->get();

        $dispatched = 0;

        foreach ($pendingSteps as $step) {
            // Tentukan interval yang berlaku: per-level override atau global fallback
            $interval = $settings->get($step->level_order)?->interval_days ?? $globalInterval;

            // Hitung berapa hari step ini sudah pending (sejak created_at)
            $daysPending = (int) Carbon::today()->diffInDays(Carbon::parse($step->created_at)->startOfDay());

            if ($daysPending < $interval) {
                continue;
            }

            if (! $step->document) {
                continue;
            }

            SendReminderJob::dispatch($step->document, $step, $daysPending);
            $dispatched++;
        }

        $this->info("Dispatched {$dispatched} reminder job(s).");

        return self::SUCCESS;
    }
}
