<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // documents.unique_id needs room for 50 chars (was capped at 20). pt_index also gets a
    // DB-level unique constraint to match unique_id — both must be duplicate-free.
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('unique_id', 50)->change();
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->unique('pt_index', 'documents_pt_index_unique');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropUnique('documents_pt_index_unique');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->string('unique_id', 20)->change();
        });
    }
};
