<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Admin') — {{ config('app.name') }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
    <style>
        :root {
            --bg: #0f1419;
            --surface: #1a2332;
            --border: #2d3a4d;
            --text: #e8eef7;
            --muted: #8b9aaf;
            --accent: #5b9cfd;
            --accent-hover: #7eb0ff;
            --danger: #f87171;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
            background: radial-gradient(1200px 600px at 20% -10%, #1e3a5f 0%, transparent 55%),
                        radial-gradient(900px 500px at 100% 0%, #2d1f4e 0%, transparent 50%),
                        var(--bg);
            color: var(--text);
        }
        a { color: var(--accent); text-decoration: none; }
        a:hover { color: var(--accent-hover); }
        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 24px 48px rgba(0,0,0,.35);
        }
        .shell {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }
        h1 {
            margin: 0 0 .25rem;
            font-size: 1.35rem;
            font-weight: 600;
        }
        p.lead { margin: 0 0 1.25rem; color: var(--muted); font-size: .9rem; }
        label { display: block; font-size: .8rem; font-weight: 500; margin-bottom: .35rem; color: var(--muted); }
        input[type="text"], input[type="email"], input[type="password"] {
            width: 100%;
            padding: .65rem .75rem;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: #121a26;
            color: var(--text);
            font-size: .95rem;
            margin-bottom: 1rem;
        }
        input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(91, 156, 253, .2);
        }
        .check { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: var(--muted); margin-bottom: 1rem; }
        button, .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: .65rem 1rem;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            font-size: .9rem;
            cursor: pointer;
            background: linear-gradient(180deg, #6aa8ff, #4a8cef);
            color: #0b1220;
            width: 100%;
        }
        button:hover, .btn:hover { filter: brightness(1.06); }
        .error { color: var(--danger); font-size: .85rem; margin: -.5rem 0 1rem; }
        .status { background: rgba(91, 156, 253, .12); border: 1px solid rgba(91, 156, 253, .3); color: var(--text); padding: .75rem; border-radius: 8px; font-size: .85rem; margin-bottom: 1rem; }
        .foot { margin-top: 1.25rem; text-align: center; font-size: .85rem; color: var(--muted); }
        /* dashboard layout */
        .dash-wrap { min-height: 100vh; display: flex; flex-direction: column; }
        header.dash {
            display: flex; align-items: center; justify-content: space-between;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
            background: rgba(26, 35, 50, .85);
            backdrop-filter: blur(8px);
        }
        header.dash strong { font-weight: 600; }
        main.dash { flex: 1; padding: 1.5rem; max-width: 960px; margin: 0 auto; width: 100%; }
        .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        .tile {
            background: var(--surface);
            border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem;
        }
        .tile h3 { margin: 0 0 .25rem; font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 600; }
        .tile .num { font-size: 1.75rem; font-weight: 700; }
        .inline-form { display: inline; }
    </style>
    @stack('head')
</head>
<body>
    @yield('body')
    @stack('scripts')
</body>
</html>
