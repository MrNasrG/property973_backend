<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class PhoneOtpService
{
    public const PURPOSE_REGISTER = 'register';

    public const PURPOSE_FORGOT_PASSWORD = 'forgot_password';

    protected function otpCacheKey(string $purpose, string $e164Phone): string
    {
        return 'otp:'.$purpose.':'.$e164Phone;
    }

    protected function throttleKey(string $purpose, string $e164Phone): string
    {
        return 'otp-throttle:'.$purpose.':'.$e164Phone;
    }

    public function otpTtlSeconds(): int
    {
        return (int) config('otp.expires_minutes', 10) * 60;
    }

    public function resendCooldownSeconds(): int
    {
        return (int) config('otp.resend_seconds', 60);
    }

    /**
     * Generate and store OTP; enforces resend cooldown.
     *
     * @return array{otp?: string, expires_in: int, retry_after?: int}
     */
    public function send(string $purpose, string $e164Phone): array
    {
        $throttleKey = $this->throttleKey($purpose, $e164Phone);
        if (RateLimiter::tooManyAttempts($throttleKey, 1)) {
            return [
                'retry_after' => RateLimiter::availableIn($throttleKey),
                'expires_in' => $this->otpTtlSeconds(),
            ];
        }

        $otp = sprintf('%04d', random_int(0, 9999));
        $ttl = $this->otpTtlSeconds();
        Cache::put(
            $this->otpCacheKey($purpose, $e164Phone),
            Hash::make($otp),
            now()->addSeconds($ttl)
        );

        RateLimiter::hit($throttleKey, $this->resendCooldownSeconds());

        $out = ['expires_in' => $ttl];
        if (config('app.debug')) {
            $out['debug_otp'] = $otp;
        }

        return $out;
    }

    public function verify(string $purpose, string $e164Phone, string $otp): bool
    {
        $key = $this->otpCacheKey($purpose, $e164Phone);
        $hash = Cache::get($key);
        if (! is_string($hash) || strlen((string) $otp) !== 4 || ! ctype_digit((string) $otp)) {
            return false;
        }

        if (! Hash::check($otp, $hash)) {
            return false;
        }

        Cache::forget($key);

        return true;
    }

    public function peekValid(string $purpose, string $e164Phone): bool
    {
        return Cache::has($this->otpCacheKey($purpose, $e164Phone));
    }
}
