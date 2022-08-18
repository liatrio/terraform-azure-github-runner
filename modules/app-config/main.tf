locals {
  app_config_keys = {
    "azure-location"                   = var.azure_resource_group_location
    "azure-resource-group-name"        = var.azure_resource_group_name
    "azure-subnet-id"                  = var.azure_subnet_id
    "azure-subscription-id"            = var.azure_subscription_id
    "azure-registration-key-vault-url" = var.azure_registration_key_vault_url
    "azure-gallery-image-id"           = var.azure_gallery_image_id
    "azure-vm-size"                    = var.azure_vm_size
    "github-app-id"                    = var.github_app_id
    "github-client-id"                 = var.github_client_id
    "github-organization"              = var.github_organization
    "github-installation-id"           = var.github_installation_id
    "github-runner-identity"           = var.github_runner_identity
  }
  app_config_secrets = {
    "azure-runner-default-password" = var.azure_runner_default_password_key_vault_id
    "github-client-secret"          = var.github_client_secret_key_vault_id
    "github-private-key"            = var.github_private_key_key_vault_id
    "github-webhook-secret"         = var.github_webhook_secret_key_vault_id
  }
}

data "azurerm_client_config" "current" {}

resource "azurerm_app_configuration" "github_runner_app_config" {
  name                = "appcs-gh-run-controller${var.name_suffix}"
  location            = var.azure_resource_group_location
  resource_group_name = var.azure_resource_group_name

  sku = "free"
}

resource "azurerm_role_assignment" "current_user_principal_app_config_data_owner" {
  for_each = toset(concat(var.azure_app_config_owners, [data.azurerm_client_config.current.object_id]))

  scope                = azurerm_app_configuration.github_runner_app_config.id
  role_definition_name = "App Configuration Data Owner"
  principal_id         = each.value

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_app_configuration_key" "config_keys" {
  for_each = local.app_config_keys

  configuration_store_id = azurerm_app_configuration.github_runner_app_config.id
  content_type           = "text/plain"
  type                   = "kv"

  key   = each.key
  value = each.value

  depends_on = [
    azurerm_role_assignment.current_user_principal_app_config_data_owner
  ]
}

resource "azurerm_app_configuration_key" "config_secrets" {
  for_each = local.app_config_secrets

  configuration_store_id = azurerm_app_configuration.github_runner_app_config.id
  type                   = "vault"

  key                 = each.key
  vault_key_reference = each.value

  depends_on = [
    azurerm_role_assignment.current_user_principal_app_config_data_owner
  ]
}

module "custom_data" {
  source = "../custom-data"

  github_organization               = var.github_organization
  github_runner_version             = var.github_runner_version
  github_runner_labels              = var.github_runner_labels
  azure_registration_key_vault_name = var.azure_registration_key_vault_name
  github_runner_username            = var.github_runner_username
}

resource "azurerm_app_configuration_key" "config_custom_data_script" {
  configuration_store_id = azurerm_app_configuration.github_runner_app_config.id
  content_type           = "text/plain"
  type                   = "kv"

  key   = "custom-data-script-base64-encoded"
  value = module.custom_data.base64_encoded_script

  depends_on = [
    azurerm_role_assignment.current_user_principal_app_config_data_owner
  ]
}

output "custom_data_script" {
  value = module.custom_data.raw_script
}
