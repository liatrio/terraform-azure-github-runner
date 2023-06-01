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
  type        = string
  default     = "/communityGalleries/liatrio-4e8ffc8d-5950-4137-b02c-df028384cdcd/images/ubuntu_gh_runner/versions/latest"
  description = <<EOF
    The ID of the image to use. Format differs based on the value of azure_gallery_image_type.

    azure_gallery_image_type: 'community'
      '/communityGalleries/{public-gallery-name}/images/{gallery-image-definition}/versions/{image-version}'
    azure_gallery_image_type: 'direct-shared'
      '/subscriptions/{subscription-id}/resourceGroups/{resource-group-name}/providers/Microsoft.Compute/galleries/{gallery-name}/images/{gallery-image-definition}/versions/{image-version}'
    azure_gallery_image_type: 'rbac'
      '/subscriptions/{subscription-id}/resourceGroups/{resource-group-name}/providers/Microsoft.Compute/galleries/{gallery-name}/images/{gallery-image-definition}/versions/{image-version}'

    See https://learn.microsoft.com/rest/api/compute/virtual-machines/create-or-update?tabs=HTTP#imagereference for details.
  EOF
}

variable "azure_gallery_image_type" {
  type        = string
  default     = "community"
  description = "Available options: 'community', 'direct-shared', 'rbac'"

  validation {
    condition     = contains(["community", "direct-shared", "rbac"], var.azure_gallery_image_type)
    error_message = "The azure_gallery_image_type must be one of 'community', 'direct-shared', 'rbac'."
  }
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

variable "github_runner_group" {
  type    = string
  default = "Default"
}

variable "web_app_os_type" {
  type    = string
  default = "Linux"
}

variable "docker_registry_url" {
  type    = string
  default = "ghcr.io"
}

variable "event_handler_image_name" {
  type    = string
  default = "liatrio/github-webhook-event-handler"
}

variable "event_handler_image_tag" {
  type    = string
  default = "latest"
}

variable "web_app_sku_name" {
  type    = string
  default = "B1"
}

variable "runner_controller_image_name" {
  type    = string
  default = "liatrio/github-webhook-runner-controller"
}

variable "runner_controller_image_tag" {
  type    = string
  default = "latest"
}

variable "log_level" {
  type    = string
  default = "Information"
}

variable "tags" {
  description = "Map of tags that will be added to created resources."
  type        = map(string)
  default     = {}
}