locals {
  # If you're using a Windows Runner, change this script to the Windows script:
  # ubuntu-init.sh.tpl -> windows-init.ps1.tpl
  custom_data_script = templatefile("${path.module}/ubuntu-init.sh.tpl", {
    runner_version              = var.github_runner_version
    runner_labels               = join(",", var.github_runner_labels)
    runner_owner                = var.github_organization
    runner_username             = var.github_runner_username
    registration_key_vault_name = var.azure_registration_key_vault_name
    runner_group                = var.github_runner_group
  })
}
