$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$launcher = Join-Path $PSScriptRoot 'update-wsl-dev.ps1'
foreach ($entry in @(
  @{ Name = 'YoyOrder - Demarrer dev WSL.lnk'; Option = ' -SkipBuild' },
  @{ Name = 'YoyOrder - Mettre a jour dev WSL.lnk'; Option = '' }
)) {
  $shortcut = $shell.CreateShortcut((Join-Path $desktop $entry.Name))
  $shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $launcher + '"' + $entry.Option
  $shortcut.WorkingDirectory = $repoRoot
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
  $shortcut.Description = 'Environnement local YoyOrder dans Ubuntu WSL'
  $shortcut.Save()
  Write-Output (Join-Path $desktop $entry.Name)
}
