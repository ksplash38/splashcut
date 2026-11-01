<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $fillable = ['key', 'value'];

    public const DEFAULTS = [
        'trial_days' => '30',
        'currency' => 'NGN',
        'currency_symbol' => '₦',
        'paystack_public' => '',
        'paystack_secret' => '',
        'bank_accounts' => '[]',
        'payment_instructions' => 'Transfer the exact amount to any account below, then tap "I have paid" and enter the name on your bank account. Your Pro access is activated as soon as we confirm the payment.',
        'whatsapp' => '',
        'support_email' => '',
        'apk_path' => '',
        'apk_version' => '',
        'apk_size' => '0',
        'apk_updated' => '',
        'downloads' => '0',
    ];

    public static function all_(): array
    {
        return Cache::rememberForever('settings', function () {
            $rows = static::query()->pluck('value', 'key')->all();
            return array_merge(static::DEFAULTS, $rows);
        });
    }

    public static function get(string $key, $default = null)
    {
        $all = static::all_();
        return $all[$key] ?? $default;
    }

    public static function put(array $values): void
    {
        foreach ($values as $k => $v) {
            static::query()->updateOrCreate(['key' => $k], ['value' => $v]);
        }
        Cache::forget('settings');
    }

    public static function banks(): array
    {
        $list = json_decode(static::get('bank_accounts', '[]'), true);
        return is_array($list) ? array_values(array_filter($list, fn ($b) => !empty($b['number']))) : [];
    }

    public static function money($amount): string
    {
        $n = (float) $amount;
        return static::get('currency_symbol', '₦') . number_format($n, fmod($n, 1) ? 2 : 0);
    }
}
