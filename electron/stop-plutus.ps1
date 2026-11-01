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

# Stopping can start more: Postgres, losing one of its processes, starts
# others to recover before it is stopped itself, and those then exit on
# their own a moment later. So this keeps stopping what's there until
# nothing is left, and reports something still running only once what's
# left has stayed for a few seconds without any of it being stoppable.
# -CheckOnly waits the same few seconds for anything on its way out. The
# whole run stays inside the minute electron/main.js allows it.
$idleRounds = 0
$deadline = (Get-Date).AddSeconds(40)
while ($true) {
  $targets = Get-PlutusProcesses
  if ($targets.Count -eq 0) { exit 0 }
  if ($idleRounds -ge 6 -or (Get-Date) -gt $deadline) { exit 2 }

  # The app first, so it doesn't report its backend or database stopping,
  # then the database server before the processes it started.
  $postgresIds = @($targets | Where-Object { $_.Name -eq 'postgres.exe' } | ForEach-Object { $_.ProcessId })
  $stopped = @()
  if (-not $CheckOnly) {
    $targets | Sort-Object {
      if ($_.Name -eq 'Plutus Technologies.exe') { 0 }
      elseif ($_.Name -eq 'postgres.exe' -and $postgresIds -notcontains $_.ParentProcessId) { 1 }
      else { 2 }
    } | ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force
      if ($?) { $stopped += $_.ProcessId }
    }
  }

  if ($stopped.Count -gt 0) {
    $idleRounds = 0
    # Only the ones it could stop: waiting for the rest would just use up
    # the timeout.
    Wait-Process -Id $stopped -Timeout 15
  } else {
    # Nothing left could be (or, with -CheckOnly, was) stopped: it needs
    # administrator rights, or is already on its way out.
    $idleRounds++
    Start-Sleep -Milliseconds 500
  }
}
