<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = ['name', 'months', 'price', 'old_price', 'description', 'is_popular', 'active', 'sort'];

    protected function casts(): array
    {
        return ['price' => 'float', 'old_price' => 'float', 'is_popular' => 'boolean', 'active' => 'boolean', 'months' => 'integer'];
    }

    public function scopeVisible($q)
    {
        return $q->where('active', true)->orderBy('sort')->orderBy('months');
    }

    public function perMonth(): float
    {
        return $this->months > 0 ? $this->price / $this->months : $this->price;
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'months' => $this->months,
            'price' => $this->price, 'old_price' => $this->old_price,
            'per_month' => round($this->perMonth(), 2), 'description' => $this->description,
            'popular' => $this->is_popular,
        ];
    }
}
