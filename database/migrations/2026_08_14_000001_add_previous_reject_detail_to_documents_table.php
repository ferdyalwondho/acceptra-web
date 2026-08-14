<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->text('previous_reject_reason')->nullable()->after('previous_pdf_rejected_level');
            $table->string('previous_reject_evidence_path', 500)->nullable()->after('previous_reject_reason');
            $table->string('previous_reject_evidence_filename')->nullable()->after('previous_reject_evidence_path');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['previous_reject_reason', 'previous_reject_evidence_path', 'previous_reject_evidence_filename']);
        });
    }
};
