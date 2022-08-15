  sig_subscription_id = "${{ secrets.AZURE_SIG_SUBSCRIPTION_ID }}"
  sig_resource_group  = "rg-liatrio-community-gallery"
  sig_name            = "liatrioCommunityGalleryTest"
  sig_image_name      = "ubuntu_gh_runner"
  sig_image_version   = 0.0.2
  regions             = ["eastus"]
  msi_resource_group  = "rg-azure-github-runner"
