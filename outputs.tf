output "ubuntu_init_script" {
  value = module.app_config.ubuntu_init_script
}
}

output "function_webhook_url" {
  sensitive = true
  value     = module.github_webhook_event_handler_function_app.function_webhook_url
}
