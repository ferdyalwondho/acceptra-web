<?php

namespace App\Console\Commands;

use App\Http\Controllers\Users\UserController;
use App\Models\Cluster;
use App\Models\User;
use App\Notifications\InvitationNotification;
use App\Services\ClusterApproverResolutionService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportUsersCommand extends Command
{
    protected $signature = 'users:import
        {path : Path to the filled user_import_template.xlsx}
        {--dry-run : Preview what would happen without writing to the database or sending emails}';

    protected $description = 'Bulk-create users (with cluster PIC assignment) from a filled user_import_template.xlsx';

    public function handle(): int
    {
        $path   = $this->argument('path');
        $dryRun = (bool) $this->option('dry-run');

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $sheet = IOFactory::load($path)->getActiveSheet();

        $created               = 0;
        $skippedDuplicateEmail = [];
        $skippedInvalidRole    = [];
        $clustersNotFound      = [];
        $clustersAmbiguous     = [];
        $clustersAlreadyTaken  = [];

        if ($dryRun) {
            $this->warn('--- DRY RUN: tidak ada data ditulis ke database, tidak ada email dikirim ---');
            $this->newLine();
        }

        foreach ($sheet->getRowIterator(2) as $row) {
            $cells = $row->getCellIterator('A', 'D');
            $cells->setIterateOnlyExistingCells(false);

            $name = trim((string) $cells->current()->getValue());
            $cells->next();
            $email = trim((string) $cells->current()->getValue());
            $cells->next();
            $role = trim((string) $cells->current()->getValue());
            $cells->next();
            $clusterCell = trim((string) $cells->current()->getValue());

            if ($name === '' || $email === '') {
                continue; // blank row
            }

            if (! in_array($role, UserController::VALID_ROLES, true)) {
                $skippedInvalidRole[] = "{$email} (role: '{$role}')";
                continue;
            }

            if (User::where('email', $email)->exists()) {
                $skippedDuplicateEmail[] = $email;
                continue;
            }

            // Resolve cluster names (semicolon-separated, plain name — not display_name).
            // A name matching >1 cluster (same name, different province) is flagged as
            // ambiguous rather than guessed, so a PIC never ends up on the wrong province.
            $clusterIds = [];
            if ($clusterCell !== '') {
                foreach (explode(';', $clusterCell) as $piece) {
                    $piece = trim($piece);
                    if ($piece === '') {
                        continue;
                    }

                    $matches = Cluster::where('name', $piece)->get();

                    if ($matches->count() === 0) {
                        $clustersNotFound[] = "{$email}: {$piece}";
                    } elseif ($matches->count() > 1) {
                        $provinces           = $matches->pluck('province')->implode(', ');
                        $clustersAmbiguous[] = "{$email}: {$piece} (ada di: {$provinces})";
                    } else {
                        $clusterIds[] = $matches->first()->id;
                    }
                }
            }

            if ($dryRun) {
                $this->line("would create: {$name} <{$email}> role={$role} clusters_resolved=" . count($clusterIds));
                $created++;

                continue;
            }

            $token = Str::random(64);

            $user = User::create([
                'name'                  => $name,
                'email'                 => $email,
                'password'              => Str::random(32),
                'role'                  => $role,
                'status'                => 'inactive',
                'invitation_token'      => $token,
                'invitation_expires_at' => now()->addHours(72),
            ]);

            $result = ClusterApproverResolutionService::assignClusters($user, $role, $clusterIds);

            if (! empty($result['skipped_taken'])) {
                $takenNames = Cluster::whereIn('id', $result['skipped_taken'])->pluck('name');
                foreach ($takenNames as $takenName) {
                    $clustersAlreadyTaken[] = "{$email}: {$takenName}";
                }
            }

            $user->notify(new InvitationNotification($token));
            $created++;
        }

        $this->newLine();
        $this->info(($dryRun ? 'Akan dibuat' : 'Berhasil dibuat') . ": {$created} user");
        $this->line('Dilewati — email sudah terdaftar: ' . count($skippedDuplicateEmail));
        $this->line('Dilewati — role tidak valid: ' . count($skippedInvalidRole));
        $this->line('Cluster tidak ditemukan: ' . count($clustersNotFound));
        $this->line('Cluster ambigu (nama sama, provinsi beda): ' . count($clustersAmbiguous));
        $this->line('Cluster sudah ada PIC aktif lain: ' . count($clustersAlreadyTaken));

        foreach ([
            'Detail email duplikat'  => $skippedDuplicateEmail,
            'Detail role tidak valid' => $skippedInvalidRole,
            'Detail cluster tidak ditemukan' => $clustersNotFound,
            'Detail cluster ambigu'   => $clustersAmbiguous,
            'Detail cluster sudah terisi' => $clustersAlreadyTaken,
        ] as $title => $items) {
            if (empty($items)) {
                continue;
            }
            $this->newLine();
            $this->line("{$title}:");
            foreach ($items as $item) {
                $this->line("  - {$item}");
            }
        }

        return self::SUCCESS;
    }
}
