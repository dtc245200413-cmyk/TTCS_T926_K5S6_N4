param(
 [ValidateSet('internal_recruitment_test','internal_recruitment_scrum103_trial')]
 [string]$Target = 'internal_recruitment_scrum103_trial'
)
$ErrorActionPreference='Stop'
$source=Join-Path $PSScriptRoot 'sql'
$dest=Join-Path $env:USERPROFILE "Downloads\SCRUM103_SQL_FOR_$Target"
New-Item -Path $dest -ItemType Directory -Force | Out-Null
foreach ($file in Get-ChildItem $source -Filter '*.sql' -File) {
 $body=[System.IO.File]::ReadAllText($file.FullName)
 if ($Target -ne 'internal_recruitment_test') { $body=$body.Replace('internal_recruitment_test.', "${Target}.") }
 $head="-- REVIEWED SCHEMA TARGET: $Target`r`n-- MYSQL DDL IS NOT TRANSACTIONALLY REVERSIBLE. Backup and restore-test first.`r`n"
 [System.IO.File]::WriteAllText((Join-Path $dest $file.Name),$head+$body,(New-Object System.Text.UTF8Encoding($false)))
}
Write-Host "Generated REVIEW-ONLY SQL in $dest" -ForegroundColor Cyan
Write-Host 'No SQL was executed; no database changes were made.' -ForegroundColor Green
