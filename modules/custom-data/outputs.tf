output "base64_encoded_script" {
  value = base64encode(local.custom_data_script)
}

output "raw_script" {
  value = local.custom_data_script
}
