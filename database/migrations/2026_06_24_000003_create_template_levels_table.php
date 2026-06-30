<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_levels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('template_id')->constrained('templates')->cascadeOnDelete();
            $table->smallInteger('level_order');
            $table->string('role', 30);
            $table->boolean('requires_signature')->default(false);
            $table->timestamps();

            $table->unique(['template_id', 'level_order'], 'uniq_tpl_level_order');
            $table->index(['template_id', 'level_order'], 'idx_tpl_levels_template');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_levels');
    }
};
