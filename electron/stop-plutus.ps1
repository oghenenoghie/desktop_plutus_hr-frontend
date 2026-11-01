# Stops every process a Plutus Technologies desktop install runs: the app
# itself (its window and its local Next.js server are both
# "Plutus Technologies.exe"), the bundled backend, and the embedded Postgres
# server with its helper programs. Each is matched by where its executable
# lives, so another PostgreSQL installed on the same machine is left alone.
#
# The installer and uninstaller run this before they replace or remove the
# installed files (electron/installer.nsh), passing -InstallDir so anything
# else running from the install folder is stopped too. The app runs it at
# startup when processes left over from a previous run still hold its ports
# (electron/main.js), passing its own process ID so neither it nor its own
# helper processes are stopped.
#
# Exit codes: 0 when nothing is left running, 2 when something still is.
# Without administrator rights Windows won't let this stop a Plutus that was
# started with "Run as administrator"; the installer then runs it again with
# them. -CheckOnly reports, with the same exit codes, without stopping
# anything.
param(
  [int]$ExcludeProcessId = 0,
  [string]$InstallDir = '',
  [switch]$CheckOnly
)

$ErrorActionPreference = 'SilentlyContinue'

$session = (Get-Process -Id $PID).SessionId
$installPrefix = if ($InstallDir) { $InstallDir.TrimEnd('\') + '\' } else { '' }

function Get-PlutusProcesses {
  @(Get-CimInstance Win32_Process | Where-Object {
    $path = $_.ExecutablePath
    $_.ProcessId -ne $ExcludeProcessId -and
    ($ExcludeProcessId -eq 0 -or $_.ParentProcessId -ne $ExcludeProcessId) -and (
      # Anything running from the install folder keeps its files open.
      ($installPrefix -and $path -and $path.StartsWith($installPrefix, [StringComparison]::OrdinalIgnoreCase)) -or
      ($_.SessionId -eq $session -and (
        ($path -and (
          $path -like '*\Plutus Technologies.exe' -or
          $path -like '*\resources\backend\plutus-backend.exe' -or
          ($path -like '*\@embedded-postgres\*' -and @('postgres.exe', 'pg_ctl.exe', 'initdb.exe') -contains $_.Name)
        )) -or
        # Windows can hide where a process started with administrator rights
        # was run from; these two names are Plutus's own.
        (-not $path -and @('Plutus Technologies.exe', 'plutus-backend.exe') -contains $_.Name)
      ))
    )
  })
}

$targets = Get-PlutusProcesses
if ($targets.Count -eq 0) { exit 0 }
if ($CheckOnly) { exit 2 }

# The app first, so it doesn't report its backend or database stopping.
$stopped = @()
$targets | Sort-Object { $_.Name -ne 'Plutus Technologies.exe' } | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force
  if ($?) { $stopped += $_.ProcessId }
}
# Only the ones it could stop: waiting for the rest would just use up the
# timeout.
if ($stopped.Count -gt 0) { Wait-Process -Id $stopped -Timeout 15 }

if ((Get-PlutusProcesses).Count -gt 0) { exit 2 }
exit 0
