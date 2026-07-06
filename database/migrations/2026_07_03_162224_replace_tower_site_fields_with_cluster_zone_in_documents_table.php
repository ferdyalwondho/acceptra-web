<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['tower_id_ne', 'site_name_ne', 'tower_id_fe', 'site_name_fe']);
            $table->string('cluster_zone', 100)->nullable()->after('link_name');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('cluster_zone');
            $table->string('tower_id_ne', 100)->nullable();
            $table->string('site_name_ne', 200)->nullable();
            $table->string('tower_id_fe', 100)->nullable();
            $table->string('site_name_fe', 200)->nullable();
        });
    }
};
