<?php
// ============================================================
//  contacts/api/index.php - Modified form of api/index.php, described below.
//
//  api/index.php — Unified Colors Manager RESTful API
//
//  GET    /api/index.php?ping=1   — status ping health check
//  POST   /api/index.php (login)  — authenticate user
//  GET    /api/index.php          — list all colors for user
//  GET    /api/index.php?q=term   — partial search colors
//  GET    /api/index.php?id=1     — get single color by ID
//  POST   /api/index.php (color)  — create new color
//  PUT    /api/index.php?id=1     — update color by ID
//  DELETE /api/index.php?id=1     — delete color by ID
// ============================================================

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

setCORSHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

// 1. Unauthenticated Health Check (Ping)
if ($method === 'GET' && (isset($_GET['ping']) || (isset($_GET['action']) && $_GET['action'] === 'ping'))) {
    respond(200, ['status' => 'OK', 'timestamp' => time()]);
}

// 2. Create a new User or log in (POST with new user information in body)
if ($method === 'POST') {
    $body = getRequestBody();

    if(isset($body['login']) && isset($body['password']) && isset($body['first_name']) && isset($body['last_name'])) {
        // Create a new user
        $login = clean($body['login']);
        $password = clean($body['password']);
        $firstName = clean($body['first_name']);
        $lastName = clean($body['last_name']);

        if(!($login && $password && $firstName && $lastName)) {
            respond(400, ['error' => "Login, password, first name and last name are required"]);
        }

	    // If the user entered a login that already exists, don't let them create their account
	    $loginCount = userExists($login, $db);

        if($loginCount < 1) {
            // Hash & salt the user's password
            $password = password_hash($password, PASSWORD_DEFAULT);

            // If the user provided all the information, create their account
            $astmt = $db->prepare("INSERT INTO `Users` (`FirstName`, `LastName`, `Login`, `Password`) VALUES (:first_name, :last_name, :login, :password)");
            $astmt->execute([':first_name' => $firstName, ':last_name' => $lastName, ':login' => $login, ':password' => $password]);

            respond(201, [
                "login" => $login,
                "message" => "User successfully created"
            ]);
        } else {
            // If we couldn't add them to the database, there's something wrong with their request, so
            // respond with an "Unprocessable Content" error
            respond(422, [
                'login'     => $login,
                'error'     => 'The requested Login is already in use'
            ]);
        }


    } else if (isset($body['login']) && isset($body['password'])) {
        // Log in as existing user
        $login    = clean($body['login']);
        $password = clean($body['password']);

        if (!$login || !$password) {
            respond(400, ['error' => 'Login and password are required']);
        }

        $stmt = $db->prepare('SELECT ID, firstName, lastName, Password FROM Users WHERE Login = :login');
        $stmt->execute([':login' => $login]);
        $user = $stmt->fetch();

        if ($user) {
            // If the password was correct, log the user in
            if(password_verify($password, $user["Password"])) {
                logInResponse($user);
            } else {
                respond(401, [
                    id => 0,
                    'firstName' => '',
                    'lastName'  => '',
                    'error'     => 'Incorrect Password'
                ]);
            }

        } else {
            respond(401, [
                'id'        => 0,
                'firstName' => '',
                'lastName'  => '',
                'error'     => 'No Records Found'

            ]);
        }
    }

}


// 4. All other routes require an authenticated user
$userId = requireAuth();

