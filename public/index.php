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

    return Auth::jsonError($errorCode, $message, $statusCode);
});

$app->run();
