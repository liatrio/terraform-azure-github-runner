output "app_configuration_endpoint" {
  value = azurerm_app_configuration.github_runner_app_config.endpoint
}

output "azure_app_configuration_object_id" {
  value = azurerm_app_configuration.github_runner_app_config.id
}
