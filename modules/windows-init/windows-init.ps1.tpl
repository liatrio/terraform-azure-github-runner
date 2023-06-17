param (
  [Parameter(Mandatory = $true, HelpMessage = 'e.g. 2.295.0')]
  [ValidateScript({
      if ($_ -match $RunnerVersionPattern)
      {
        $true
      }
      else
      {
        throw "$_ is an invalid format. It must be in the format of x.x.x."
      }
    })]
  [string]$RunnerVersion,

  [Parameter(Mandatory = $true, HelpMessage = 'e.g. "azure, vm"')]
  [string[]]$RunnerLabels,

  [Parameter(Mandatory = $true, HelpMessage = 'e.g. "liatrio-enterprise"')]
  [string]$RunnerOwner,

  [Parameter(Mandatory = $true, HelpMessage = 'e.g. "kv-gh-run-reg-liatriodev"')]
  [string]$RegistrationKeyVaultName,

  [Parameter(Mandatory = $false, HelpMessage = 'e.g. [sha256 sum for runner binary]')]
  [string]$RunnerSha,

  [Parameter(Mandatory = $false, HelpMessage = 'e.g. github.mydomain.com')]
  [string]$GHUrl,

  [Parameter(Mandatory = $false, HelpMessage = 'e.g. C:\user-data.log')]
  [string]$TranscriptLogPath = 'C:\user-data.log'
)

# Redirect output to log file
Start-Transcript -Path $TranscriptLogPath -Append

# Write-Debug "Input parameters:"
# Write-Debug "RunnerVersion: $RunnerVersion"
# Write-Debug "RunnerLabels: $RunnerLabels"
# Write-Debug "RunnerOwner: $RunnerOwner"
# Write-Debug "RegistrationKeyVaultName: $RegistrationKeyVaultName"
# Write-Debug "RunnerSha: $RunnerSha"
# Write-Debug "GHUrl: $GHUrl"

# I commented out the $USER_ID line because it doesn't seem to be required for Windows.
# $USER_ID = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value

# Retain variable setup for later dependent step(s).
$USER_NAME = $runner_username

$RunnerDestination = 'C:\actions-runner'

# Create a folder for the runner.
New-Item -ItemType Directory -Path $RunnerDestination
Set-Location $RunnerDestination

# Write-Debug "Created actions-runner folder."

# Download the latest runner package to the previously created folder.
$RunnerFileName = "actions-runner-win-x64-$RunnerVersion.zip"
$RunnerPackageURL = "https://github.com/actions/runner/releases/download/v$RunnerVersion/$RunnerFileName"

# Write-Debug "Downloading runner package from $RunnerPackageURL to $RunnerFileName"

Invoke-WebRequest -Uri $RunnerPackageURL -OutFile $(Join-Path -)

# Extract the installer.
Expand-Archive -Path $RunnerFileName -DestinationPath '.'

# Config runner for rootless docker
Set-Location 'C:\actions-runner'
# Add-Content -Path ".env" -Value "DOCKER_HOST=unix:///run/user/${USER_ID}/docker.sock"
Add-Content -Path '.env' -Value 'DOCKER_HOST=npipe:////./pipe/docker_engine'
Add-Content -Path '.env' -Value "PATH=C:\Users\${USER_NAME}\bin;${PATH}"

# Retrieve gh registration token from azure key vault
az login --identity --allow-no-subscription
$REGISTRATION_TOKEN = (az keyvault secret show -n $(hostname) --vault-name ${registration_key_vault_name} | ConvertFrom-Json).value

Set-Location 'C:\'
Set-Location 'actions-runner'

# Configure and run as the specified user
$cred = New-Object System.Management.Automation.PSCredential -ArgumentList $USER_NAME, (ConvertTo-SecureString 'Password' -AsPlainText -Force)
Start-Process 'powershell.exe' -Credential $cred -ArgumentList @"
   Set-Location C:\actions-runner
   .\config.cmd --unattended --ephemeral --replace --runnergroup ${runner_group} --labels ${runner_labels} --url https://github.com/${runner_owner} --token $${REGISTRATION_TOKEN}
   .\run.cmd
"@

# Stop transcript
Stop-Transcript
