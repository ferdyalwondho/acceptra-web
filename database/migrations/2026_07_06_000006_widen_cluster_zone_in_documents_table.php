<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // documents.cluster_zone now stores Cluster::display_name ("NAME (PROVINCE)"), which can
    // exceed the previous 100-char limit (name max 150 + province max 100 + " ()").
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('cluster_zone', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('cluster_zone', 100)->nullable()->change();
        });
    }
};
