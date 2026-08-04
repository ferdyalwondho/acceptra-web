<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('approval_steps', function (Blueprint $table) {
            $table->string('evidence_path', 500)->nullable()->after('reject_reason');
            $table->string('evidence_original_filename', 255)->nullable()->after('evidence_path');
        });
    }

    public function down(): void
    {
        Schema::table('approval_steps', function (Blueprint $table) {
            $table->dropColumn(['evidence_path', 'evidence_original_filename']);
        });
    }
};
