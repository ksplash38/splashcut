<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use Illuminate\Support\Facades\Route;

Route::get('/info', [BillingController::class, 'info']);
Route::middleware('throttle:20,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware(['apitoken', 'throttle:120,1'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/exported', [AuthController::class, 'exported']);
    Route::get('/payments', [BillingController::class, 'payments']);
    Route::post('/pay/paystack', [BillingController::class, 'paystack']);
    Route::post('/pay/verify', [BillingController::class, 'verify']);
    Route::post('/pay/bank', [BillingController::class, 'bank']);
});
