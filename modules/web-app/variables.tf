variable "azure_resource_group_name" {
  type = string
}

variable "azure_resource_group_id" {
  type = string
}

variable "location" {
  type = string
}

# Linux/Windows
variable "os_type" {
  type = string
}

variable "docker_image" {
  type = string
}

variable "docker_image_tag" {
  type = string
}

variable "azure_app_configuration_object_id" {
  type = string
}

variable "github_runner_queues_id" {
  type = string
}

variable "github_runners_queue_id" {

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

variable "azure_gallery_image_id" {
  type = string
}

variable "azure_gallery_image_name" {
  type = string
}

variable "azure_tenant_id" {
  type = string
}

variable "sku_name" {
  type = string
}

variable "log_level" {
  type = string
}

variable "name_suffix" {
  type = string
}
