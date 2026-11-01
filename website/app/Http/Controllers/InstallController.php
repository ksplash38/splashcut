<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class InstallController extends Controller
{
    private function checks(): array
    {
        $ext = ['pdo_mysql', 'mbstring', 'openssl', 'tokenizer', 'xml', 'ctype', 'json', 'fileinfo', 'curl'];
        $c = ['PHP 8.2 or newer (you have ' . PHP_VERSION . ')' => version_compare(PHP_VERSION, '8.2.0', '>=')];
        foreach ($ext as $e) $c["PHP extension: $e"] = extension_loaded($e);
        $c['storage folder is writable'] = is_writable(storage_path()) && is_writable(storage_path('framework'));
        $c['bootstrap/cache folder is writable'] = is_writable(base_path('bootstrap/cache'));
        $c['.env file is writable'] = is_writable(base_path('.env')) || (!file_exists(base_path('.env')) && is_writable(base_path()));
        return $c;
    }

    public function show(Request $r)
    {
        return view('install', ['checks' => $this->checks(), 'url' => $r->getSchemeAndHttpHost()]);
    }

    public function run(Request $r)
    {
        $d = $r->validate([
            'app_url' => 'required|url',
            'db_host' => 'required|string', 'db_port' => 'required|integer', 'db_name' => 'required|string',
            'db_user' => 'required|string', 'db_pass' => 'nullable|string',
            'admin_name' => 'required|string|max:80', 'admin_email' => 'required|email', 'admin_password' => 'required|string|min:8|confirmed',
        ]);
        if (in_array(false, $this->checks(), true)) return back()->withInput()->withErrors(['checks' => 'Fix the items marked in red first.']);

        try {
            new \PDO("mysql:host={$d['db_host']};port={$d['db_port']};dbname={$d['db_name']};charset=utf8mb4", $d['db_user'], $d['db_pass'] ?? '', [\PDO::ATTR_TIMEOUT => 8]);
        } catch (\Throwable $e) {
            return back()->withInput()->withErrors(['db_host' => 'Could not connect to the database: ' . $e->getMessage()]);
        }

        $q = fn ($v) => '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], (string) $v) . '"';
        $env = implode("\n", [
            'APP_NAME=SplashCut', 'APP_ENV=production', 'APP_KEY=base64:' . base64_encode(random_bytes(32)), 'APP_DEBUG=false',
            'APP_URL=' . rtrim($d['app_url'], '/'), 'APP_TIMEZONE=Africa/Lagos', '',
            'LOG_CHANNEL=single', 'LOG_LEVEL=error', '',
            'DB_CONNECTION=mysql', 'DB_HOST=' . $d['db_host'], 'DB_PORT=' . $d['db_port'], 'DB_DATABASE=' . $q($d['db_name']),
            'DB_USERNAME=' . $q($d['db_user']), 'DB_PASSWORD=' . $q($d['db_pass'] ?? ''), '',
            'SESSION_DRIVER=file', 'SESSION_LIFETIME=720', 'CACHE_STORE=file', 'QUEUE_CONNECTION=sync', 'FILESYSTEM_DISK=local', '',
        ]);
        file_put_contents(base_path('.env'), $env);

        config([
            'database.default' => 'mysql',
            'database.connections.mysql.host' => $d['db_host'], 'database.connections.mysql.port' => $d['db_port'],
            'database.connections.mysql.database' => $d['db_name'], 'database.connections.mysql.username' => $d['db_user'],
            'database.connections.mysql.password' => $d['db_pass'] ?? '',
        ]);
        DB::purge('mysql');
        DB::reconnect('mysql');

        try {
            Artisan::call('migrate', ['--force' => true]);
            static::seed($d['admin_name'], $d['admin_email'], $d['admin_password']);
        } catch (\Throwable $e) {
            return back()->withInput()->withErrors(['db_host' => 'Setting up the database failed: ' . $e->getMessage()]);
        }
        Cache::flush();
        @mkdir(storage_path('app'), 0775, true);
        file_put_contents(storage_path('app/installed'), now()->toIso8601String());
        try { Artisan::call('config:clear'); } catch (\Throwable $e) { }
        return redirect(rtrim($d['app_url'], '/') . '/admin/login?installed=1');
    }

    public static function seed(string $name, string $email, string $password): void
    {
        $admin = User::firstOrNew(['email' => strtolower($email)]);
        $admin->name = $name;
        $admin->password = $password;
        $admin->is_admin = true;
        $admin->save();
        if (!Plan::query()->exists()) {
            Plan::create(['name' => 'Monthly', 'months' => 1, 'price' => 2500, 'sort' => 1, 'description' => 'Full Pro access for 1 month']);
            Plan::create(['name' => 'Quarterly', 'months' => 3, 'price' => 6500, 'old_price' => 7500, 'is_popular' => true, 'sort' => 2, 'description' => 'Best for regular creators']);
            Plan::create(['name' => 'Yearly', 'months' => 12, 'price' => 20000, 'old_price' => 30000, 'sort' => 3, 'description' => 'Lowest price per month']);
        }
        foreach (Setting::DEFAULTS as $k => $v) Setting::query()->firstOrCreate(['key' => $k], ['value' => $v]);
        Cache::forget('settings');
    }
}
