<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAllowedUser
{
    /**
     * Only doctors (EMP_STS = 'D') or Administrators (Sts = 'Administrator')
     * may use the system. Staff accounts are logged out immediately.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            if ($user->EMP_STS !== 'D' && $user->Sts !== 'Administrator') {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect('/login');
            }
        }

        return $next($request);
    }
}
