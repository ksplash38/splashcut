<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = ['user_id', 'plan_id', 'plan_name', 'months', 'amount', 'method', 'reference', 'status', 'sender_name', 'note', 'proof_path'];

    protected function casts(): array
    {
        return ['amount' => 'float', 'approved_at' => 'datetime', 'months' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id, 'plan' => $this->plan_name, 'months' => $this->months, 'amount' => $this->amount,
            'method' => $this->method, 'reference' => $this->reference, 'status' => $this->status,
            'date' => $this->created_at?->toIso8601String(),
        ];
    }
}
