<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    protected $fillable = ['name', 'email', 'phone', 'password', 'device'];

    protected $hidden = ['password', 'remember_token', 'api_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'blocked' => 'boolean',
            'trial_ends_at' => 'datetime',
            'subscribed_until' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest();
    }

    /** One of: blocked, active (paid), trial, expired. */
    public function status(): string
    {
        if ($this->blocked) return 'blocked';
        if ($this->subscribed_until && $this->subscribed_until->isFuture()) return 'active';
        if ($this->trial_ends_at && $this->trial_ends_at->isFuture()) return 'trial';
        return 'expired';
    }

    public function canExport(): bool
    {
        return in_array($this->status(), ['active', 'trial'], true);
    }

    /** The moment access ends (latest of paid time and trial). */
    public function accessUntil(): ?Carbon
    {
        $dates = array_filter([$this->subscribed_until, $this->trial_ends_at]);
        if (!$dates) return null;
        return collect($dates)->max();
    }

    public function daysLeft(): int
    {
        $until = $this->accessUntil();
        if (!$until || $until->isPast()) return 0;
        return (int) ceil(now()->diffInSeconds($until) / 86400);
    }

    /** Creates a fresh login token (signs out any other phone) and returns the plain value. */
    public function issueToken(): string
    {
        $plain = Str::random(60);
        $this->api_token = hash('sha256', $plain);
        $this->save();
        return $plain;
    }

    /** Adds paid months on top of whatever access the user still has. */
    public function addMonths(int $months): void
    {
        $base = collect([now(), $this->subscribed_until, $this->trial_ends_at])->filter()->max();
        $this->subscribed_until = $base->copy()->addMonthsNoOverflow($months);
        $this->save();
    }

    public function toApi(): array
    {
        $until = $this->accessUntil();
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status(),
            'can_export' => $this->canExport(),
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'subscribed_until' => $this->subscribed_until?->toIso8601String(),
            'access_until' => $until?->toIso8601String(),
            'days_left' => $this->daysLeft(),
            'max_resolution' => $this->canExport() ? 2160 : 0,
            'pending_payment' => $this->payments()->where('status', 'pending')->exists(),
        ];
    }
}
