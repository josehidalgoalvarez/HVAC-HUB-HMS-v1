<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Models\SlowRequestLog;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Routing\RouteContext;

class TimingMiddleware implements MiddlewareInterface
{
    public const SLOW_THRESHOLD_MS = 1000;

    public function process(Request $request, RequestHandler $handler): Response
    {
        $start = microtime(true);
        $response = null;
        $threw = false;

        try {
            $response = $handler->handle($request);
            return $response->withHeader('X-Response-Time', ((int) round((microtime(true) - $start) * 1000)) . 'ms');
        } catch (\Throwable $e) {
            $threw = true;
            throw $e;
        } finally {
            $durationMs = (int) round((microtime(true) - $start) * 1000);
            if ($durationMs >= self::SLOW_THRESHOLD_MS) {
                $route = null;
                try {
                    $route = RouteContext::fromRequest($request)->getRoute()?->getPattern();
                } catch (\Throwable) {
                    $route = null;
                }
                if ($route === null || $route === '') {
                    $route = $request->getUri()->getPath();
                }

                $user = $request->getAttribute('user');
                $userId = is_array($user) && isset($user['id']) ? (int) $user['id'] : null;

                SlowRequestLog::log([
                    'method' => $request->getMethod(),
                    'route' => $route,
                    'duration_ms' => $durationMs,
                    'status_code' => $threw ? 500 : ($response?->getStatusCode() ?? 200),
                    'user_id' => $userId,
                ]);
            }
        }
    }
}
