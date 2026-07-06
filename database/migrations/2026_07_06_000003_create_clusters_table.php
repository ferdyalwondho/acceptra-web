<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clusters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique('name', 'uniq_clusters_name');
            $table->index('status', 'idx_clusters_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clusters');
    }
};
