locals {
  name_suffix = var.name_suffix == "" ? "" : "-${trimprefix(var.name_suffix, "-")}"
}

data "azurerm_resource_group" "resource_group" {
  name = var.azure_resource_group_name
}

resource "azurerm_key_vault" "github_runner_registration_keyvault" {
  name                = "kv-gh-run-reg${local.name_suffix}"
  location            = data.azurerm_resource_group.resource_group.location
  resource_group_name = data.azurerm_resource_group.resource_group.name
  tenant_id           = var.azure_tenant_id

  sku_name = "standard"

  soft_delete_retention_days = 7
}

resource "azurerm_key_vault_access_policy" "app_secrets_key_vault_access_policy" {
  for_each = toset(var.owners)

  key_vault_id = azurerm_key_vault.github_runner_registration_keyvault.id
  tenant_id    = var.azure_tenant_id
  object_id    = each.value

  secret_permissions = [
    "Delete",
    "Get",
    "List",
    "Set"
  ]
}

resource "azurerm_user_assigned_identity" "github_runner_shared_identity" {
  location            = data.azurerm_resource_group.resource_group.location
  resource_group_name = data.azurerm_resource_group.resource_group.name

  name = "msi-github-runner-shared-identity${local.name_suffix}"
}

resource "azurerm_key_vault_access_policy" "github_runner_identity_key_vault_access_policy" {
  key_vault_id = azurerm_key_vault.github_runner_registration_keyvault.id
  tenant_id    = var.azure_tenant_id
  object_id    = azurerm_user_assigned_identity.github_runner_shared_identity.principal_id

  secret_permissions = [
    "Get",
  ]
}

module "app_config" {
  source = "./modules/app-config"

  name_suffix = local.name_suffix

  azure_app_config_owners = var.owners

  azure_registration_key_vault_name = azurerm_key_vault.github_runner_registration_keyvault.name
  azure_registration_key_vault_url  = azurerm_key_vault.github_runner_registration_keyvault.vault_uri
  azure_resource_group_location     = data.azurerm_resource_group.resource_group.location
  azure_resource_group_name         = data.azurerm_resource_group.resource_group.name
  azure_subnet_id                   = var.azure_subnet_id
  azure_subscription_id             = var.azure_subscription_id
  azure_gallery_image_id            = var.azure_gallery_image_id
  azure_vm_size                     = var.azure_vm_size

  github_app_id                  = var.github_app_id
  github_client_id               = var.github_client_id
  github_organization            = var.github_organization
  github_installation_id         = var.github_installation_id
  github_runner_labels           = var.github_runner_labels
  github_runner_identifier_label = var.github_runner_identifier_label
  github_runner_version          = var.github_runner_version
  github_runner_username         = var.github_runner_username
  github_runner_identity         = azurerm_user_assigned_identity.github_runner_shared_identity.id

  azure_runner_default_password_key_vault_id = var.azure_runner_default_password_key_vault_id
  github_client_secret_key_vault_id          = var.github_client_secret_key_vault_id
  github_webhook_secret_key_vault_id         = var.github_webhook_secret_key_vault_id
  github_private_key_key_vault_id            = var.github_private_key_key_vault_id
}

// TODO: app service with managed identity (MSI)
// TODO: app service MSI access to keyvault (read / write)
// TODO: app service MSI access to create, update, delete VMs (owner access on resource group?)
// TODO: app service MSI access to app config (read)
// TODO(?): storage account for caching actions runner tarball
// TODO(?): app service MSI access to storage account
// TODO: add tags to all resources that support it
