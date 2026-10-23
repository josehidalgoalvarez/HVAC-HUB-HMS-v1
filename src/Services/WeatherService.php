<?php

declare(strict_types=1);

namespace App\Services;

use DateTimeImmutable;
use Throwable;

/**
 * WeatherService
 * Fetches and caches weather forecast data from Open-Meteo (no API key required).
 * Reduced to one question: is rain expected for a given date?
 * Zero temperature, zero freeze logic, zero week-outlook text.
 */
class WeatherService
{
    public const DEFAULT_LAT = 44.2312;
    public const DEFAULT_LON = -76.4860; // Kingston, ON (default service area)
    private const CACHE_TTL_SECONDS = 3600; // 1 hour

    private static ?array $mockForecast = null;

    /**
     * Set a mock forecast for testing or offline environments.
     */
    public static function setMockForecast(?array $forecast): void
    {
        self::$mockForecast = $forecast;
    }

    /**
     * Clear the mock forecast.
     */
    public static function clearMock(): void
    {
        self::$mockForecast = null;
    }

    /**
     * Fetch daily forecast from Open-Meteo or local cache.
     */
    public static function getDailyForecast(
        float $lat = self::DEFAULT_LAT,
        float $lon = self::DEFAULT_LON,
        bool $forceFresh = false
    ): array {
        if (self::$mockForecast !== null) {
            return self::$mockForecast;
        }

        $cacheDir = __DIR__ . '/../../storage/cache';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0777, true);
        }

        $cacheKey = sprintf('weather_rain_%s_%s.json', number_format($lat, 4, '', ''), number_format($lon, 4, '', ''));
        $cacheFile = $cacheDir . '/' . $cacheKey;

        if (!$forceFresh && file_exists($cacheFile)) {
            $mtime = filemtime($cacheFile);
            if ($mtime !== false && (time() - $mtime) < self::CACHE_TTL_SECONDS) {
                $content = @file_get_contents($cacheFile);
                if ($content !== false) {
                    $decoded = json_decode($content, true);
                    if (is_array($decoded) && !empty($decoded['daily'])) {
                        return $decoded;
                    }
                }
            }
        }

        $url = sprintf(
            'https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&daily=precipitation_sum,precipitation_probability_max,weathercode&timezone=auto&forecast_days=7',
            $lat,
            $lon
        );

        $context = stream_context_create([
            'http' => [
                'timeout' => 4,
                'header' => "User-Agent: HVACHome-Weather/2.0\r\n"
            ]
        ]);

        try {
            $raw = @file_get_contents($url, false, $context);
            if ($raw !== false) {
                $data = json_decode($raw, true);
                if (is_array($data) && !empty($data['daily'])) {
                    @file_put_contents($cacheFile, $raw);
                    return $data;
                }
            }
        } catch (Throwable) {
            // Network fallback below
        }

        if (file_exists($cacheFile)) {
            $fallback = @file_get_contents($cacheFile);
            if ($fallback !== false) {
                $decoded = json_decode($fallback, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        return self::generateDefaultDailyForecast();
    }

    /**
     * Check if rain is expected for a specific date (YYYY-MM-DD).
     * Returns true if daily precipitation_sum >= 1.0mm, precipitation_probability_max >= 50%,
     * or rain weather codes are present.
     */
    public static function isRainExpected(
        string $date,
        float $lat = self::DEFAULT_LAT,
        float $lon = self::DEFAULT_LON,
        ?array $customForecast = null
    ): bool {
        $forecast = $customForecast ?? self::getDailyForecast($lat, $lon);

        if (empty($forecast['daily']['time'])) {
            return false;
        }

        $times = $forecast['daily']['time'];
        $precip = $forecast['daily']['precipitation_sum'] ?? [];
        $prob = $forecast['daily']['precipitation_probability_max'] ?? [];
        $codes = $forecast['daily']['weathercode'] ?? [];

        // Rain weather codes in WMO table:
        // 51..57: Drizzle
        // 61..67: Rain
        // 80..82: Rain showers
        // 95..99: Thunderstorms
        $rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

        $targetDate = substr(trim($date), 0, 10);

        foreach ($times as $idx => $timeStr) {
            if ($timeStr === $targetDate) {
                $pSum = isset($precip[$idx]) ? (float) $precip[$idx] : 0.0;
                $pProb = isset($prob[$idx]) ? (float) $prob[$idx] : 0.0;
                $wCode = isset($codes[$idx]) ? (int) $codes[$idx] : 0;

                if ($pSum >= 1.0 || $pProb >= 50.0 || in_array($wCode, $rainCodes, true)) {
                    return true;
                }
                return false;
            }
        }

        return false;
    }

    private static function generateDefaultDailyForecast(): array
    {
        $times = [];
        $precip = [];
        $prob = [];
        $codes = [];
        $today = new DateTimeImmutable();

        for ($i = 0; $i < 7; $i++) {
            $times[] = $today->modify("+{$i} days")->format('Y-m-d');
            $precip[] = 0.0;
            $prob[] = 10.0;
            $codes[] = 1; // Clear / mainly clear
        }

        return [
            'daily' => [
                'time' => $times,
                'precipitation_sum' => $precip,
                'precipitation_probability_max' => $prob,
                'weathercode' => $codes,
            ]
        ];
    }
}
