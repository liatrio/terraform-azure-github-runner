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

module "app_config" {
  source = "./modules/app-config"

  name_suffix = local.name_suffix

  azure_app_config_owners = var.azure_app_config_owners

  azure_registration_key_vault_name = azurerm_key_vault.github_runner_registration_keyvault.name
  azure_resource_group_location     = data.azurerm_resource_group.resource_group.location
  azure_resource_group_name         = data.azurerm_resource_group.resource_group.name
  azure_subnet_id                   = var.azure_subnet_id
  azure_subscription_id             = var.azure_subscription_id
  azure_gallery_image_id            = var.azure_gallery_image_id

  github_app_id       = var.github_app_id
  github_client_id    = var.github_client_id
  github_organization = var.github_organization

  azure_runner_default_password_key_vault_id = var.azure_runner_default_password_key_vault_id
  github_client_secret_key_vault_id          = var.github_client_secret_key_vault_id
  github_private_key_key_vault_id            = var.github_private_key_key_vault_id
}

// TODO: store some inputs into app config (subscription, tenant, subnet, etc) for use by app service
// TODO: terraform module for templating custom-data script, put in app config
// TODO: app service with managed identity (MSI)
// TODO: app service MSI access to keyvault (read / write)
// TODO: app service MSI access to create, update, delete VMs (owner access on resource group?)
// TODO: app service MSI access to app config (read)
// TODO(?): storage account for caching actions runner tarball
// TODO(?): app service MSI access to storage account
// TODO: add tags to all resources that support it
