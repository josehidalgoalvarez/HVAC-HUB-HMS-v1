<?php

declare(strict_types=1);

use App\Auth;
use App\Config;
use App\Routes;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Exception\HttpException;
use Slim\Factory\AppFactory;
use Slim\Psr7\Response as SlimResponse;

require __DIR__ . '/../vendor/autoload.php';

Config::load();

$app = AppFactory::create();

// Body parsing middleware
$app->addBodyParsingMiddleware();

// Routing middleware
$app->addRoutingMiddleware();

// Global CORS Middleware
$app->add(function (Request $request, RequestHandler $handler): Response {
    $origin = $request->getHeaderLine('Origin');
    $allowedOrigins = Config::get('cors.allowed_origins', []);
    $isAllowed = in_array($origin, $allowedOrigins, true);

    // In local development, also allow any localhost origin
    if (!$isAllowed && !Config::isProduction() && preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin)) {
        $isAllowed = true;
    }

    $allowOriginHeader = $isAllowed ? $origin : ($allowedOrigins[0] ?? '*');

    // Handle preflight OPTIONS request
    if ($request->getMethod() === 'OPTIONS') {
        $response = new SlimResponse(204);
        return $response
            ->withHeader('Access-Control-Allow-Origin', $allowOriginHeader)
            ->withHeader('Access-Control-Allow-Headers', implode(', ', Config::get('cors.allowed_headers', [])))
            ->withHeader('Access-Control-Allow-Methods', implode(', ', Config::get('cors.allowed_methods', [])))
            ->withHeader('Access-Control-Allow-Credentials', 'true');
    }

    $response = $handler->handle($request);

    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowOriginHeader)
        ->withHeader('Access-Control-Allow-Headers', implode(', ', Config::get('cors.allowed_headers', [])))
        ->withHeader('Access-Control-Allow-Methods', implode(', ', Config::get('cors.allowed_methods', [])))
        ->withHeader('Access-Control-Allow-Credentials', 'true');
});

// Register API Routes
Routes::register($app);

// Custom Error Handling: Always return JSON envelope, NEVER HTML
$errorMiddleware = $app->addErrorMiddleware(
    displayErrorDetails: !Config::isProduction(),
    logErrors: true,
    logErrorDetails: true
);

$errorMiddleware->setDefaultErrorHandler(function (
    Request $request,
    Throwable $exception,
    bool $displayErrorDetails,
    bool $logErrors,
    bool $logErrorDetails
) {
    $statusCode = 500;
    $errorCode = 'server_error';
    $message = 'An unexpected internal error occurred';

    if ($exception instanceof HttpException) {
        $statusCode = $exception->getCode();
        if ($statusCode === 404) {
            $errorCode = 'not_found';
            $message = 'Endpoint not found';
        } elseif ($statusCode === 405) {
            $errorCode = 'method_not_allowed';
            $message = 'Method not allowed for this route';
        } else {
            $errorCode = 'http_error';
            $message = $exception->getMessage();
        }
    } elseif ($displayErrorDetails) {
        $message = $exception->getMessage();
    }

    \App\Models\ServerErrorLog::log([
        'level' => 'error',
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'route' => $request->getUri()->getPath(),
        'context' => [
            'method' => $request->getMethod(),
            'path' => $request->getUri()->getPath(),
        ],
    ]);

    return Auth::jsonError($errorCode, $message, $statusCode);
});

set_error_handler(function (int $severity, string $errstr, string $errfile, int $errline): bool {
    if (!in_array($severity, [E_WARNING, E_USER_WARNING, E_USER_ERROR], true)) {
        return false;
    }
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: null;
    $method = $_SERVER['REQUEST_METHOD'] ?? null;
    \App\Models\ServerErrorLog::log([
        'level' => 'warning',
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline,
        'route' => $path,
        'context' => array_filter(['method' => $method, 'path' => $path]),
    ]);
    return false;
}, E_WARNING | E_USER_WARNING | E_USER_ERROR);

register_shutdown_function(function (): void {
    try {
        $err = error_get_last();
        if (!$err || !in_array($err['type'] ?? 0, [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            return;
        }
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: null;
        $method = $_SERVER['REQUEST_METHOD'] ?? null;
        \App\Models\ServerErrorLog::log([
            'level' => 'fatal',
            'message' => (string) ($err['message'] ?? 'Fatal error'),
            'file' => $err['file'] ?? null,
            'line' => $err['line'] ?? null,
            'route' => $path,
            'context' => array_filter(['method' => $method, 'path' => $path]),
        ]);
    } catch (\Throwable) {
        // Best-effort only
    }
});

$app->run();
