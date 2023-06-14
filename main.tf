locals {
  name_suffix = var.name_suffix == "" ? "" : "-${trimprefix(var.name_suffix, "-")}"
}

data "azurerm_resource_group" "resource_group" {
  name = var.azure_resource_group_name
}

locals {
  location = var.location == "" ? data.azurerm_resource_group.resource_group.location : var.location
}

#tfsec:ignore:azure-keyvault-specify-network-acl
#tfsec:ignore:azure-keyvault-no-purge
resource "azurerm_key_vault" "github_runner_registration_keyvault" {
  name                = "kv-gh-run-reg${local.name_suffix}"
  location            = local.location
  resource_group_name = data.azurerm_resource_group.resource_group.name
  tenant_id           = var.azure_tenant_id

  sku_name = "standard"

  soft_delete_retention_days = 7
  tags                       = var.tags
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
  location            = local.location
  resource_group_name = data.azurerm_resource_group.resource_group.name

  name = "msi-github-runner-shared-identity${local.name_suffix}"
  tags = var.tags
}

resource "azurerm_key_vault_access_policy" "github_runner_identity_key_vault_access_policy" {
  key_vault_id = azurerm_key_vault.github_runner_registration_keyvault.id
  tenant_id    = var.azure_tenant_id
  object_id    = azurerm_user_assigned_identity.github_runner_shared_identity.principal_id

  secret_permissions = [
    "Get",
  ]
}

module "service_bus" {
  source = "./modules/service-bus"

  service_bus_owners = var.owners

  github_runner_identifier_label = var.github_runner_identifier_label
  name_suffix                    = local.name_suffix
  azure_resource_group_location  = local.location
  azure_resource_group_name      = data.azurerm_resource_group.resource_group.name
  tags                           = var.tags
}

module "app_config" {
  source = "./modules/app-config"

  name_suffix = local.name_suffix

  azure_app_config_owners = var.owners

  azure_registration_key_vault_name = azurerm_key_vault.github_runner_registration_keyvault.name
  azure_registration_key_vault_url  = azurerm_key_vault.github_runner_registration_keyvault.vault_uri
  azure_resource_group_location     = local.location
  azure_resource_group_name         = data.azurerm_resource_group.resource_group.name
  azure_subnet_id                   = var.azure_subnet_id
  azure_subscription_id             = var.azure_subscription_id
  azure_gallery_image_id            = var.azure_gallery_image_id
  azure_vm_size                     = var.azure_vm_size
  azure_service_bus_namespace_uri   = module.service_bus.service_bus_namespace_uri
  azure_github_webhook_events_queue = module.service_bus.github_webhook_events_queue
  azure_github_runners_queue        = module.service_bus.github_runners_queue
  azure_github_state_queue          = module.service_bus.github_state_queue

  github_app_id                  = var.github_app_id
  github_client_id               = var.github_client_id
  github_organization            = var.github_organization
  github_installation_id         = var.github_installation_id
  github_runner_labels           = var.github_runner_labels
  github_runner_identifier_label = var.github_runner_identifier_label
  github_runner_version          = var.github_runner_version
  github_runner_username         = var.github_runner_username
  github_runner_identity         = azurerm_user_assigned_identity.github_runner_shared_identity.id
  github_runner_warm_pool_size   = var.github_runner_warm_pool_size
  github_runner_maximum_count    = var.github_runner_maximum_count
  github_runner_group            = var.github_runner_group

  azure_runner_default_password_key_vault_id = var.azure_runner_default_password_key_vault_id
  github_client_secret_key_vault_id          = var.github_client_secret_key_vault_id
  github_webhook_secret_key_vault_id         = var.github_webhook_secret_key_vault_id
  github_private_key_key_vault_id            = var.github_private_key_key_vault_id
  azure_gallery_image_type                   = var.azure_gallery_image_type
  tags                                       = var.tags
}

module "github_webhook_event_handler_function_app" {
  source = "./modules/function-app"

  name_suffix = local.name_suffix

  github_webhook_events_queue_id      = module.service_bus.github_webhook_events_queue_id
  app_configuration_endpoint          = module.app_config.app_configuration_endpoint
  azure_app_configuration_object_id   = module.app_config.azure_app_configuration_object_id
  azure_resource_group_name           = data.azurerm_resource_group.resource_group.name
  azure_resource_group_location       = local.location
  docker_registry_url                 = var.docker_registry_url
  event_handler_image_name            = var.event_handler_image_name
  event_handler_image_tag             = var.event_handler_image_tag
  azure_tenant_id                     = var.azure_tenant_id
  azure_secrets_key_vault_resource_id = var.azure_secrets_key_vault_resource_id
  tags                                = var.tags


  depends_on = [
    module.service_bus
  ]
}

module "github_runner_controller_web_app" {
  source = "./modules/web-app"

  name_suffix = local.name_suffix

  azure_resource_group_name    = data.azurerm_resource_group.resource_group.name
  azure_resource_group_id      = data.azurerm_resource_group.resource_group.id
  location                     = local.location
  web_app_os_type              = var.web_app_os_type
  web_app_sku_name             = var.web_app_sku_name
  docker_registry_url          = var.docker_registry_url
  runner_controller_image_name = var.runner_controller_image_name
  runner_controller_image_tag  = var.runner_controller_image_tag
  log_level                    = var.log_level

  azure_app_configuration_object_id        = module.app_config.azure_app_configuration_object_id
  azure_app_configuration_endpoint         = module.app_config.app_configuration_endpoint
  github_runners_service_bus_id            = module.service_bus.service_bus_namespace_id
  github_runners_queue_id                  = module.service_bus.github_runners_queue_id
  github_state_queue_id                    = module.service_bus.github_state_queue_id
  azure_tenant_id                          = var.azure_tenant_id
  azure_secrets_key_vault_resource_id      = var.azure_secrets_key_vault_resource_id
  azure_registration_key_vault_resource_id = azurerm_key_vault.github_runner_registration_keyvault.id
  azure_gallery_image_type                 = var.azure_gallery_image_type
  azure_gallery_image_id                   = var.azure_gallery_image_id
  tags                                     = var.tags
}

// TODO: app service with managed identity (MSI)
// TODO: app service MSI access to keyvault (read / write)
// TODO: app service MSI access to create, update, delete VMs (owner access on resource group?)
// TODO: app service MSI access to app config (read)
// TODO(?): storage account for caching actions runner tarball
// TODO(?): app service MSI access to storage account
// TODO: add tags to all resources that support it
