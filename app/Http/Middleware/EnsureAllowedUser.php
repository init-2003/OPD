<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAllowedUser
{
    /**
     * Only users with Sts = 'Administrator' and Degree = 4
     * may use the system. Unauthorized accounts are logged out immediately.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            if ($user->Sts !== 'Administrator' || (int)$user->Degree !== 4) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect('/login')->withErrors([
                    'PB_user' => 'บัญชีผู้ใช้นี้ไม่มีสิทธิ์เข้าสู่ระบบ (เฉพาะแพทย์เท่านั้น)',
                ]);
            }
        }

        return $next($request);
    }
}
