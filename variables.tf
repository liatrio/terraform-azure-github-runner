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

variable "azure_gallery_image_name" {
  type = string
}

variable "azure_vm_size" {
  type    = string
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

variable "github_runner_identifier_label" {
  type        = string
  default     = "terraform-azure-github-runner"
  description = "Special label applied to runners managed by this module. Note that if this value is changed, any active runners will no longer be managed."
}

variable "github_runner_warm_pool_size" {
  type    = number
  default = 3
}

variable "github_runner_maximum_count" {
  type    = number
  default = 5
}

variable "azure_secrets_key_vault_resource_id" {
  type = string
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

variable "web_app_os_type" {
  type    = string
  default = "Linux"
}

variable "docker_registry_url" {
  type    = string
  default = "ghcr.io"
}

variable "function_image_name" {
  type    = string
  default = "liatrio/github-webhook-event-handler"
}

variable "function_image_tag" {
  type    = string
  default = "latest"
}

variable "web_app_sku_name" {
  type    = string
  default = "S1"
}

variable "web_app_image_name" {
  type    = string
  default = "liatrio/github-webhook-runner-controller"
}

variable "web_app_image_tag" {
  type    = string
  default = "latest"
}

variable "log_level" {
  type    = string
  default = "Information"
}
