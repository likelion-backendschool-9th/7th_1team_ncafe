param([string]$BaseUrl = 'http://127.0.0.1:8080')

$ErrorActionPreference = 'Stop'
$memberSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginId = 'check_' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$password = 'password123'
$newPassword = 'changed12345'

function Invoke-MemberApi {
    param([string]$Method, [string]$Path, $Body)
    $requestOptions = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        WebSession = $memberSession
        UseBasicParsing = $true
    }
    if ($Method -ne 'GET') {
        $csrf = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/csrf" -WebSession $memberSession
        $requestOptions.Headers = @{ $csrf.headerName = $csrf.token }
    }
    if ($null -ne $Body) {
        $requestOptions.ContentType = 'application/json; charset=utf-8'
        $requestOptions.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json))
    }
    $response = Invoke-WebRequest @requestOptions
    if ($response.Content) { return $response.Content | ConvertFrom-Json }
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Message)
    if ($Actual -ne $Expected) { throw "Verification failed: $Message" }
}

function Assert-Unauthorized {
    param([string]$Path)
    try {
        $null = Invoke-MemberApi GET $Path
    } catch {
        if ($null -ne $_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) {
            return
        }
        throw
    }
    throw "Expected HTTP 401: $Path"
}

# Each run creates its own account; it never modifies an existing account.
$member = Invoke-MemberApi POST '/api/v1/auth/signup' @{
    loginId = $loginId; password = $password; nickname = 'API Check'; email = 'check@example.com'
}
Assert-Equal $member.role 'USER' 'new member role'
Assert-Equal $member.couponCount 0 'initial coupons'
Write-Output 'PASS: signup'

$null = Invoke-MemberApi POST '/api/v1/auth/login' @{ loginId = $loginId; password = $password }
$member = Invoke-MemberApi GET '/api/v1/auth/me'
Assert-Equal $member.loginId $loginId 'authenticated member'
Write-Output 'PASS: login and member lookup'

$memberPath = '/api/v1/me/' + $member.no
$updated = Invoke-MemberApi PATCH $memberPath @{ nickname = 'Updated Check'; address1 = 'Seoul' }
Assert-Equal $updated.nickname 'Updated Check' 'profile update'
$stored = Invoke-MemberApi GET $memberPath
Assert-Equal $stored.address1 'Seoul' 'persisted address'
Write-Output 'PASS: profile update and DB lookup'

$null = Invoke-MemberApi PATCH "$memberPath/password" @{
    currentPassword = $password; newPassword = $newPassword
}
Assert-Unauthorized '/api/v1/auth/me'
Write-Output 'PASS: password change and session logout'

$null = Invoke-MemberApi POST '/api/v1/auth/login' @{ loginId = $loginId; password = $newPassword }
$null = Invoke-MemberApi POST '/api/v1/auth/logout'
Assert-Unauthorized '/api/v1/auth/me'
Write-Output 'PASS: new password login and explicit logout'

$null = Invoke-MemberApi POST '/api/v1/auth/login' @{ loginId = $loginId; password = $newPassword }
$null = Invoke-MemberApi DELETE $memberPath @{ password = $newPassword }
Assert-Unauthorized '/api/v1/auth/me'
Write-Output 'PASS: withdrawal and session logout'
Write-Output "Member lifecycle verification completed: $loginId (withdrawn)"
