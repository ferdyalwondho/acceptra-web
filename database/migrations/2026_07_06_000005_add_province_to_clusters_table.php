<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clusters', function (Blueprint $table) {
            $table->dropUnique('uniq_clusters_name');
            $table->string('province', 100)->nullable()->after('name');
            $table->string('display_name', 255)->nullable()->after('province');
        });

        // Pre-feature test rows created without a province (and with no cluster_approvers
        // depending on them) can't be backfilled meaningfully — remove them before province
        // becomes required, so the NOT NULL constraint below doesn't fail.
        DB::table('clusters')->whereNull('province')->delete();

        DB::statement("UPDATE clusters SET display_name = UPPER(TRIM(name)) || ' (' || UPPER(TRIM(province)) || ')'");

        Schema::table('clusters', function (Blueprint $table) {
            $table->string('province', 100)->nullable(false)->change();
            $table->string('display_name', 255)->nullable(false)->change();
            $table->unique('display_name', 'uniq_clusters_display_name');
        });
    }

    public function down(): void
    {
        Schema::table('clusters', function (Blueprint $table) {
            $table->dropUnique('uniq_clusters_display_name');
            $table->dropColumn(['province', 'display_name']);
            $table->unique('name', 'uniq_clusters_name');
        });
    }
};
