# Stops every process a Plutus Technologies desktop install runs: the app
# itself (its window and its local Next.js server are both
# "Plutus Technologies.exe"), the bundled backend, and the embedded Postgres
# server with its helper programs. Each is matched by where its executable
# lives, so another PostgreSQL installed on the same machine is left alone.
#
# The installer runs this before it replaces an installed version
# (electron/installer.nsh). The app runs it at startup when processes left
# over from a previous run still hold its ports (electron/main.js), passing
# its own process ID so neither it nor its own helper processes are stopped.
param([int]$ExcludeProcessId = 0)

$ErrorActionPreference = 'SilentlyContinue'

$session = (Get-Process -Id $PID).SessionId
$targets = @(Get-CimInstance Win32_Process | Where-Object {
  $path = $_.ExecutablePath
  $path -and
  $_.SessionId -eq $session -and
  $_.ProcessId -ne $ExcludeProcessId -and
  ($ExcludeProcessId -eq 0 -or $_.ParentProcessId -ne $ExcludeProcessId) -and (
    $path -like '*\Plutus Technologies.exe' -or
    $path -like '*\resources\backend\plutus-backend.exe' -or
    ($path -like '*\@embedded-postgres\*' -and @('postgres.exe', 'pg_ctl.exe', 'initdb.exe') -contains $_.Name)
  )
})
if ($targets.Count -eq 0) { exit 0 }

# The app first, so it doesn't report its backend or database stopping.
$targets | Sort-Object { $_.Name -ne 'Plutus Technologies.exe' } | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force
}
Wait-Process -Id $targets.ProcessId -Timeout 15
exit 0
