<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE users DROP CONSTRAINT users_role_check');
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin','admin','viewer','partner','approver_ms_bo','approver_ms_rts','approver_xls_rth_team','approver_xls_rth','approver_ms_bo_team','approver_sme'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users DROP CONSTRAINT users_role_check');
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin','admin','viewer','partner','approver_ms_bo','approver_ms_rts','approver_xls_rth_team','approver_xls_rth'))");
    }
};
