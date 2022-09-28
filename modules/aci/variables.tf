variable "container_group_name" {
  type = string
}

variable "azure_resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

# Linux/Windows
variable "os_type" {
  type = string
}

variable "container_name" {
  type = string
}

variable "image_name" {
  type = string
}

variable "cpu_core_number" {
  type = string
}

variable "memory_size" {
  default = 1
  type = string
}

variable "port_number" {
  default = 80
  type = string
}

variable "azure_app_configuration_object_id" {
  type = string
}

variable "github_webhook_events_queue_id" {
  type = string
}

variable "azure_secrets_key_vault_resource_id" {
  type = string
}

variable "azure_tenant_id" {
  type = string
}
