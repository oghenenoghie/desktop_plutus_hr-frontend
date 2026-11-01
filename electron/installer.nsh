; Included into the Windows installer and uninstaller by electron-builder
; (nsis.include in electron-builder.yml).
;
; Plutus runs more than its window: a local Next.js server, the bundled
; backend and an embedded Postgres server, all from files in the install
; folder. electron-builder's own "is the app running?" check closes only
; what it can stop with the installer's own rights, and the installer runs
; without administrator rights. A Plutus started with "Run as
; administrator" (or anything it started) can't be stopped that way, so
; the check gave up with "Plutus Technologies cannot be closed". And before
; electron/stop-plutus.ps1 existed, the backend and Postgres kept their
; files open, removing the old version during an update failed, and the
; update ended with nothing installed.
;
; So this replaces that check (customCheckAppRunning) with one that:
;  1. stops every Plutus process with the installer's own rights;
;  2. if any are still running, explains why and asks Windows for
;     administrator permission (the UAC prompt) to stop them;
;  3. if they still can't be stopped, says what to do and lets the user
;     retry or cancel.
; A silent install (/S) never prompts: it exits with code 2 instead.
; electron-builder's own check still runs afterwards. Once the script has
; run there's nothing left for it to find, but it still closes Plutus on a
; machine where PowerShell can't run.

!include LogicLib.nsh
; electron-builder includes these itself only when there's no
; customCheckAppRunning; its own check, run at the end, needs them.
!include "getProcessInfo.nsh"
Var pid

!ifdef BUILD_UNINSTALLER
  !define PLUTUS_STEP "the uninstaller"
  !define PLUTUS_AGAIN "uninstall it again"
!else
  !define PLUTUS_STEP "Setup"
  !define PLUTUS_AGAIN "run Setup again"
!endif

; Runs electron/stop-plutus.ps1 with the installer's own rights and leaves
; its exit code in $0: 0 when nothing is left running, 2 when something
; still is, anything else when PowerShell couldn't run it.
!macro plutusStopScript _ARGS
  nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\stop-plutus.ps1" -InstallDir "$INSTDIR" ${_ARGS}'
  Pop $0
!macroend

!macro customCheckAppRunning
  InitPluginsDir
  File "/oname=$PLUGINSDIR\stop-plutus.ps1" "${PROJECT_DIR}\electron\stop-plutus.ps1"

  !insertmacro plutusStopScript ""
  ${If} $0 == 2
    ${If} ${Silent}
      SetErrorLevel 2
      Quit
    ${EndIf}
    ${IfNot} ${Cmd} `MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "${PRODUCT_NAME} is still running and needs administrator permission to close. This usually means it was started with $\"Run as administrator$\".$\r$\n$\r$\nClick OK, then choose Yes when Windows asks for permission, to close it and continue." /SD IDCANCEL IDOK`
      SetErrorLevel 2
      Quit
    ${EndIf}
    ${Do}
      ; Windows shows its permission prompt for this. Errors are set when
      ; the user says No (or can't give permission).
      ClearErrors
      ExecShellWait "runas" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$PLUGINSDIR\stop-plutus.ps1" -InstallDir "$INSTDIR"' SW_HIDE
      ${If} ${Errors}
        StrCpy $1 "${PRODUCT_NAME} is still running, so ${PLUTUS_STEP} can't continue.$\r$\n$\r$\nClick Retry and choose Yes when Windows asks for permission. If you can't give administrator permission, restart Windows and ${PLUTUS_AGAIN} before opening ${PRODUCT_NAME}."
      ${Else}
        StrCpy $1 "${PRODUCT_NAME} couldn't be closed, even with administrator permission.$\r$\n$\r$\nRestart Windows, then ${PLUTUS_AGAIN} before opening ${PRODUCT_NAME}. Or click Retry to try again now."
      ${EndIf}
      !insertmacro plutusStopScript "-CheckOnly"
      ${If} $0 != 2
        ${ExitDo}
      ${EndIf}
      ${IfNot} ${Cmd} `MessageBox MB_RETRYCANCEL|MB_ICONSTOP "$1" /SD IDCANCEL IDRETRY`
        SetErrorLevel 2
        Quit
      ${EndIf}
    ${Loop}
  ${EndIf}

  !insertmacro IS_POWERSHELL_AVAILABLE
  !insertmacro _CHECK_APP_RUNNING
!macroend
