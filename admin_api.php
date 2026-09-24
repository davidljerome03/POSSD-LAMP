<?php
// admin_api.php - Admin Endpoints
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/helpers.php';

setCORSHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

$userId = requireAuth();

// Verify user is Admin
$stmt = $db->prepare('SELECT Role FROM Users WHERE ID = :uid LIMIT 1');
$stmt->execute([':uid' => $userId]);
$adminUser = $stmt->fetch();
if (!$adminUser || $adminUser['Role'] !== 'Admin') {
    respond(403, ['error' => 'Unauthorized. Admin access required.']);
}

$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'users') {
    $search = isset($_GET['q']) ? trim($_GET['q']) : null;
    
    if ($search !== null && $search !== '') {
        $like = '%' . $search . '%';
        $stmt = $db->prepare('
            SELECT ID, FirstName, LastName, Login, Role, IsDisabled, DateCreated 
            FROM Users 
            WHERE FirstName LIKE :q OR LastName LIKE :q OR Login LIKE :q
            ORDER BY ID ASC
        ');
        $stmt->execute([':q' => $like]);
    } else {
        $stmt = $db->prepare('SELECT ID, FirstName, LastName, Login, Role, IsDisabled, DateCreated FROM Users ORDER BY ID ASC');
        $stmt->execute();
    }
    
    respond(200, ['results' => $stmt->fetchAll(), 'error' => '']);
}

if ($method === 'GET' && $action === 'user_contacts') {
    $targetId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$targetId) respond(400, ['error' => 'Target User ID required']);
    
    $stmt = $db->prepare('SELECT ID, FirstName, LastName, Phone, Email FROM Contacts WHERE UserID = :uid ORDER BY FirstName, LastName');
    $stmt->execute([':uid' => $targetId]);
    respond(200, ['results' => $stmt->fetchAll(), 'error' => '']);
}

if ($method === 'PUT' && $action === 'toggle_status') {
    $body = getRequestBody();
    $targetId = isset($body['id']) ? (int)$body['id'] : 0;
    if (!$targetId) respond(400, ['error' => 'Target User ID required']);
    if ($targetId === $userId) respond(400, ['error' => 'Cannot disable yourself']);
    
    $stmt = $db->prepare('SELECT IsDisabled FROM Users WHERE ID = :uid LIMIT 1');
    $stmt->execute([':uid' => $targetId]);
    $user = $stmt->fetch();
    if (!$user) respond(404, ['error' => 'User not found']);
    
    $newStatus = $user['IsDisabled'] ? 0 : 1;
    $upd = $db->prepare('UPDATE Users SET IsDisabled = :st WHERE ID = :uid');
    $upd->execute([':st' => $newStatus, ':uid' => $targetId]);
    
    respond(200, ['message' => 'Status updated', 'isDisabled' => $newStatus, 'error' => '']);
}

if ($method === 'PUT' && $action === 'reset_password') {
    $body = getRequestBody();
    $targetId = isset($body['id']) ? (int)$body['id'] : 0;
    $newPass = $body['password'] ?? '';
    if (!$targetId || !$newPass) respond(400, ['error' => 'User ID and password required']);
    
    $hashed = password_hash($newPass, PASSWORD_DEFAULT);
    $upd = $db->prepare('UPDATE Users SET Password = :pw WHERE ID = :uid');
    $upd->execute([':pw' => $hashed, ':uid' => $targetId]);
    
    respond(200, ['message' => 'Password updated', 'error' => '']);
}

if ($method === 'POST' && $action === 'create_admin') {
    $body = getRequestBody();
    $login = clean($body['login'] ?? '');
    $password = clean($body['password'] ?? '');
    $firstName = clean($body['first_name'] ?? '');
    $lastName = clean($body['last_name'] ?? '');
    
    if(!($login && $password && $firstName && $lastName)) {
        respond(400, ['error' => 'All fields required']);
    }
    
    if(userExists($login, $db) > 0) {
        respond(422, ['error' => 'Login is already in use']);
    }
    
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO `Users` (`FirstName`, `LastName`, `Login`, `Password`, `Role`) VALUES (:fn, :ln, :login, :pw, 'Admin')");
    $stmt->execute([':fn' => $firstName, ':ln' => $lastName, ':login' => $login, ':pw' => $hashed]);
    
    respond(201, ['message' => 'Admin successfully created', 'error' => '']);
}

respond(405, ['error' => 'Method or Action not allowed']);
