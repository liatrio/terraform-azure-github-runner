variable "name_suffix" {
  type = string
}

variable "azure_tenant_id" {
  type = string
}

variable "azure_subscription_id" {
  type = string
}

variable "azure_resource_group_name" {
  type = string
}

variable "azure_subnet_id" {
  type = string
}

variable "azure_gallery_image_id" {
  type = string
}

variable "azure_app_config_owners" {
  type    = list(string)
  default = []
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

variable "github_installation_id" {
  type = string
}

variable "azure_runner_default_password_key_vault_id" {
  type = string
}

variable "github_client_secret_key_vault_id" {
  type = string
}

variable "github_private_key_key_vault_id" {
  type = string
}
