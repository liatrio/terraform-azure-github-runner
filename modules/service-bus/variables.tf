variable "github_runner_identifier_label" {
  type = string
}

variable "name_suffix" {
  type = string
}

variable "azure_resource_group_name" {
  type = string
}

variable "azure_resource_group_location" {
  type = string
}

variable "service_bus_owners" {
  type = list(string)
}
