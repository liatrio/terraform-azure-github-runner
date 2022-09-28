resource "azurerm_resource_group" "aci_rg" {
  name     = "${var.azure_resource_group_name}"
  location = "${var.location}"
}

resource "azurerm_container_group" "containergroup" {
  name                  = "${var.container_group_name}"
  resource_group_name   = "${azurerm_resource_group.aci_rg.name}"
  location              = "${azurerm_resource_group.aci_rg.location}"
  ip_address_type       = "Public"
  os_type               = "${var.os_type}"

  container {
      name      = "${var.container_name}"
      image     = "${var.image_name}"
      cpu       = "${var.cpu_core_number}"
      memory    = "${var.memory_size}"

      ports {
        port      = "${var.port_number}"
        protocol  = "TCP"
      }
  }
}