# ==============================================================
#  Extracción READ-ONLY de la base de producción vía la API.
#
#  Baja todas las colecciones que la API expone y las guarda como JSON en
#  server/db-backups/prod-<timestamp>/ (carpeta gitignoreada).
#
#  USO (recomendado) — en una terminal PowerShell de verdad:
#      pwsh -File server/scripts/extraer-produccion.ps1
#    Pide la contrasena por prompt oculto. No queda en ningun lado.
#
#  USO (sin consola interactiva, p.ej. desde un agente):
#      $env:PROD_ADMIN_PASSWORD = '...'   # en TU terminal, no en el script
#      pwsh -File server/scripts/extraer-produccion.ps1
#
#  La contrasena NUNCA se guarda en el script ni en un archivo.
#
#  Este script solo hace GET (y el POST del login). No modifica produccion.
# ==============================================================

param(
  [string]$UserName = $env:PROD_ADMIN_USER
)

$ErrorActionPreference = 'Stop'

$BaseUrl = 'https://alonzostyle.com'

# ── Credenciales ──────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($UserName)) {
  if (-not [Console]::IsInputRedirected) {
    $UserName = Read-Host "Usuario admin de produccion (enter = 'admin')"
  }
  if ([string]::IsNullOrWhiteSpace($UserName)) { $UserName = 'admin' }
}

if ($env:PROD_ADMIN_PASSWORD) {
  $plainPass = $env:PROD_ADMIN_PASSWORD
}
elseif (-not [Console]::IsInputRedirected) {
  # Hay consola real: prompt oculto.
  $securePass = Read-Host "Contrasena de '$UserName'" -AsSecureString
  $plainPass = [System.Net.NetworkCredential]::new("", $securePass).Password
}
else {
  # Sin consola no se puede pedir nada: Read-Host se colgaria para siempre.
  Write-Host "ERROR: no hay consola interactiva para pedir la contrasena." -ForegroundColor Red
  Write-Host ""
  Write-Host "Opciones:" -ForegroundColor Yellow
  Write-Host "  1) Corre este script en una terminal PowerShell normal, o"
  Write-Host "  2) Segui asi, pero antes seteá la variable en TU terminal:"
  Write-Host "       `$env:PROD_ADMIN_PASSWORD = '...'"
  exit 2
}

$userName = $UserName

Write-Host ""
Write-Host "Conectando a $BaseUrl ..."

$loginBody = @{ userName = $userName; password = $plainPass } | ConvertTo-Json -Compress

try {
  $null = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post `
    -Body $loginBody -ContentType 'application/json' `
    -SessionVariable sesion -TimeoutSec 30
  Write-Host "Login OK como '$userName'." -ForegroundColor Green
}
catch {
  Write-Host "Login FALLIDO: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
finally {
  # Borrar la contraseña de memoria apenas deja de hacer falta.
  $plainPass = $null
  $loginBody = $null
  [System.GC]::Collect()
}

# ── Destino ───────────────────────────────────────────────────
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH-mm-ssZ')
$destino = Join-Path $PSScriptRoot "..\db-backups\prod-$timestamp"
$null = New-Item -ItemType Directory -Force -Path $destino
$destino = (Resolve-Path $destino).Path

Write-Host ""
Write-Host "Guardando en: $destino"
Write-Host ""

# ── Colecciones ───────────────────────────────────────────────
# `campo` desenvuelve respuestas del tipo { horarios: [...] } / { banners: [...] }
$recursos = @(
  @{ archivo = 'agendas';      ruta = '/api/agenda';               campo = $null },
  @{ archivo = 'users';        ruta = '/api/user/';                campo = $null },
  @{ archivo = 'barberos';     ruta = '/api/barberos';             campo = $null },
  @{ archivo = 'servicios';    ruta = '/api/servicios/admin/all';  campo = $null },
  @{ archivo = 'horarios';     ruta = '/api/horarios';             campo = 'horarios' },
  @{ archivo = 'banners';      ruta = '/api/banners';              campo = 'banners' },
  @{ archivo = 'contactos';    ruta = '/api/contacto';             campo = $null },
  @{ archivo = 'ubicacions';   ruta = '/api/ubicacion';            campo = $null }
)

$resumen = [System.Collections.Generic.List[string]]::new()

foreach ($r in $recursos) {
  try {
    $datos = Invoke-RestMethod -Uri "$BaseUrl$($r.ruta)" -WebSession $sesion -TimeoutSec 120

    if ($r.campo -and $null -ne $datos.($r.campo)) { $datos = $datos.($r.campo) }
    if ($null -eq $datos) { $datos = @() }

    # Forzar array aunque venga un solo documento (contacto, ubicacion).
    $arr = @($datos)

    $json = $arr | ConvertTo-Json -Depth 20
    # ConvertTo-Json de un array de 1 elemento puede no envolverlo en [].
    if ($arr.Count -le 1 -and -not $json.TrimStart().StartsWith('[')) {
      $json = "[`n$json`n]"
    }

    $ruta = Join-Path $destino "$($r.archivo).json"
    [System.IO.File]::WriteAllText($ruta, $json, [System.Text.UTF8Encoding]::new($false))

    $linea = "$($r.archivo): $($arr.Count) documentos"
    Write-Host "  OK  $linea" -ForegroundColor Green
    $resumen.Add($linea)
  }
  catch {
    $linea = "$($r.archivo): ERROR - $($_.Exception.Message)"
    Write-Host "  ERR $linea" -ForegroundColor Red
    $resumen.Add($linea)
  }
}

# ── Resumen ───────────────────────────────────────────────────
$resumenTexto = @(
  "Extraccion desde $BaseUrl",
  "Fecha (UTC): $timestamp",
  "Usuario: $userName",
  "",
  "NOTA: la API no expone los hashes de contrasena (user.controller los excluye)",
  "ni las suscripciones push. Esto sirve como copia de trabajo, no reemplaza a",
  "un mongodump como backup completo.",
  ""
) + $resumen

$resumenTexto -join "`n" | Set-Content -Path (Join-Path $destino '_summary.txt') -Encoding utf8

Write-Host ""
Write-Host "Listo. Resumen en $destino\_summary.txt" -ForegroundColor Cyan
