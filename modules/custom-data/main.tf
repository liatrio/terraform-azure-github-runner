locals {
  url_without_repository = "https://github.com/${var.github_organization}"
  url_with_repository    = "https://github.com/${var.github_organization}/${var.github_repository}"

  url = var.github_repository != "" ? local.url_with_repository : local.url_without_repository

  custom_data_script = templatefile("${path.module}/custom-data.sh.tpl", {
    runner_version              = var.github_runner_version
    runner_labels               = join(",", var.github_runner_labels)
    runner_owner                = var.github_organization
    runner_repository           = var.github_repository
    runner_username             = var.github_runner_username
    registration_key_vault_name = var.azure_registration_key_vault_name
    runner_group                = var.github_runner_group
  })
}
