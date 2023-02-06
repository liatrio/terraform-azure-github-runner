locals {
  suffix            = trimprefix(var.name_suffix, "-")
  function_name     = "eventHandler"
  function_key_name = "default"
}

resource "azurerm_storage_account" "gh_webhook_event_handler_app_storage" {
  name                     = "sarunners${local.suffix}"
  resource_group_name      = var.azure_resource_group_name
  location                 = var.azure_resource_group_location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_service_plan" "gh_webhook_event_handler_app_service_plan" {
  name                = "plan-github-webhook-event-handler${var.name_suffix}"
  resource_group_name = var.azure_resource_group_name
  location            = var.azure_resource_group_location
  os_type             = "Linux"
  sku_name            = "B1"
}

resource "azurerm_linux_function_app" "gh_webhook_event_handler_app" {
  name                       = "func-github-webhook-event-handler${var.name_suffix}"
  resource_group_name        = var.azure_resource_group_name
  location                   = var.azure_resource_group_location
  storage_account_name       = azurerm_storage_account.gh_webhook_event_handler_app_storage.name
  storage_account_access_key = azurerm_storage_account.gh_webhook_event_handler_app_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.gh_webhook_event_handler_app_service_plan.id

  app_settings = {
    "DOCKER_ENABLE_CI"                    = "true"
    "AZURE_APP_CONFIGURATION_ENDPOINT"    = var.app_configuration_endpoint
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
  }

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on = true
    app_service_logs {
      disk_quota_mb         = 100
      retention_period_days = 90
    }
    application_stack {
      docker {
        registry_url = var.docker_registry_url
        image_name   = var.event_handler_image_name
        image_tag    = var.event_handler_image_tag
        # registry_url - (Required) The URL of the docker registry.
        # image_name - (Required) The name of the Docker image to use.
        # image_tag - (Required) The image tag of the image to use.
        # registry_username - (Optional) The username to use for connections to the registry.
        # NOTE:
        # This value is required if container_registry_use_managed_identity is not set to true.
        # registry_password - (Optional) The password for the account to use to connect to the registry.
        # NOTE:
        # This value is required if container_registry_use_managed_identity is not set to true.
      }
    }
  }
}

data "azurerm_function_app_host_keys" "default" {
  name                = trimsuffix(azurerm_linux_function_app.gh_webhook_event_handler_app.default_hostname, ".azurewebsites.net")
  resource_group_name = var.azure_resource_group_name
}

data "http" "function_key" {
  url = "https://${azurerm_linux_function_app.gh_webhook_event_handler_app.default_hostname}/admin/functions/${local.function_name}/keys/${local.function_key_name}?code=${data.azurerm_function_app_host_keys.default.primary_key}"

  request_headers = {
    Content-Type = "application/json"
  }
}

resource "azurerm_role_assignment" "gh_webhook_event_handler_app_service_bus_data_sender" {
  scope                = var.github_webhook_events_queue_id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_linux_function_app.gh_webhook_event_handler_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    azurerm_linux_function_app.gh_webhook_event_handler_app
  ]
}

resource "azurerm_role_assignment" "function_app_configuration_data_reader" {
  scope                = var.azure_app_configuration_object_id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = azurerm_linux_function_app.gh_webhook_event_handler_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    azurerm_linux_function_app.gh_webhook_event_handler_app
  ]
}

resource "azurerm_key_vault_access_policy" "app_secrets_key_vault_access_policy" {
  key_vault_id = var.azure_secrets_key_vault_resource_id
  tenant_id    = var.azure_tenant_id
  object_id    = azurerm_linux_function_app.gh_webhook_event_handler_app.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]
}
