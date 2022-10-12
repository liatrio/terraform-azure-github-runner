output "function_webhook_url" {
  value = nonsensitive("https://${azurerm_linux_function_app.gh_webhook_event_handler_app.default_hostname}/api/eventHandler?clientId=default&code=${data.azurerm_function_app_host_keys.default.default_function_key}")
}
