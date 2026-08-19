<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

use App\Models\User;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'PB_user' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Check whether the user is allowed to access the system.
     * Only doctors (EMP_STS = 'D') or Administrators (Sts = 'Administrator') may log in.
     */
    private function hasAccess(?User $user): bool
    {
        if (!$user) {
            return false;
        }
        return $user->EMP_STS === 'D' || $user->Sts === 'Administrator';
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $credentials = [
            'PB_user' => $this->string('PB_user'),
            'password' => $this->string('password'),
        ];

        $allowed = Auth::attempt($credentials, $this->boolean('remember'), function ($user) {
            return $this->hasAccess($user);
        });

        if (! $allowed) {
            RateLimiter::hit($this->throttleKey());

            // แยกกรณี: รหัสผ่านถูกต้องแต่บัญชีไม่มีสิทธิ์เข้าใช้งาน (เช่น พนักงาน)
            $user = User::where('PB_user', $this->string('PB_user'))->first();
            if ($user && ! $this->hasAccess($user)) {
                $passwordOk = Auth::guard('web')->getProvider()->validateCredentials($user, ['password' => (string) $this->string('password')]);
                if ($passwordOk) {
                    throw ValidationException::withMessages([
                        'PB_user' => 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบ (เฉพาะแพทย์และผู้ดูแลระบบ)',
                    ]);
                }
            }

            throw ValidationException::withMessages([
                'PB_user' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'PB_user' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('PB_user')).'|'.$this->ip());
    }
}
