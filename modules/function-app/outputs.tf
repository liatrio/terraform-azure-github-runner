#locals {
#  parsed_response = sensitive(jsondecode(data.http.function_key.response_body))
#}

#output "function_webhook_url" {
#  sensitive = true
#  value     = "https://${azurerm_linux_function_app.gh_webhook_event_handler_app.default_hostname}/api/eventHandler?clientId=default&code=${local.parsed_response.value}"
#}
