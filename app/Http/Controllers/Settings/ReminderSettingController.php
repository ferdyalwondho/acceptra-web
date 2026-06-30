<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\ReminderSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReminderSettingController extends Controller
{
    // Level yang dikelola (Global + L1–L4)
    private const MANAGED_LEVELS = [null, 1, 2, 3, 4];

    public function index(): Response
    {
        abort_unless(auth()->user()->role === 'super_admin', 403);

        $this->seedDefaultsIfEmpty();

        $settings = ReminderSetting::orderByRaw('level_order IS NULL DESC')
            ->orderBy('level_order')
            ->get()
            ->map(fn (ReminderSetting $s) => [
                'id'              => $s->id,
                'level_order'     => $s->level_order,
                'interval_days'   => $s->interval_days,
                'is_weekday_only' => $s->is_weekday_only,
                'label'           => $s->level_order === null
                    ? 'Global (All Levels)'
                    : "Level {$s->level_order}",
            ]);

        return Inertia::render('Settings/Reminders', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        abort_unless(auth()->user()->role === 'super_admin', 403);

        $validated = $request->validate([
            'settings'                   => ['required', 'array'],
            'settings.*.level_order'     => ['nullable', 'integer', 'min:1'],
            'settings.*.interval_days'   => ['required', 'integer', 'min:1'],
            'settings.*.is_weekday_only' => ['required', 'boolean'],
        ], [
            'settings.*.interval_days.min' => 'Interval must be at least 1 day.',
        ]);

        foreach ($validated['settings'] as $item) {
            ReminderSetting::updateOrCreate(
                ['level_order' => $item['level_order']],
                [
                    'interval_days'   => $item['interval_days'],
                    'is_weekday_only' => $item['is_weekday_only'],
                ],
            );
        }

        return redirect()->route('settings.reminders')
            ->with('status', 'Reminder settings updated.');
    }

    private function seedDefaultsIfEmpty(): void
    {
        if (ReminderSetting::exists()) {
            return;
        }

        $defaults = [
            ['level_order' => null, 'interval_days' => 1, 'is_weekday_only' => true],
            ['level_order' => 1,    'interval_days' => 1, 'is_weekday_only' => true],
            ['level_order' => 2,    'interval_days' => 1, 'is_weekday_only' => true],
            ['level_order' => 3,    'interval_days' => 1, 'is_weekday_only' => true],
            ['level_order' => 4,    'interval_days' => 1, 'is_weekday_only' => true],
        ];

        foreach ($defaults as $default) {
            ReminderSetting::create($default);
        }
    }
}
