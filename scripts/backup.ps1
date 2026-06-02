param(
    [string]$BackupDir = "C:\backups\bookermap",
    [string]$DbName = "booking",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$Port = 5432,
    [int]$RetentionDays = 7,
    [string]$LogFile = "$BackupDir\backup.log"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\db_$Timestamp.sql"
$CompressedFile = "$BackupDir\db_$Timestamp.sql.gz"

# Ensure backup directory exists
if (-not (Test-Path -LiteralPath $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Log "Created backup directory: $BackupDir"
}

Function Log {
    param([string]$Message)
    $LogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $LogEntry
    Add-Content -LiteralPath $LogFile -Value $LogEntry
}

Log "Starting database backup: $DbName@$DbHost:$Port"

# Dump database
$env:PGPASSWORD = $env:PGPASSWORD
$pgDumpArgs = @(
    "-h", $DbHost,
    "-p", $Port,
    "-U", $DbUser,
    "-d", $DbName,
    "--no-password",
    "-f", $BackupFile
)

try {
    $process = Start-Process -FilePath "pg_dump" -ArgumentList $pgDumpArgs -Wait -NoNewWindow -PassThru
    if ($process.ExitCode -ne 0) {
        throw "pg_dump exited with code $($process.ExitCode)"
    }
    Log "Database dump completed: $BackupFile"
} catch {
    Log "ERROR: Database dump failed: $_"
    exit 1
}

# Compress
try {
    $inputBytes = [System.IO.File]::ReadAllBytes($BackupFile)
    $outputStream = [System.IO.Compression.GZipStream]::new(
        [System.IO.File]::Open($CompressedFile, [System.IO.FileMode]::Create),
        [System.IO.Compression.CompressionMode]::Compress
    )
    $outputStream.Write($inputBytes, 0, $inputBytes.Length)
    $outputStream.Close()
    Remove-Item -LiteralPath $BackupFile
    Log "Compressed backup: $CompressedFile"
} catch {
    Log "ERROR: Compression failed: $_"
    exit 1
}

# Get file size
$fileInfo = Get-Item -LiteralPath $CompressedFile
$sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
Log "Backup size: $sizeInMB MB"

# Clean old backups
$cutoff = (Get-Date).AddDays(-$RetentionDays)
$oldFiles = Get-ChildItem -LiteralPath $BackupDir -Filter "db_*.sql.gz" | Where-Object { $_.CreationTime -lt $cutoff }
foreach ($oldFile in $oldFiles) {
    Remove-Item -LiteralPath $oldFile.FullName
    Log "Removed old backup: $($oldFile.Name)"
}

# Optional: Upload to remote storage
if ($env:BACKUP_S3_BUCKET) {
    Log "Uploading to S3 bucket: $env:BACKUP_S3_BUCKET"
    try {
        aws s3 cp $CompressedFile "s3://$env:BACKUP_S3_BUCKET/db_$Timestamp.sql.gz" --no-progress
        Log "Upload completed"
    } catch {
        Log "ERROR: S3 upload failed: $_"
    }
}

if ($env:BACKUP_RCLONE_REMOTE) {
    Log "Uploading via rclone to: $env:BACKUP_RCLONE_REMOTE"
    try {
        rclone copy $CompressedFile $env:BACKUP_RCLONE_REMOTE
        Log "rclone upload completed"
    } catch {
        Log "ERROR: rclone upload failed: $_"
    }
}

Log "Backup completed successfully"
