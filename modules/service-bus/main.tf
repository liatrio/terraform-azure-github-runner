resource "azurerm_servicebus_namespace" "github_runner_queues" {
  name                = "sb-github-runner-queues${var.name_suffix}"
  location            = var.azure_resource_group_location
  resource_group_name = var.azure_resource_group_name
  sku                 = "Basic"

  tags = {
    "managed-by" : var.github_runner_identifier_label,
  }
}

resource "azurerm_servicebus_queue" "github_webhook_events" {
  name         = "sbq-github-webhook-events"
  namespace_id = azurerm_servicebus_namespace.github_runner_queues.id
}

resource "azurerm_servicebus_queue" "github_runners" {
  name         = "sbq-github-runners"
  namespace_id = azurerm_servicebus_namespace.github_runner_queues.id
}

resource "azurerm_servicebus_queue" "github_state" {
  name         = "sbq-github-state"
  namespace_id = azurerm_servicebus_namespace.github_runner_queues.id
}

resource "azurerm_role_assignment" "current_user_principal_app_config_data_owner" {
  for_each = toset(var.service_bus_owners)

  scope                = azurerm_servicebus_namespace.github_runner_queues.id
  role_definition_name = "Azure Service Bus Data Owner"
  principal_id         = each.value

  lifecycle {
    create_before_destroy = true
  }
}
