@extends('layouts.admin')

@section('title', 'Dashboard')

@section('body')
<div class="dash-wrap">
    <header class="dash">
        <div>
            <strong>{{ config('app.name') }}</strong>
            <span style="color: var(--muted); font-size: .85rem; margin-left: .5rem;">Admin</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="color: var(--muted); font-size: .9rem;">{{ auth()->user()->name }}</span>
            <form class="inline-form" method="post" action="{{ route('admin.logout') }}">
                @csrf
                <button type="submit" style="width: auto; padding: .45rem .9rem; font-size: .8rem;">Log out</button>
            </form>
        </div>
    </header>
    <main class="dash">
        <h1 style="font-size: 1.5rem; margin: 0 0 1rem;">Dashboard</h1>
        <p style="color: var(--muted); margin: 0 0 1.5rem;">Overview counts from your database.</p>
        <div class="grid">
            <div class="tile">
                <h3>Total users</h3>
                <div class="num">{{ $userCount }}</div>
            </div>
            <div class="tile">
                <h3>Admin users</h3>
                <div class="num">{{ $adminCount }}</div>
            </div>
        </div>
        <div style="margin-top: 1.5rem; padding: 1rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface);">
            <h2 style="font-size: 1rem; margin: 0 0 .5rem;">JWT API</h2>
            <p style="margin: 0; color: var(--muted); font-size: .9rem;">
                Authenticate mobile or SPA clients via <code style="color: var(--accent);">POST /api/v1/login</code> and send
                <code style="color: var(--accent);">Authorization: Bearer &lt;token&gt;</code> on protected routes.
            </p>
        </div>
    </main>
</div>
@endsection
