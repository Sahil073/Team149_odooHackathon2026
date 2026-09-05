# Helper script to launch PostgreSQL 18 with the required DLL environment
$pgPath = "C:\Program Files\PostgreSQL\18"
$env:PATH = "$pgPath\pgAdmin 4\runtime;$pgPath\bin;" + $env:PATH

Write-Host "Starting PostgreSQL 18 server on localhost:5432..." -ForegroundColor Green
& "$pgPath\bin\postgres.exe" -D "$pgPath\data"
