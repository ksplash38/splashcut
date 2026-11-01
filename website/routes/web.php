<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AuthController as AdminAuth;
use App\Http\Controllers\InstallController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;

Route::get('/install', [InstallController::class, 'show']);
Route::post('/install', [InstallController::class, 'run'])->middleware('throttle:10,1');

Route::get('/', [SiteController::class, 'home'])->name('home');
Route::get('/download', [SiteController::class, 'download'])->name('download');
Route::get('/paystack/callback', [SiteController::class, 'paystackCallback']);
Route::post('/paystack/webhook', [SiteController::class, 'paystackWebhook']);

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [AdminAuth::class, 'show'])->name('login');
    Route::post('/login', [AdminAuth::class, 'login'])->middleware('throttle:10,1');
    Route::post('/logout', [AdminAuth::class, 'logout'])->name('logout');

    Route::middleware('admin')->group(function () {
        Route::get('/', [AdminController::class, 'dashboard'])->name('dashboard');
        Route::get('/users', [AdminController::class, 'users'])->name('users');
        Route::get('/users/{user}', [AdminController::class, 'user'])->name('user');
        Route::post('/users/{user}', [AdminController::class, 'updateUser'])->name('user.update');
        Route::post('/users/{user}/delete', [AdminController::class, 'deleteUser'])->name('user.delete');
        Route::get('/payments', [AdminController::class, 'payments'])->name('payments');
        Route::post('/payments/{payment}/approve', [AdminController::class, 'approve'])->name('payment.approve');
        Route::post('/payments/{payment}/reject', [AdminController::class, 'reject'])->name('payment.reject');
        Route::get('/payments/{payment}/proof', [AdminController::class, 'proof'])->name('payment.proof');
        Route::get('/plans', [AdminController::class, 'plans'])->name('plans');
        Route::post('/plans', [AdminController::class, 'savePlan'])->name('plan.save');
        Route::post('/plans/{plan}/delete', [AdminController::class, 'deletePlan'])->name('plan.delete');
        Route::get('/settings', [AdminController::class, 'settings'])->name('settings');
        Route::post('/settings', [AdminController::class, 'saveSettings'])->name('settings.save');
        Route::get('/app', [AdminController::class, 'app'])->name('app');
        Route::post('/app', [AdminController::class, 'uploadApk'])->name('app.upload');
        Route::get('/account', [AdminController::class, 'account'])->name('account');
        Route::post('/account', [AdminController::class, 'saveAccount'])->name('account.save');
    });
});
