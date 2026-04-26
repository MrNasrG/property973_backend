<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function showLogin(): View
    {
        return view('admin.auth.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $remember = $request->boolean('remember');

        if (! Auth::attempt($credentials, $remember)) {
            return back()->withErrors(['email' => __('auth.failed')])->onlyInput('email');
        }

        $request->session()->regenerate();

        if (! $request->user()->is_admin) {
            Auth::logout();

            return back()->withErrors(['email' => __('Admin access only.')]);
        }

        return redirect()->intended(route('admin.dashboard'));
    }

    public function showRegister(): View|RedirectResponse
    {
        if (! config('admin.allow_registration')) {
            return redirect()->route('admin.login')
                ->with('status', 'Registration is disabled. Set ADMIN_ALLOW_REGISTRATION=true in .env for local setup.');
        }

        return view('admin.auth.register');
    }

    public function register(Request $request): RedirectResponse
    {
        if (! config('admin.allow_registration')) {
            return redirect()->route('admin.login');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);
        $user->forceFill(['is_admin' => true])->save();

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('admin.dashboard');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
