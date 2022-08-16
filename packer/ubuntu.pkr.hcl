locals {
  image_name = "ubuntu-20.04-amd64-server-gh-runner-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}

variable "AZURE_SUBSCRIPTION_ID" {
  default = ""
}

variable "AZURE_CLIENT_ID" {
  default = ""
}

variable "AZURE_CLIENT_SECRET" {
  default = ""
}

variable "sig_subscription_id" {
  default = ""
}

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


source "azure-arm" "ubuntu" {
  subscription_id = var.AZURE_SUBSCRIPTION_ID
  client_id       = var.AZURE_CLIENT_ID
  client_secret   = var.AZURE_CLIENT_SECRET
  shared_image_gallery_destination {
    subscription         = var.sig_subscription_id
    resource_group       = var.sig_resource_group
    gallery_name         = var.sig_name
    image_name           = var.sig_image_name
    image_version        = var.sig_image_version
    replication_regions  = var.regions
    storage_account_type = "Standard_LRS"
  }
  managed_image_name                = local.image_name
  managed_image_resource_group_name = var.msi_resource_group

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
