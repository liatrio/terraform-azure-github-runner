terraform {
  required_version = ">= 1.1.0"

  required_providers {
    azurerm = {
      source = "hashicorp/azure"
      version = "~> 3.17.0"
    }
  }
}
