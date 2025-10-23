<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DepartmentsController;
use App\Http\Controllers\FirstTimePasswordController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\UserActivityLogController;
use App\Http\Controllers\AnalyticsController;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified', 'require_password_change'])->group(function () {
    Route::get('dashboard', function () {
        return Auth::user()->role === 'superadmin'
            ? app(AdminController::class)->dashboard()
            : Inertia::render('Users/Dashboard');
    })->name('dashboard');


    // First-time password change routes
    Route::get('/password/change', [FirstTimePasswordController::class, 'show'])->name('password.change');
    Route::post('/password/change', [FirstTimePasswordController::class, 'update'])->name('password.update');

    // Admin and Office Management Routes - Superadmin Only
    // Admin Management Routes
    Route::middleware('role:superadmin')->group(function () {

        Route::get('/Admin/users', [AdminController::class, 'index'])->name('admins.index');
        Route::post('/Admin/users', [AdminController::class, 'store'])->name('admins.store');
        Route::put('/Admin/users/{admin}', [AdminController::class, 'update'])->name('admins.update');
        Route::patch('/Admin/users/{admin}/toggle-status', [AdminController::class, 'toggleStatus'])->name('admins.toggle-status');
        Route::patch('/Admin/users/{admin}/change-password', [AdminController::class, 'changePassword'])->name('admins.change-password');
        Route::delete('/Admin/users/{admin}', [AdminController::class, 'destroy'])->name('admins.destroy');

        // Office Management Routes
        Route::get('/Admin/departments', [DepartmentsController::class, 'departments'])->name('departments.index');
        Route::get('/Admin/departments/create', [DepartmentsController::class, 'create'])->name('departments.create');
        Route::post('/Admin/departments', [DepartmentsController::class, 'store'])->name('departments.store');
        Route::get('/Admin/departments/{department}', [DepartmentsController::class, 'show'])->name('departments.show');
        Route::get('/Admin/departments/{department}/edit', [DepartmentsController::class, 'edit'])->name('departments.edit');
        Route::put('/Admin/departments/{department}', [DepartmentsController::class, 'update'])->name('departments.update');
        Route::delete('/Admin/departments/{department}', [DepartmentsController::class, 'destroy'])->name('departments.destroy');

        // Published Documents Management Routes
        Route::get('/Admin/published-documents', [AdminController::class, 'publishedDocuments'])->name('admin.published-documents');
        Route::delete('/Admin/published-documents/{document}', [AdminController::class, 'unpublishDocument'])->name('admin.unpublish-document');

        // Activity Log Route
        Route::get('/Admin/activity-logs', [UserActivityLogController::class, 'index'])->name('admin.activity-logs');

        // Analytics & Reporting Routes
        Route::get('/Admin/analytics', [AnalyticsController::class, 'index'])->name('admin.analytics');
        Route::post('/Admin/analytics/reports', [AnalyticsController::class, 'generateReport'])->name('admin.analytics.reports');
    });

    // User Management Routes
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::get('/documents', [UserController::class, 'documents'])->name('users.documents');
    Route::get('/profile', [UserController::class, 'profile'])->name('users.profile');
    Route::patch('/profile', [UserController::class, 'updateProfile'])->name('profile.update');
    Route::put('/profile/password', [UserController::class, 'updatePassword'])->name('users.password.update');
    Route::get('/departments', [UserController::class, 'departments'])->name('users.departments');

    // // User Document Profile Routes
    Route::get('/documents/create', [UserController::class, 'createDocument'])->name('users.createDocument');

    // send document to recipients
    Route::post('/users/documents/send', [UserController::class, 'sendDocument'])->name('users.documents.send');

    // Confirm document receipt via barcode
    Route::post('/users/documents/confirm-receive', [UserController::class, 'confirmReceive'])->name('users.documents.confirm-receive');

    // Generate auto order number
    Route::post('/users/documents/generate-order-number', [UserController::class, 'generateOrderNumber'])->name('users.documents.generate-order-number');

    // Test CSRF token endpoint
    Route::post('/users/test-csrf', [UserController::class, 'testCsrf'])->name('users.test-csrf');

    // Refresh CSRF token endpoint
    Route::get('/users/refresh-csrf', [UserController::class, 'refreshCsrf'])->name('users.refresh-csrf');

    // Test CSRF token regeneration endpoint
    Route::post('/users/test-csrf-regeneration', function (Request $request) {
        $oldToken = $request->header('X-CSRF-TOKEN');
        $request->session()->regenerateToken();
        $newToken = csrf_token();

        return response()->json([
            'success' => true,
            'message' => 'CSRF token regenerated successfully',
            'old_token' => $oldToken,
            'new_token' => $newToken,
            'tokens_different' => $oldToken !== $newToken
        ]);
    })->name('users.test-csrf-regeneration');

    Route::get('/users/documents/{document}/edit', [UserController::class, 'editDocument'])->name('users.documents.edit');
    Route::put('/users/documents/{document}', [UserController::class, 'updateDocument'])->name('users.documents.update');

    // User's Published Documents Management
    Route::get('/published-documents', [UserController::class, 'publishedDocuments'])->name('users.published-documents');
    Route::delete('/users/published-documents/{document}', [UserController::class, 'unpublishDocument'])->name('users.unpublish-document');

    // Document routes
    Route::get('/documents/{document}', [DocumentController::class, 'viewDocument'])->name('documents.view');
    Route::post('/documents/{document}/respond', [DocumentController::class, 'respondToDocument'])->name('documents.respond');
    Route::post('/documents/{document}/forward', [DocumentController::class, 'forwardDocument'])->name('documents.forward');
    Route::post('/documents/{document}/received', [DocumentController::class, 'markAsReceived'])->name('documents.received');
    Route::get('/documents/{document}/chain', [DocumentController::class, 'getDocumentChain'])->name('documents.chain');
    Route::post('/documents/{document}/publish', [DocumentController::class, 'publishDocument'])->name('documents.publish');
    Route::post('/documents/{document}/unpublish', [DocumentController::class, 'unpublishDocument'])->name('documents.unpublish');
    Route::get('/documents/public', [DocumentController::class, 'publicDocuments'])->name('documents.public');
    Route::get('/documents/public/{public_token}', [DocumentController::class, 'publicView'])->name('documents.public_view');
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');

    Route::get('/dashboard/data', [UserController::class, 'dashboardData'])->name('dashboard.data');

    Route::delete('/users/documents/{document}/files/{file}', [UserController::class, 'deleteDocumentFile'])->name('users.documents.files.delete');

    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.readAll');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
});

// Download route without email verification requirement
Route::middleware(['auth'])->group(function () {
    Route::get('/documents/{document}/files/{file}', [DocumentController::class, 'downloadDocument'])->name('documents.download');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
