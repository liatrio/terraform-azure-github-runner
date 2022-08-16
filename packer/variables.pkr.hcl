# sig_subscription_id = "must supply via env secret"
variable "sig_resource_group" {
  default = "rg-liatrio-community-gallery"
}

variable "sig_name" {
  default = "liatrioCommunityGalleryTest"
}

variable "sig_image_name" {
  default = "ubuntu_gh_runner"
}

variable "sig_image_version" {
  default = "0.0.2"
}

variable "regions" {
  default = ["eastus"]
}

variable "msi_resource_group" {
  default = "rg-azure-github-runner"
}
