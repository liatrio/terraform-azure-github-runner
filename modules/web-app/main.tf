locals {
  suffix = trimprefix(var.name_suffix, "-")
}

resource "azurerm_service_plan" "gh_webhook_runner_controller_app_service_plan" {
  name                = "plan-github-webhook-runner-controller${var.name_suffix}"
  resource_group_name = var.azure_resource_group_name
  location            = var.location
  os_type             = var.web_app_os_type
  sku_name            = var.web_app_sku_name
}

resource "azurerm_linux_web_app" "gh_webhook_runner_controller_app" {
  name                = "web-app-github-webhook-runner-controller${var.name_suffix}"
  resource_group_name = var.azure_resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.gh_webhook_runner_controller_app_service_plan.id

  site_config {
    application_stack {
      docker_image     = var.web_app_image_name
      docker_image_tag = var.web_app_image_tag
    }

    ftps_state        = "FtpsOnly"
    health_check_path = "/health"
  }

  https_only = true

  app_settings = {
    "AZURE_APP_CONFIGURATION_ENDPOINT" = var.azure_app_configuration_endpoint
    "DOCKER_REGISTRY_SERVER_URL"       = var.docker_registry_url
  }

  logs {
    application_logs {
      file_system_level = var.log_level
    }
  }

  identity {
    type = "SystemAssigned"
  }


}

resource "azurerm_role_assignment" "gh_runner_controller_app_virtual_machine_contributor" {
  scope                = var.azure_resource_group_id
  role_definition_name = "Virtual Machine Contributor"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    azurerm_linux_web_app.gh_webhook_runner_controller_app
  ]
}

resource "azurerm_role_assignment" "gh_runner_controller_app_managed_identity_operator" {
  scope                = var.azure_resource_group_id
  role_definition_name = "Managed Identity Operator"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    azurerm_linux_web_app.gh_webhook_runner_controller_app
  ]
}

resource "azurerm_role_assignment" "gh_runner_controller_app_sig_rg_reader" {
  scope                = var.azure_gallery_image_name
  role_definition_name = "Reader"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_role_assignment" "web_app_compute_gallery_sharing_admin" {
  scope                = var.azure_gallery_image_id
  role_definition_name = "Compute Gallery Sharing Admin"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_role_assignment" "gh_runner_controller_app_service_bus_namespace_data_receiver" {
  scope                = var.github_runners_service_bus_id
  role_definition_name = "Azure Service Bus Data Receiver"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_role_assignment" "gh_runner_controller_app_service_bus_runners_queue_data_sender" {
  scope                = var.github_runners_queue_id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_role_assignment" "gh_runner_controller_app_service_bus_state_queue_data_sender" {
  scope                = var.github_state_queue_id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_role_assignment" "web_app_app_configuration_data_reader" {
  scope                = var.azure_app_configuration_object_id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  lifecycle {
    create_before_destroy = true
  }
}

resource "azurerm_key_vault_access_policy" "app_secrets_key_vault_access_policy" {
  key_vault_id = var.azure_secrets_key_vault_resource_id
  tenant_id    = var.azure_tenant_id
  object_id    = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]
}

resource "azurerm_key_vault_access_policy" "app_registration_key_vault_access_policy" {
  key_vault_id = var.azure_registration_key_vault_resource_id
  tenant_id    = var.azure_tenant_id
  object_id    = azurerm_linux_web_app.gh_webhook_runner_controller_app.identity[0].principal_id

  secret_permissions = [
    "Get",
    "Set"
  ]
}
