locals {
  custom_data_script = templatefile(var.runner_os == "linux" ? "${path.module}/custom-data.sh.tpl" : "${path.module}/custom-data.ps1.tpl", {
    runner_version              = var.github_runner_version
    runner_labels               = join(",", var.github_runner_labels)
    runner_owner                = var.github_organization
    runner_username             = var.github_runner_username
    registration_key_vault_name = var.azure_registration_key_vault_name
  })
}
