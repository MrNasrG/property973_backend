<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(): View
    {
        return view('admin.dashboard', [
            'userCount' => User::query()->count(),
            'adminCount' => User::query()->where('is_admin', true)->count(),
        ]);
    }
}
