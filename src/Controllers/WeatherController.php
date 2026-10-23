<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Services\WeatherService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * WeatherController
 * Exposes rain check endpoint answering whether rain is expected for a specific date.
 */
class WeatherController
{
    /**
     * GET /api/weather/rain-check?date=YYYY-MM-DD
     */
    public function rainCheck(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $date = !empty($params['date']) ? trim((string) $params['date']) : date('Y-m-d');

        $isRain = WeatherService::isRainExpected($date);

        return Auth::jsonSuccess([
            'date' => substr($date, 0, 10),
            'rain_expected' => $isRain,
        ]);
    }
}
