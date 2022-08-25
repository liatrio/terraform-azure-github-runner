output "service_bus_namespace_uri" {
  value = "${azurerm_servicebus_namespace.github_runner_queues.name}.servicebus.windows.net"
}

output "github_webhook_events_queue" {
  value = azurerm_servicebus_queue.github_webhook_events.name
}

output "github_runners_queue" {
  value = azurerm_servicebus_queue.github_runners.name
}
