<?php

use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Approvals\ApprovalController;
use App\Http\Controllers\Approvals\PunchlistController;
use App\Http\Controllers\Attachments\AttachmentController;
use App\Http\Controllers\Clusters\ClusterController;
use App\Http\Controllers\Documents\DocumentController;
use App\Http\Controllers\Documents\DocumentExportController;
use App\Http\Controllers\Partners\PartnerController;
use App\Http\Controllers\Partners\PartnerInvitationController;
use App\Http\Controllers\Notifications\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Templates\TemplateController;
use App\Http\Controllers\Settings\ReminderSettingController;
use App\Http\Controllers\Users\UserController;
use App\Http\Controllers\Users\UserInvitationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HelpController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/* ─────────────────────────────────────────────────────────────
   PUBLIC — guest only (redirect ke dashboard jika sudah login)
   ───────────────────────────────────────────────────────────── */

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [LoginController::class, 'login'])
        ->name('login.post')
        ->middleware('throttle:login');

    Route::get('/forgot-password', [ForgotPasswordController::class, 'showLinkRequestForm'])
        ->name('password.request');
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail'])
        ->name('password.email');

    Route::get('/reset-password/{token}', [ResetPasswordController::class, 'showResetForm'])
        ->name('password.reset');
    Route::post('/reset-password', [ResetPasswordController::class, 'reset'])
        ->name('password.update');
});

/* ─────────────────────────────────────────────────────────────
   INVITATION — public dengan token (bisa diakses guest maupun auth)
   ───────────────────────────────────────────────────────────── */

Route::get('/invitation/{token}', [InvitationController::class, 'show'])
    ->name('invitation.show');
Route::post('/invitation/{token}', [InvitationController::class, 'activate'])
    ->name('invitation.activate');

/* ─────────────────────────────────────────────────────────────
   AUTHENTICATED — semua route di bawah butuh login
   Auth data (auth.user, unreadNotifications) di-share via
   HandleInertiaRequests — tidak perlu pass manual lagi.
   ───────────────────────────────────────────────────────────── */

