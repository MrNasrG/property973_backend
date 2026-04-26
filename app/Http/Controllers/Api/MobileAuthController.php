<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PhoneOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MobileAuthController extends Controller
{
    public function __construct(
        protected PhoneOtpService $otp
    ) {}

    public function register(Request $request): JsonResponse
    {
        $data = $this->validatePhonePayload($request, withName: true, withPassword: true, requireName: true);
        $phone = $data['phone'];
        $country = $data['country_code'];

        if (User::where('country_code', $country)->where('phone', $phone)->whereNotNull('phone_verified_at')->exists()) {
            return response()->json(['message' => 'An account with this number already exists.'], 422);
        }

        $existing = User::where('country_code', $country)->where('phone', $phone)->first();

        if ($existing !== null) {
            $send = $this->otp->send(PhoneOtpService::PURPOSE_REGISTER, $data['e164']);
            if (isset($send['retry_after'])) {
                return response()->json([
                    'message' => 'Please wait before requesting a new code.',
                    'retry_after' => $send['retry_after'],
                ], 429);
            }

            return $this->otpSentResponse(
                'Verification code sent. Complete sign up with OTP.',
                $send
            );
        }

        User::create([
            'name' => $data['name'],
            'email' => $this->syntheticEmail($data['e164']),
            'password' => $data['password'],
            'country_code' => $country,
            'phone' => $phone,
            'phone_verified_at' => null,
        ]);

        $send = $this->otp->send(PhoneOtpService::PURPOSE_REGISTER, $data['e164']);
        if (isset($send['retry_after'])) {
            return response()->json([
                'message' => 'Please wait before requesting a new code.',
                'retry_after' => $send['retry_after'],
            ], 429);
        }

        return $this->otpSentResponse('Account created. Verify your phone with the 4-digit code.', $send);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $this->validatePhonePayload($request, withName: false, withPassword: true, requireName: false);

        $user = User::where('country_code', $data['country_code'])
            ->where('phone', $data['phone'])
            ->first();

        if ($user === null || ! Hash::check((string) $request->input('password'), $user->getAuthPassword())) {
            return response()->json(['message' => __('auth.failed')], 401);
        }

        if ($user->phone_verified_at === null) {
            return response()->json([
                'message' => 'Please verify your phone number before signing in.',
                'requires_verification' => true,
            ], 403);
        }

        $token = auth('api')->login($user);

        return $this->respondWithToken($token, $user);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $this->validatePhonePayload($request, withName: false, withPassword: false, requireName: false);

        $user = User::where('country_code', $data['country_code'])
            ->where('phone', $data['phone'])
            ->first();

        if ($user === null || $user->phone_verified_at === null) {
            return response()->json([
                'message' => 'If an account exists for this number, a verification code has been sent.',
            ]);
        }

        $send = $this->otp->send(PhoneOtpService::PURPOSE_FORGOT_PASSWORD, $data['e164']);
        if (isset($send['retry_after'])) {
            return response()->json([
                'message' => 'Please wait before requesting a new code.',
                'retry_after' => $send['retry_after'],
            ], 429);
        }

        return $this->otpSentResponse(
            'If an account exists for this number, a verification code has been sent.',
            $send
        );
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_code' => ['required', 'string', 'max:8', 'regex:/^\+[1-9]\d{0,5}$/'],
            'mobile_number' => ['required', 'string', 'regex:/^[0-9\s]{8,15}$/'],
            'otp' => ['required', 'string', 'size:4', 'regex:/^[0-9]+$/'],
            'purpose' => ['required', 'string', Rule::in([
                PhoneOtpService::PURPOSE_REGISTER,
                PhoneOtpService::PURPOSE_FORGOT_PASSWORD,
            ])],
        ]);

        $phone = preg_replace('/\s+/', '', $validated['mobile_number']);
        $e164 = $validated['country_code'].$phone;

        if (! $this->otp->verify($validated['purpose'], $e164, $validated['otp'])) {
            return response()->json(['message' => 'Invalid or expired verification code.'], 422);
        }

        if ($validated['purpose'] === PhoneOtpService::PURPOSE_REGISTER) {
            $user = User::where('country_code', $validated['country_code'])
                ->where('phone', $phone)
                ->first();

            if ($user === null) {
                return response()->json(['message' => 'No pending registration for this number.'], 422);
            }

            if ($user->phone_verified_at !== null) {
                $token = auth('api')->login($user);

                return $this->respondWithToken($token, $user);
            }

            $user->forceFill(['phone_verified_at' => now()])->save();

            $token = auth('api')->login($user->fresh());

            return $this->respondWithToken($token, $user);
        }

        $user = User::where('country_code', $validated['country_code'])
            ->where('phone', $phone)
            ->whereNotNull('phone_verified_at')
            ->first();

        if ($user === null) {
            return response()->json(['message' => 'Unable to reset password for this number.'], 422);
        }

        $plainToken = Str::random(64);
        Cache::put(
            'mobile-pwd-reset:'.$plainToken,
            $user->getKey(),
            now()->addMinutes(30)
        );

        return response()->json([
            'message' => 'Code verified. You can set a new password.',
            'password_reset_token' => $plainToken,
            'expires_in' => 30 * 60,
        ]);
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_code' => ['required', 'string', 'max:8', 'regex:/^\+[1-9]\d{0,5}$/'],
            'mobile_number' => ['required', 'string', 'regex:/^[0-9\s]{8,15}$/'],
            'purpose' => ['required', 'string', Rule::in([
                PhoneOtpService::PURPOSE_REGISTER,
                PhoneOtpService::PURPOSE_FORGOT_PASSWORD,
            ])],
        ]);

        $phone = preg_replace('/\s+/', '', $validated['mobile_number']);
        $e164 = $validated['country_code'].$phone;

        if ($validated['purpose'] === PhoneOtpService::PURPOSE_REGISTER) {
            $exists = User::where('country_code', $validated['country_code'])
                ->where('phone', $phone)
                ->exists();
            if (! $exists) {
                return response()->json(['message' => 'No pending registration for this number.'], 422);
            }
        }

        if ($validated['purpose'] === PhoneOtpService::PURPOSE_FORGOT_PASSWORD) {
            $user = User::where('country_code', $validated['country_code'])
                ->where('phone', $phone)
                ->whereNotNull('phone_verified_at')
                ->first();
            if ($user === null) {
                return response()->json([
                    'message' => 'If an account exists for this number, a verification code has been sent.',
                ]);
            }
        }

        $send = $this->otp->send($validated['purpose'], $e164);
        if (isset($send['retry_after'])) {
            return response()->json([
                'message' => 'Please wait before requesting a new code.',
                'retry_after' => $send['retry_after'],
            ], 429);
        }

        return $this->otpSentResponse('Verification code sent.', $send);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password_reset_token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $key = 'mobile-pwd-reset:'.$validated['password_reset_token'];
        $userId = Cache::pull($key);

        if ($userId === null) {
            return response()->json(['message' => 'Invalid or expired reset token.'], 422);
        }

        $user = User::find($userId);
        if ($user === null) {
            return response()->json(['message' => 'Invalid or expired reset token.'], 422);
        }

        $user->forceFill(['password' => $validated['password']])->save();

        $token = auth('api')->login($user->fresh());

        return $this->respondWithToken($token, $user);
    }

    /**
     * @return array{country_code: string, phone: string, e164: string, name?: string, password?: string}
     */
    protected function validatePhonePayload(
        Request $request,
        bool $withName = false,
        bool $withPassword = false,
        bool $requireName = true
    ): array {
        $rules = [
            'country_code' => ['required', 'string', 'max:8', 'regex:/^\+[1-9]\d{0,5}$/'],
            'mobile_number' => ['required', 'string', 'regex:/^[0-9\s]{8,15}$/'],
        ];

        if ($withName && $requireName) {
            $rules['name'] = ['required', 'string', 'max:255'];
        }

        if ($withPassword) {
            $rules['password'] = ['required', 'string'];
        }

        if ($withName && ! $requireName) {
            $rules['name'] = ['sometimes', 'string', 'max:255'];
        }

        $validated = $request->validate($rules);

        if ($withPassword && $withName) {
            $request->validate([
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);
        }

        $phone = preg_replace('/\s+/', '', $validated['mobile_number']);

        return [
            'country_code' => $validated['country_code'],
            'phone' => $phone,
            'e164' => $validated['country_code'].$phone,
            ...($withName && $requireName ? ['name' => $validated['name']] : []),
            ...($withName && ! $requireName && isset($validated['name']) ? ['name' => $validated['name']] : []),
            ...($withPassword ? ['password' => $validated['password']] : []),
        ];
    }

    protected function syntheticEmail(string $e164): string
    {
        $digits = preg_replace('/\D/', '', $e164) ?? '';

        return 'mobile.'.$digits.'@users.yumni.local';
    }

    /**
     * @param  array<string, mixed>  $send
     */
    protected function otpSentResponse(string $message, array $send): JsonResponse
    {
        $payload = [
            'message' => $message,
            'expires_in' => $send['expires_in'] ?? $this->otp->otpTtlSeconds(),
        ];

        if (isset($send['debug_otp'])) {
            $payload['debug_otp'] = $send['debug_otp'];
        }

        return response()->json($payload, 200);
    }

    protected function respondWithToken(string $token, User $user): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => $user->fresh(),
        ]);
    }
}
