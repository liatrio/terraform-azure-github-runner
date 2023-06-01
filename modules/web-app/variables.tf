variable "azure_resource_group_id" {
  type = string
}

variable "azure_resource_group_name" {
  type = string
}

variable "azure_tenant_id" {
  type = string
}

variable "location" {
  type = string
}

variable "azure_app_configuration_object_id" {
  type = string
}

variable "azure_app_configuration_endpoint" {
  type = string
}

variable "azure_gallery_image_id" {
  type = string
}

variable "azure_gallery_image_type" {
  type = string
}

variable "github_runners_service_bus_id" {
  type = string
}

variable "github_runners_queue_id" {
  type = string
}

variable "github_state_queue_id" {
  type = string
}

variable "azure_secrets_key_vault_resource_id" {
  type = string
}

variable "azure_registration_key_vault_resource_id" {
  type = string
}

variable "docker_registry_url" {
  type = string
}

variable "runner_controller_image_name" {
  type = string
}

variable "runner_controller_image_tag" {
  type = string
}

# Linux/Windows
variable "web_app_os_type" {
  type = string
}

variable "web_app_sku_name" {
  type = string
}

variable "log_level" {
  type = string
}

variable "name_suffix" {
  type = string
}

variable "tags" {
  description = "Map of tags that will be added to created resources."
  type        = map(string)
  default     = {}
}