locals {
  name_suffix = var.name_suffix ? "-${trimprefix(var.name_suffix, "-")}" : ""
}

data "azurerm_resource_group" "resource_group" {
  name = var.resource_group_name
}

resource "azurerm_key_vault" "github_runner_keyvault" {
  name                = "kv-github-runner${local.name_suffix}"
  location            = data.azurerm_resource_group.resource_group.location
  resource_group_name = data.azurerm_resource_group.resource_group.name
  tenant_id           = var.tenant_id

  sku_name = "standard"

  soft_delete_retention_days = 7
}

// TODO: app config
// TODO: store some inputs into app config (subscription, tenant, subnet, etc) for use by app service
// TODO: terraform module for templating custom-data script, put in app config
// TODO: app service with managed identity (MSI)
// TODO: app service MSI access to keyvault (read / write)
// TODO: app service MSI access to create, update, delete VMs (owner access on resource group?)
// TODO: app service MSI access to app config (read)
// TODO(?): storage account for caching actions runner tarball
// TODO(?): app service MSI access to storage account
