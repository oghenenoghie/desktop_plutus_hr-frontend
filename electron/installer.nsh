; Included into the Windows installer and uninstaller by electron-builder
; (nsis.include in electron-builder.yml).
;
; Plutus runs more than its window: a local Next.js server, the bundled
; backend and an embedded Postgres server, all from files in the install
; folder. electron-builder's own "is the app running?" check closes only
; the "Plutus Technologies.exe" processes, so the backend and Postgres kept
; their files open, removing the old version during an update failed, and
; the update ended with nothing installed. Stopping all of them first, as
; the installer or uninstaller starts, lets it go ahead.

!macro stopPlutusProcesses
  InitPluginsDir
  File "/oname=$PLUGINSDIR\stop-plutus.ps1" "${PROJECT_DIR}\electron\stop-plutus.ps1"
  nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\stop-plutus.ps1"'
  Pop $0
!macroend

!macro customInit
  !insertmacro stopPlutusProcesses
!macroend

!macro customUnInit
  !insertmacro stopPlutusProcesses
!macroend
