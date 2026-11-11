# Sets the scanner's backup vision model (Google Gemini) as Supabase secrets.
# Run:  powershell -ExecutionPolicy Bypass -File scripts/set-vision-backup.ps1
# The key is typed at a hidden prompt and goes straight to the Supabase CLI: it is never written to a file or the app.

$ref = 'vaweeztulqvkciuqytyi'
$url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
$model = 'gemini-3.5-flash-lite'

$secure = Read-Host 'Paste your NEW Google AI Studio API key (hidden)' -AsSecureString
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if (-not $key -or $key.Length -lt 20) { Write-Host 'That does not look like a key. Nothing was changed.'; exit 1 }

npx supabase secrets set "VISION_BACKUP_URL=$url" "VISION_BACKUP_KEY=$key" "VISION_BACKUP_MODEL=$model" --project-ref $ref
if ($LASTEXITCODE -ne 0) { Write-Host 'The CLI failed. If it asked you to log in, run: npx supabase login'; exit $LASTEXITCODE }
$key = $null
Write-Host 'Done. The scanner backup is set to' $model
