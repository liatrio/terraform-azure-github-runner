output "function_webhook_url" {
  value = "https://${azurerm_linux_function_app.gh_webhook_event_handler_app.default_hostname}/api/eventHandler"
}
