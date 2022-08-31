locals {
  suffix = trimprefix(var.name_suffix, "-")
}

resource "azurerm_storage_account" "gh_webhook_event_handler_app_storage" {
  name                     = "saeventhandlerapp${local.suffix}"
  resource_group_name      = data.azurerm_resource_group.resource_group.name
  location                 = data.azurerm_resource_group.resource_group.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_app_service_plan" "gh_webhook_event_handler_app_service_plan" {
  name                = "plan-github-webhook-event-handler${var.name_suffix}"
  location            = data.azurerm_resource_group.resource_group.location
  resource_group_name = data.azurerm_resource_group.resource_group.name
  kind                = "Container"

  sku {
    tier = "Standard"
    size = "S1"
  }
}

resource "azurerm_function_app" "gh_webhook_event_handler_app" {
  name                       = "func-github-webhook-event-handler${var.name_suffix}"
  location            = data.azurerm_resource_group.resource_group.location
  resource_group_name = data.azurerm_resource_group.resource_group.name
  app_service_plan_id        = azurerm_app_service_plan.gh_webhook_event_handler_app_service_plan.id
  storage_account_name       = azurerm_storage_account.gh_webhook_event_handler_app_storage.name
  storage_account_access_key = azurerm_storage_account.gh_webhook_event_handler_app_storage.primary_access_key
}

