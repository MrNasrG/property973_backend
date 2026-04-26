<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MobileAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    Route::prefix('mobile')->group(function () {
        Route::post('register', [MobileAuthController::class, 'register']);
        Route::post('login', [MobileAuthController::class, 'login']);
        Route::post('forgot-password', [MobileAuthController::class, 'forgotPassword']);
        Route::post('verify-otp', [MobileAuthController::class, 'verifyOtp']);
        Route::post('resend-otp', [MobileAuthController::class, 'resendOtp']);
        Route::post('reset-password', [MobileAuthController::class, 'resetPassword']);
    });

    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
    });
});
