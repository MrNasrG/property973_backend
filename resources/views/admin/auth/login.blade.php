@extends('layouts.admin')

@section('title', 'Sign in')

@section('body')
<div class="shell">
    <div class="card">
        <h1>Admin sign in</h1>
        <p class="lead">Session-based access to the control panel.</p>

        @if (session('status'))
            <div class="status">{{ session('status') }}</div>
        @endif

        <form method="post" action="{{ route('admin.login') }}">
            @csrf
            <label for="email">Email</label>
            <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="username">
            @error('email')
                <div class="error">{{ $message }}</div>
            @enderror

            <label for="password">Password</label>
            <input id="password" type="password" name="password" required autocomplete="current-password">

            <label class="check">
                <input type="checkbox" name="remember" value="1" {{ old('remember') ? 'checked' : '' }}>
                Remember me
            </label>

            <button type="submit">Sign in</button>
        </form>

        <div class="foot">
            @if (config('admin.allow_registration'))
                New admin? <a href="{{ route('admin.register') }}">Create an account</a>
            @else
                Registration is disabled. Use seeded admin or enable <code>ADMIN_ALLOW_REGISTRATION</code>.
            @endif
        </div>
    </div>
</div>
@endsection
