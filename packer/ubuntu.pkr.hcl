locals {
  image_name = "ubuntu-20.04-amd64-server-gh-runner-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}

source "azure-arm" "ubuntu" {
  shared_image_gallery_destination {
    subscription         = var.sig_subscription_id
    resource_group       = var.sig_resource_group
    gallery_name         = var.sig_name
    image_name           = var.sig_image_name
    image_version        = var.sgi_image_version
    replication_regions  = var.regions
    storage_account_type = "Standard_LRS"
  }
  use_azure_cli_auth                = true
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
