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

variable "azure_vm_size" {
  type = string
  default = "Standard_D2_v4"
}

variable "owners" {
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

variable "github_runner_username" {
  type    = string
  default = "ubuntu"
}

variable "github_runner_version" {
  type    = string
  default = "2.295.0"
}

variable "github_runner_labels" {
  type    = list(string)
  default = ["azure", "vm"]
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
