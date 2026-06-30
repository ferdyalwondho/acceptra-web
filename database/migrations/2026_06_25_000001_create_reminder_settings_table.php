<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminder_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->smallInteger('level_order')->nullable(); // NULL = global fallback untuk semua level
            $table->smallInteger('interval_days')->default(1); // Minimum 1 hari
            $table->boolean('is_weekday_only')->default(true);
            $table->timestamps();

            $table->unique('level_order'); // Satu record per level (atau satu global)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminder_settings');
    }
};
