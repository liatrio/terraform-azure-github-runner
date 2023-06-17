output "base64_encoded_script" {
  value = base64encode(local.ubuntu_init_script)
}

output "raw_script" {
  value = local.ubuntu_init_script
}
