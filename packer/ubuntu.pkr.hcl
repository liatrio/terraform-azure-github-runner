locals {
  image_name = "ubuntu-20.04-amd64-server-gh-runner-${formatdate("YYYYMMDDhhmmss", timestamp())}"
}

source "azure-arm" "ubuntu" {
  shared_image_gallery_destination {
    subscription         = "3e16852e-8399-4c16-b246-16bf46bc3747"
    resource_group       = "rg-azure-github-runner"
    gallery_name         = "github_runner_gallery"
    image_name           = "github-runner"
    image_version        = "0.0.2"
    replication_regions  = ["eastus", "centralus"]
    storage_account_type = "Standard_LRS"
  }
  use_azure_cli_auth                = true
  managed_image_name                = local.image_name
  managed_image_resource_group_name = "rg-azure-github-runner"

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
