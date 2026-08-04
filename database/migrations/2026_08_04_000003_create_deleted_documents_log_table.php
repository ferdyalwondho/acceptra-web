<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deleted_documents_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('unique_id', 50);
            $table->string('project_code', 100)->nullable();
            $table->string('sow_name')->nullable();
            $table->text('reason');
            $table->foreignUuid('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('deleted_by_name');
            $table->timestamp('deleted_at');
            $table->timestamps();

            $table->index('unique_id');
            $table->index('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deleted_documents_log');
    }
};
