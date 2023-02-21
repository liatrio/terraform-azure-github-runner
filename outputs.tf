output "custom_data_script" {
  value = module.app_config.custom_data_script
}

#output "function_webhook_url" {
#  sensitive = true
#  value     = module.github_webhook_event_handler_function_app.function_webhook_url
#}
