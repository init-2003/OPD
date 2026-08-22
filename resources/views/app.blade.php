<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'OPD Referral Management System') }}</title>

        <!-- Favicon / Tab Browser Icon -->
        <link rel="icon" type="image/png" href="{{ asset('LOGO-NON-BG.png') }}?v={{ file_exists(public_path('LOGO-NON-BG.png')) ? filemtime(public_path('LOGO-NON-BG.png')) : time() }}">
        <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32x32.png') }}?v={{ file_exists(public_path('favicon-32x32.png')) ? filemtime(public_path('favicon-32x32.png')) : time() }}">
        <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('favicon-16x16.png') }}?v={{ file_exists(public_path('favicon-16x16.png')) ? filemtime(public_path('favicon-16x16.png')) : time() }}">
        <link rel="shortcut icon" type="image/png" href="{{ asset('LOGO-NON-BG.png') }}?v={{ file_exists(public_path('LOGO-NON-BG.png')) ? filemtime(public_path('LOGO-NON-BG.png')) : time() }}">
        <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}?v={{ file_exists(public_path('apple-touch-icon.png')) ? filemtime(public_path('apple-touch-icon.png')) : time() }}">

        <!-- PWA Web App Manifest & Mobile Meta Tags -->
        <link rel="manifest" href="{{ asset('manifest.json') }}">
        <meta name="theme-color" content="#00875A">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="OPD Referral">
        <meta name="application-name" content="OPD Referral">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
