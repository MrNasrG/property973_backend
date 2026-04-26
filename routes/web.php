<?php

use App\Http\Controllers\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Admin\DashboardController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::get('login', [AdminAuthController::class, 'showLogin'])->name('login');
        Route::post('login', [AdminAuthController::class, 'login']);
        Route::get('register', [AdminAuthController::class, 'showRegister'])->name('register');
        Route::post('register', [AdminAuthController::class, 'register']);
    });

    Route::middleware(['auth', 'admin'])->group(function () {
        Route::post('logout', [AdminAuthController::class, 'logout'])->name('logout');
        Route::get('dashboard', DashboardController::class)->name('dashboard');
    });
});
