variable "name_suffix" {
  type = string
}

variable "azure_resource_group_name" {
  type = string
}

variable "azure_resource_group_location" {
  type = string
}

variable "azure_subscription_id" {
  type = string
}

variable "azure_subnet_id" {
  type = string
}

variable "azure_registration_key_vault_name" {
  type = string
}

variable "azure_registration_key_vault_url" {
  type = string
}

variable "azure_gallery_image_id" {
  type = string
}

variable "azure_gallery_image_type" {
  type = string
}

variable "azure_vm_size" {
  type = string
}

variable "azure_app_config_owners" {
  type = list(string)
}

variable "github_app_id" {
  type = string
}

variable "github_client_id" {
  type = string
}

variable "github_organization" {
  type = string
}

variable "github_repository" {
  type = string
}

variable "github_installation_id" {
  type = string
}

variable "github_runner_version" {
  type = string
}

variable "github_runner_username" {
  type = string
}

variable "github_runner_labels" {
  type = list(string)
}

variable "github_runner_group" {
  type = string
}

variable "github_runner_identifier_label" {
  type = string
}

variable "github_runner_identity" {
  type = string
}

variable "github_runner_warm_pool_size" {
  type = number
}

variable "github_runner_maximum_count" {
  type = number
}

variable "azure_runner_default_password_key_vault_id" {
  type = string
}

variable "github_client_secret_key_vault_id" {
  type = string
}

variable "github_webhook_secret_key_vault_id" {
  type = string
}

variable "github_private_key_key_vault_id" {
  type = string
}

variable "azure_service_bus_namespace_uri" {
  type = string
}

variable "azure_github_webhook_events_queue" {
  type = string
}

variable "azure_github_runners_queue" {
  type = string
}

variable "azure_github_state_queue" {
  type = string
}

variable "tags" {
  description = "Map of tags that will be added to created resources."
  type        = map(string)
  default     = {}
}
