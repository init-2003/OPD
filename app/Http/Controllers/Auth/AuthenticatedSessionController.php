<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
            'logout_success' => session('logout_success'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();
        $request->session()->forget(['dashboard_date', 'dashboard_search']);

        $today = now()->timezone('Asia/Bangkok')->format('Y-m-d');

        return redirect()->route('dashboard', ['date' => $today])
            ->with('login_success', true)
            ->with('success', 'เข้าสู่ระบบสำเร็จ');
    }


    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->session()->forget(['dashboard_date', 'dashboard_search']);

        $cookieName = Auth::guard('web')->getRecallerName();

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('login')
            ->withCookie(\Illuminate\Support\Facades\Cookie::forget($cookieName))
            ->with('logout_success', true)
            ->with('status', 'ออกจากระบบสำเร็จ');
    }
}


