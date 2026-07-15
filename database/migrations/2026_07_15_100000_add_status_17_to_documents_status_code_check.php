<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE documents DROP CONSTRAINT documents_status_code_check');
        DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_code_check CHECK (status_code IN ('draft','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE documents DROP CONSTRAINT documents_status_code_check');
        DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_code_check CHECK (status_code IN ('draft','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16'))");
    }
};
