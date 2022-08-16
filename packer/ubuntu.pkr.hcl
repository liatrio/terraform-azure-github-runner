locals {
  image_name = "ubuntu-20.04-amd64-server-gh-runner-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}

variable "subscription_id" {
  default = env("subscription_id")
}

variable "client_id" {
  default = env("client_id")
}

variable "client_secret" {
  default = env("client_secret")
}

variable "sig_resource_group" {}

variable "sig_name" {}

variable "sig_image_name" {}

variable "sig_image_version" {}

variable "regions" {}

source "azure-arm" "ubuntu" {

  # expects Azure auth to be passed in via environment variables.
  # To use local AZ CLI auth, replace these three lines with "use_azure_cli_auth = true"
  subscription_id = var.subscription_id
  client_id       = var.client_id
  client_secret   = var.client_secret

  shared_image_gallery_destination {
    subscription         = var.subscription_id
    resource_group       = var.sig_resource_group
    gallery_name         = var.sig_name
    image_name           = var.sig_image_name
    image_version        = var.sig_image_version
    replication_regions  = var.regions
    storage_account_type = "Standard_LRS"
  }
  managed_image_name                = local.image_name
  managed_image_resource_group_name = var.sig_resource_group

  os_type         = "Linux"
  image_publisher = "canonical"
  image_offer     = "0001-com-ubuntu-server-focal"
  image_sku       = "20_04-lts"

  ssh_username = "ubuntu"

  location = "East US"
  vm_size  = "Standard_A2"
}

build {
  sources = ["sources.azure-arm.ubuntu"]

  provisioner "shell" {
    script = "./install.sh"
  }
}
