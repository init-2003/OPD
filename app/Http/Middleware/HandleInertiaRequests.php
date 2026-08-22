<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $userData = null;
        if ($user) {
            $userData = $user->toArray();
            $userData['name'] = !empty($user->Em_Fullname) ? $user->Em_Fullname : (!empty($user->PB_user) ? $user->PB_user : 'ผู้ใช้งาน');
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $userData,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'login_success' => fn () => $request->session()->get('login_success'),
                'logout_success' => fn () => $request->session()->get('logout_success'),
                'status' => fn () => $request->session()->get('status'),
            ],
        ];
    }

}
