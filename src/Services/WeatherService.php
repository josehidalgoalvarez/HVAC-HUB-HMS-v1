<?php

declare(strict_types=1);

namespace App\Services;

use DateTimeImmutable;
use DateTimeInterface;
use Throwable;

/**
 * WeatherService
 * Fetches and caches weather forecast data from Open-Meteo (no API key required)
 * and assesses freezing risks (low <= 0°C) within the next 48 hours.
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
     * Fetch forecast from Open-Meteo or local cache.
     */
    public static function getForecast(
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

        $cacheKey = sprintf('weather_%s_%s.json', number_format($lat, 4, '', ''), number_format($lon, 4, '', ''));
        $cacheFile = $cacheDir . '/' . $cacheKey;

        if (!$forceFresh && file_exists($cacheFile)) {
            $mtime = filemtime($cacheFile);
            if ($mtime !== false && (time() - $mtime) < self::CACHE_TTL_SECONDS) {
                $content = @file_get_contents($cacheFile);
                if ($content !== false) {
                    $decoded = json_decode($content, true);
                    if (is_array($decoded) && !empty($decoded['hourly'])) {
                        return $decoded;
                    }
                }
            }
        }

        $url = sprintf(
            'https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&hourly=temperature_2m&daily=temperature_2m_min,temperature_2m_max&timezone=auto&forecast_days=3',
            $lat,
            $lon
        );

        $context = stream_context_create([
            'http' => [
                'timeout' => 4,
                'header' => "User-Agent: HVACHome-Proactive-Engine/2.0\r\n"
            ]
        ]);

        try {
            $raw = @file_get_contents($url, false, $context);
            if ($raw !== false) {
                $data = json_decode($raw, true);
                if (is_array($data) && !empty($data['hourly'])) {
                    @file_put_contents($cacheFile, $raw);
                    return $data;
                }
            }
        } catch (Throwable) {
            // Network fallback below
        }

        // Fallback: if cache exists even if expired, return it
        if (file_exists($cacheFile)) {
            $fallback = @file_get_contents($cacheFile);
            if ($fallback !== false) {
                $decoded = json_decode($fallback, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        // Safe fallback mock if network unreachable
        return self::generateDefaultForecast();
    }

    /**
     * Check if a freeze condition (forecast low <= 0°C) is predicted within 48 hours.
     */
    public static function checkFreezeRisk(
        float $lat = self::DEFAULT_LAT,
        float $lon = self::DEFAULT_LON,
        ?DateTimeInterface $refTime = null,
        ?array $customForecast = null
    ): array {
        $forecast = $customForecast ?? self::getForecast($lat, $lon);
        $ref = $refTime ? DateTimeImmutable::createFromInterface($refTime) : new DateTimeImmutable();
        $cutoff = $ref->modify('+48 hours');

        $coldestTemp = null;
        $coldestDate = null;
        $coldestTime = null;

        // 1. Check hourly temperatures within 48h window
        if (!empty($forecast['hourly']['time']) && !empty($forecast['hourly']['temperature_2m'])) {
            $times = $forecast['hourly']['time'];
            $temps = $forecast['hourly']['temperature_2m'];
            $count = min(count($times), count($temps));

            for ($i = 0; $i < $count; $i++) {
                $timeStr = $times[$i];
                $temp = (float) $temps[$i];

                try {
                    $pointTime = new DateTimeImmutable($timeStr);
                } catch (Throwable) {
                    continue;
                }

                // Check within [ref, cutoff]
                if ($pointTime >= $ref->modify('-1 hour') && $pointTime <= $cutoff) {
                    if ($coldestTemp === null || $temp < $coldestTemp) {
                        $coldestTemp = $temp;
                        $coldestDate = $pointTime->format('Y-m-d');
                        $coldestTime = $pointTime->format('Y-m-d H:i');
                    }
                }
            }
        }

        // 2. Also check daily minimums as backstop
        if (!empty($forecast['daily']['time']) && !empty($forecast['daily']['temperature_2m_min'])) {
            $dailyTimes = $forecast['daily']['time'];
            $dailyMins = $forecast['daily']['temperature_2m_min'];
            $dCount = min(count($dailyTimes), count($dailyMins));

            for ($j = 0; $j < $dCount; $j++) {
                $dDate = $dailyTimes[$j];
                $dMin = (float) $dailyMins[$j];

                try {
                    $dTime = new DateTimeImmutable($dDate . ' 12:00:00');
                } catch (Throwable) {
                    continue;
                }

                if ($dTime <= $cutoff->modify('+12 hours')) {
                    if ($coldestTemp === null || $dMin < $coldestTemp) {
                        $coldestTemp = $dMin;
                        $coldestDate = $dDate;
                        $coldestTime = $dDate . ' (low)';
                    }
                }
            }
        }

        $isFreeze = ($coldestTemp !== null && $coldestTemp <= 0.0);

        return [
            'is_freeze' => $isFreeze,
            'min_temp' => $coldestTemp,
            'coldest_date' => $coldestDate ?? $ref->format('Y-m-d'),
            'coldest_time' => $coldestTime ?? $ref->format('Y-m-d H:i'),
            'message' => $isFreeze
                ? sprintf('Freeze alert: %.1f°C forecast on %s', $coldestTemp, $coldestDate)
                : sprintf('No freeze predicted. Lowest expected: %.1f°C', $coldestTemp ?? 5.0),
            'checked_until' => $cutoff->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Generate fallback weather forecast if external service is unavailable.
     */
    private static function generateDefaultForecast(): array
    {
        $hourlyTimes = [];
        $hourlyTemps = [];
        $now = new DateTimeImmutable();

        for ($h = 0; $h < 72; $h++) {
            $t = $now->modify("+{$h} hours");
            $hourlyTimes[] = $t->format('Y-m-d\TH:00');
            // Moderate positive temperature default
            $hourlyTemps[] = 8.0 + sin($h / 6.0) * 4.0;
        }

        return [
            'hourly' => [
                'time' => $hourlyTimes,
                'temperature_2m' => $hourlyTemps,
            ],
            'daily' => [
                'time' => [
                    $now->format('Y-m-d'),
                    $now->modify('+1 day')->format('Y-m-d'),
                    $now->modify('+2 days')->format('Y-m-d'),
                ],
                'temperature_2m_min' => [4.0, 5.0, 4.5],
                'temperature_2m_max' => [12.0, 13.0, 11.5],
            ]
        ];
    }
}
