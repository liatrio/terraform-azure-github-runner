resource "azurerm_container_group" "containergroup" {
  name                = var.container_group_name
  resource_group_name = var.azure_resource_group_name
  location            = var.location
  ip_address_type     = "Public"
  os_type             = var.os_type

  container {
    name   = var.container_name
    image  = var.image_name
    cpu    = var.cpu_core_number
    memory = var.memory_size

    ports {
      port     = var.port_number
      protocol = "TCP"
    }
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_role_assignment" "gh_runner_controller_app_service_bus_data_sender" {
  scope                = var.github_webhook_events_queue_id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_container_group.containergroup.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    azurerm_container_group.containergroup
  ]
}

resource "azurerm_role_assignment" "aci_app_configuration_data_reader" {
  scope                = var.azure_app_configuration_object_id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = azurerm_container_group.containergroup.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    azurerm_container_group.containergroup
  ]
}

resource "azurerm_key_vault_access_policy" "app_secrets_key_vault_access_policy" {
  key_vault_id = var.azure_secrets_key_vault_resource_id
  tenant_id    = var.azure_tenant_id
  object_id    = azurerm_container_group.containergroup.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]

  depends_on = [
    azurerm_container_group.containergroup
  ]
}
