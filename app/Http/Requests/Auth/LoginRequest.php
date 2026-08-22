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
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'PB_user.required' => 'กรุณากรอกรหัสผู้ใช้งาน',
            'PB_user.string' => 'รหัสผู้ใช้งานต้องเป็นข้อความ',
            'password.required' => 'กรุณากรอกรหัสผ่าน',
            'password.string' => 'รหัสผ่านต้องเป็นข้อความ',
        ];
    }

    /**
     * Check whether the user is allowed to access the system.
     * Only users with Sts = 'Administrator' and Degree = 4 may log in.
     */
    private function hasAccess(?User $user): bool
    {
        if (!$user) {
            return false;
        }
        return $user->Sts === 'Administrator' && (int)$user->Degree === 4;
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
            'PB_user' => (string) $this->string('PB_user'),
            'password' => (string) $this->string('password'),
        ];

        $provider = Auth::guard('web')->getProvider();
        $user = $provider->retrieveByCredentials($credentials);

        if (! $user || ! $provider->validateCredentials($user, $credentials)) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'PB_user' => 'รหัสผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง',
            ]);
        }

        if (! $this->hasAccess($user)) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'PB_user' => 'บัญชีผู้ใช้นี้ไม่มีสิทธิ์เข้าสู่ระบบ (เฉพาะแพทย์เท่านั้น)',
            ]);
        }

        Auth::login($user, $this->boolean('remember'));
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
            'PB_user' => "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งในอีก {$seconds} วินาที",
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
