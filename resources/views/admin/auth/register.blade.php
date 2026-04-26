@extends('layouts.admin')

@section('title', 'Register')

@section('body')
<div class="shell">
    <div class="card">
        <h1>Create admin</h1>
        <p class="lead">Adds a user with admin privileges.</p>

        <form method="post" action="{{ route('admin.register') }}">
            @csrf
            <label for="name">Name</label>
            <input id="name" type="text" name="name" value="{{ old('name') }}" required autofocus autocomplete="name">
            @error('name')
                <div class="error">{{ $message }}</div>
            @enderror

            <label for="email">Email</label>
            <input id="email" type="email" name="email" value="{{ old('email') }}" required autocomplete="username">
            @error('email')
                <div class="error">{{ $message }}</div>
            @enderror

            <label for="password">Password</label>
            <input id="password" type="password" name="password" required autocomplete="new-password">
            @error('password')
                <div class="error">{{ $message }}</div>
            @enderror

            <label for="password_confirmation">Confirm password</label>
            <input id="password_confirmation" type="password" name="password_confirmation" required autocomplete="new-password">

            <button type="submit">Register</button>
        </form>

        <div class="foot">
            Already have access? <a href="{{ route('admin.login') }}">Sign in</a>
        </div>
    </div>
</div>
@endsection