Route::middleware('auth')->group(function () {

    /* ── Logout ── */
    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

    /* ── Dashboard ── */
    Route::get('/', fn () => redirect()->route('dashboard'));
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/partner',  fn () => redirect()->route('dashboard'))->name('dashboard.partner');
    Route::get('/dashboard/approver', fn () => redirect()->route('dashboard'))->name('dashboard.approver');

    /* ── Documents ── */
    Route::get('/documents',        [DocumentController::class, 'index'])->name('documents.index');
    Route::get('/documents/create', [DocumentController::class, 'create'])->name('documents.create');
    Route::post('/documents',       [DocumentController::class, 'store'])->name('documents.store');
    Route::get('/documents/submit-ongoing',  [DocumentController::class, 'submitOngoingCreate'])->name('documents.submit-ongoing');
    Route::post('/documents/submit-ongoing', [DocumentController::class, 'submitOngoingStore'])->name('documents.submit-ongoing.store');
    Route::get('/documents/export', DocumentExportController::class)->name('documents.export');

    Route::get('/documents/{id}',           [DocumentController::class, 'show'])->name('documents.show');
    Route::get('/documents/{id}/edit',      [DocumentController::class, 'edit'])->name('documents.edit');
    Route::put('/documents/{id}',           fn () => redirect()->back())->name('documents.update');
    Route::get('/documents/{id}/audit', function (string $id) {
        return redirect()->route('documents.show', ['id' => $id, 'tab' => 'audit-trail']);
    })->name('documents.audit');
    Route::get('/documents/{id}/pdf', function (string $id) {
        $document = \App\Models\Document::findOrFail($id);
        abort_if(
            auth()->user()->role === 'partner' && $document->submitted_by !== auth()->id(),
            403
        );
        abort_if(! $document->original_pdf_path, 404);

        return (new \App\Services\PdfSignatureService())->streamPdf($document);
    })->name('documents.pdf');
    Route::get('/documents/{id}/pdf/previous', function (string $id) {
        $document = \App\Models\Document::findOrFail($id);
        abort_if(
            auth()->user()->role === 'partner' && $document->submitted_by !== auth()->id(),
            403
        );
        abort_if(
            ! $document->previous_pdf_path || ! \Illuminate\Support\Facades\Storage::exists($document->previous_pdf_path),
            404
        );

        return \Illuminate\Support\Facades\Storage::response(
            $document->previous_pdf_path,
            'previous.pdf',
            ['Content-Type' => 'application/pdf']
        );
    })->name('documents.pdf.previous');
    Route::post('/documents/{id}/reassign',            [DocumentController::class, 'reassign'])->name('documents.reassign');
    Route::post('/documents/{id}/revise',              [DocumentController::class, 'revise'])->name('documents.revise');
    Route::post('/documents/{id}/submit',               [DocumentController::class, 'submit'])->name('documents.submit');
    Route::post('/documents/{id}/punchlist-revision',  [DocumentController::class, 'uploadPunchlistRevision'])->name('documents.punchlist-revision');
    Route::post('/documents/{id}/placement',[DocumentController::class, 'placement'])->name('documents.placement');
    Route::post('/documents/{id}/complete-routing', [DocumentController::class, 'completeRouting'])->name('documents.complete-routing');
    Route::post('/documents/{id}/review-revision', [DocumentController::class, 'reviewRevision'])->name('documents.review-revision');
    Route::post('/documents/{id}/finalize-revision-placement', [DocumentController::class, 'finalizeRevisionPlacement'])->name('documents.finalize-revision-placement');

    // FR-ATT: Lampiran Excel — download & delete
    Route::get('/documents/{id}/attachments/{att_id}/download',
        [AttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('/documents/{id}/attachments/{att_id}',
        [AttachmentController::class, 'destroy'])->name('attachments.destroy');

    // FR-SUB API: fetch template level structure for PIC slot population
    Route::get('/api/templates/{id}/levels', [TemplateController::class, 'levels'])->name('api.templates.levels');

    /* ── Approvals ── */
    Route::get('/approvals',         [ApprovalController::class, 'index'])->name('approvals.index');
    Route::get('/approvals/history', [ApprovalController::class, 'history'])->name('approvals.history');
    Route::get('/documents/{id}/approval',  [ApprovalController::class, 'show'])->name('approvals.screen');
    Route::post('/documents/{id}/approve',  [ApprovalController::class, 'approve'])->name('approvals.approve');
    Route::post('/documents/{id}/reject',   [ApprovalController::class, 'reject'])->name('approvals.reject');
    Route::post('/documents/{id}/verify',   [PunchlistController::class, 'verify'])->name('approvals.verify');

    /* ── Partners (FR-PTR) ── */
    Route::get('/partners',            [PartnerController::class, 'index'])->name('partners.index');
    Route::get('/partners/create',     [PartnerController::class, 'create'])->name('partners.create');
    Route::post('/partners',           [PartnerController::class, 'store'])->name('partners.store');
    Route::get('/partners/{id}/edit',  [PartnerController::class, 'edit'])->name('partners.edit');
    Route::put('/partners/{id}',       [PartnerController::class, 'update'])->name('partners.update');
    Route::delete('/partners/{id}',    [PartnerController::class, 'destroy'])->name('partners.destroy');

    // FR-AUTH-06: Resend undangan ke PIC partner (admin/super_admin only — dicek di controller)
    Route::post('/partners/{id}/resend-invitation/{userId}', [PartnerInvitationController::class, 'resend'])
        ->name('partners.resend-invitation');

    /* ── Templates (FR-TPL) ── */
    Route::get('/templates',                [TemplateController::class, 'index'])->name('templates.index');
    Route::get('/templates/create',         [TemplateController::class, 'create'])->name('templates.create');
    Route::post('/templates',               [TemplateController::class, 'store'])->name('templates.store');
    Route::get('/templates/{id}/edit',      [TemplateController::class, 'edit'])->name('templates.edit');
    Route::put('/templates/{id}',           [TemplateController::class, 'update'])->name('templates.update');
    Route::delete('/templates/{id}',        [TemplateController::class, 'destroy'])->name('templates.destroy');
    Route::post('/templates/{id}/clone',    [TemplateController::class, 'clone'])->name('templates.clone');

    Route::get('/clusters',  [ClusterController::class, 'index'])->name('clusters.index');
    Route::post('/clusters', [ClusterController::class, 'store'])->name('clusters.store');
    Route::get('/clusters/template',  [ClusterController::class, 'downloadTemplate'])->name('clusters.template');
    Route::post('/clusters/import',   [ClusterController::class, 'import'])->name('clusters.import');
    Route::get('/api/clusters/resolve',   [ClusterController::class, 'resolvePreview'])->name('api.clusters.resolve');
    Route::get('/api/clusters/available', [ClusterController::class, 'availableForRole'])->name('api.clusters.available');

    /* ── Users (FR-USR) ── */
    Route::get('/users',            [UserController::class, 'index'])->name('users.index');
    Route::get('/users/create',     [UserController::class, 'create'])->name('users.create');
    Route::post('/users',           [UserController::class, 'store'])->name('users.store');
    Route::get('/users/{id}/edit',  [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{id}',       [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{id}',    [UserController::class, 'destroy'])->name('users.destroy');

    // FR-AUTH-06: resend undangan (admin/super_admin only — dicek di controller)
    Route::post('/users/{id}/resend-invitation', [UserInvitationController::class, 'resend'])
        ->name('users.resend-invitation');

    // FR-USR-04: Filter user by role untuk dropdown PIC approver
    Route::get('/api/users', [UserController::class, 'filterByRole'])->name('api.users.filter');

    /* ── Settings (FR-RMD) ── */
    Route::get('/settings/reminders', [ReminderSettingController::class, 'index'])->name('settings.reminders');
    Route::put('/settings/reminders', [ReminderSettingController::class, 'update'])->name('settings.reminders.update');

    /* ── Help (FR-HELP) ── */
    Route::get('/help', [HelpController::class, 'index'])->name('help.index');

    /* ── Shared ── */
    Route::get('/notifications',              [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all',    [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read',   [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::get('/api/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('api.notifications.unread-count');
    Route::get('/api/notifications/recent',       [NotificationController::class, 'recent'])->name('api.notifications.recent');
    Route::get('/profile',           [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/profile',           fn () => redirect()->back())->name('profile.update');
    Route::post('/profile/language', [ProfileController::class, 'updateLanguage'])->name('profile.language');
    Route::post('/profile/dismiss-get-started', [ProfileController::class, 'dismissGetStarted'])->name('profile.dismiss-get-started');
    Route::get('/profile/signature',                    [ProfileController::class, 'signature'])->name('profile.signature');
    Route::post('/profile/signature',                   [ProfileController::class, 'storeSignature'])->name('profile.signature.store');
    Route::delete('/profile/signature/{sig}',           [ProfileController::class, 'destroySignature'])->name('profile.signature.destroy');
    Route::patch('/profile/signature/{sig}/activate',   [ProfileController::class, 'activateSignature'])->name('profile.signature.activate');
});
