output "service_bus_namespace_uri" {
  value = "${azurerm_servicebus_namespace.github_runner_queues.name}.servicebus.windows.net"
}

output "github_webhook_events_queue" {
  value = azurerm_servicebus_queue.github_webhook_events.name
}

output "github_webhook_events_queue_id" {
  value = azurerm_servicebus_queue.github_webhook_events.id
}

output "github_runners_queue" {
  value = azurerm_servicebus_queue.github_runners.name
}

output "github_runners_queue_id" {
  value = azurerm_servicebus_queue.github_runners.id
}

output "github_state_queue" {
  value = azurerm_servicebus_queue.github_state.name
}

output "github_state_queue_id" {
  value = azurerm_servicebus_queue.github_state.id
}