switch ($method) {

    // ── GET: search, list, or single color ──────────────────
    case 'GET':
        $id     = isset($_GET['id']) ? (int) $_GET['id'] : null;
        $search = isset($_GET['q'])  ? trim($_GET['q'])  : (isset($_GET['search']) ? trim($_GET['search']) : null);

        // Single color by ID
        if ($id) {
            $stmt = $db->prepare('SELECT ID as id, Name as name, UserID as user_id FROM Colors WHERE ID = :id AND UserID = :uid LIMIT 1');
            $stmt->execute([':id' => $id, ':uid' => $userId]);
            $color = $stmt->fetch();
            if (!$color) {
                respond(404, ['error' => 'Color not found']);
            }
            respond(200, $color);
        }

        // Search colors (partial match)
        if ($search !== null && $search !== '') {
            $like = '%' . $search . '%';
            $stmt = $db->prepare('SELECT ID as id, Name as name FROM Colors WHERE UserID = :uid AND Name LIKE :q ORDER BY Name');
            $stmt->execute([':uid' => $userId, ':q' => $like]);
            $rows = $stmt->fetchAll();
            $results = array_column($rows, 'name');
            if (empty($results)) {
                respond(200, ['results' => [], 'colors' => [], 'error' => 'No Records Found']);
            }
            respond(200, ['results' => $results, 'colors' => $rows, 'error' => '']);
        }

        // List all colors
        $stmt = $db->prepare('SELECT ID as id, Name as name FROM Colors WHERE UserID = :uid ORDER BY Name');
        $stmt->execute([':uid' => $userId]);
        $rows = $stmt->fetchAll();
        $results = array_column($rows, 'name');
        if (empty($results)) {
            respond(200, ['results' => [], 'colors' => [], 'error' => 'No Records Found']);
        }
        respond(200, ['results' => $results, 'colors' => $rows, 'error' => '']);
        break;

    // ── POST: create color ───────────────────────────────────
    case 'POST':
        $body  = getRequestBody();
        $color = clean($body['color'] ?? $body['name'] ?? '');
        if (!$color) {
            respond(400, ['error' => 'Color name is required']);
        }

        $stmt = $db->prepare('INSERT INTO Colors (UserID, Name) VALUES (:uid, :name)');
        $stmt->execute([':uid' => $userId, ':name' => $color]);

        respond(201, [
            'message' => 'Color created',
            'id'      => (int) $db->lastInsertId(),
            'error'   => ''
        ]);
        break;

    // ── PUT: update color ─────────────────────────────────────
    case 'PUT':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if (!$id) {
            respond(400, ['error' => 'Color ID is required — use ?id=']);
        }

        $check = $db->prepare('SELECT ID FROM Colors WHERE ID = :id AND UserID = :uid LIMIT 1');
        $check->execute([':id' => $id, ':uid' => $userId]);
        if (!$check->fetch()) {
            respond(404, ['error' => 'Color not found']);
        }

        $body  = getRequestBody();
        $color = clean($body['color'] ?? $body['name'] ?? '');
        if (!$color) {
            respond(400, ['error' => 'Color name is required']);
        }

        $stmt = $db->prepare('UPDATE Colors SET Name = :name WHERE ID = :id AND UserID = :uid');
        $stmt->execute([':name' => $color, ':id' => $id, ':uid' => $userId]);

        respond(200, ['message' => 'Color updated', 'error' => '']);
        break;

    // ── DELETE: delete color ──────────────────────────────────
    case 'DELETE':
        $id   = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        $name = isset($_GET['name']) ? clean($_GET['name']) : '';

        if ($id > 0) {
            $stmt = $db->prepare('DELETE FROM Colors WHERE ID = :id AND UserID = :uid');
            $stmt->execute([':id' => $id, ':uid' => $userId]);
        } elseif ($name !== '') {
            $stmt = $db->prepare('DELETE FROM Colors WHERE Name = :name AND UserID = :uid LIMIT 1');
            $stmt->execute([':name' => $name, ':uid' => $userId]);
        } else {
            respond(400, ['error' => 'Color ID or Name is required — use ?id= or ?name=']);
        }

        if ($stmt->rowCount() === 0) {
            respond(404, ['error' => 'Color not found']);
        }

        respond(200, ['message' => 'Color deleted', 'error' => '']);
        break;

    default:
        respond(405, ['error' => 'Method not allowed']);
}
