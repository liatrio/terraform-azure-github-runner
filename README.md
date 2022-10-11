# Terraform Azure GitHub Runners (self-hosted)
This project includes all necessary components to spin up the infrastructure for VM based GitHub self-hosted runners.  This project was created with some inspiration from the [Philips Lab AWS Solution](https://github.com/philips-labs/terraform-aws-github-runner) with some opinionated changes on what our team at [Liatrio](https://www.liatrio.com/) has seen work well across different enterprises.  

#### **These patterns include:**
- *Ephemeral Only* 
  - Runners should only run one job to avoid interference from one workflow run to the next
- *Warm Pool by Default* 
  - Keeping idle runners on is a must to ensure quick feedback loops
- *Custom Images*
  - Images should be able to build *most* apps in organization without additional tool installation ([example](https://github.com/liatrio/packer-azure-github-runner))
  - Including necessary tools in VM Image to reduce startup time for *most* builds
- *Security*
  - Runner VMs are granted a single use registration token with no additional access to GitHub
  - All components utilize Managed Identities for access to other resources, and are granted the least access required to function.

## Arcitecture Diagram
![Terraform Azure GitHub Runners](https://user-images.githubusercontent.com/100593043/194669700-4cd851ab-b047-4dd4-87bd-81cb4e572e24.png)

## Components

### Terraform Module
This [Terraform](https://www.terraform.io/) module generates the infrastructure required to host the applications that will manage the self-hosted runners.

### Event-Handler (Azure Function App)
The event-handler will receive messages from the GitHub App during workflow run events.  It will act as a filter to ensure they are from GitHub with labels that match what is provided in the module.

### Runner-Controller (Azure App Service)
This application will act as the controller for the warm pool and ensure that the pool size adheres to the parameters specified in the Terraform module.  It will consume events from the queue as necessary to create VMs and ensure a healthy number of VMs are always ready to process new workflow jobs.

## Getting Started

### Pre-requisites
- GitHub App for Organization (owner access)
- Azure
  - Subscription
    - *Note: Subscription quota for "Total Regional Low-priority vCPUs" should be increased to allow multiple spot instances*
  - Resource Group
  - Subnet with internet access
  - KeyVault for GitHub App Credential
  - *optional* - Managed Image accessible by Runner-Controller

### Create Custom Image (optional)
For convenience we have provided an image in our public Azure Community Gallery that can be used for quick setup, but you may want to build a custom image tailored to your use case. Referencing the [Packer Template repo](https://github.com/liatrio/packer-azure-github-runner), create an image and publish it to [Azure Compute Gallery](https://docs.microsoft.com/en-us/azure/virtual-machines/azure-compute-gallery) that can be created by this Terraform module.

### Create GitHub App
The GitHub App serves as the foundation for sending webhook events to App A and retrieving registration tokens to store in Azure Key Vault.

1) Navigate: Settings → Developer Settings → GitHub Apps → New GitHub App
2) Configure permissions
3) Configure settings, webhook settings to be updated later
4) Save App and take note of App ID, Client ID

#### **Permissions for GitHub App**

| Permission                        | Access         |
|:--------------------------------- |:--------------:|
| Repository:   Actions             | Read-only      |
| Repository:   Checks              | Read-only      |
| Repository:   Metadata            | Read-only      |
| Organization: Self-hosted runners | Read and write |

#### **Settings for Github App**

| Required Field                          | Value                |
| --------------------------------------- |:--------------------:|
| GitHub App Name                         | *                    |
| Homepage URL                            | *                    |
| Webhook Active                          | False                |
| Webhook URL                             |                      |
| Subscribe to events                     | Workflow job         |
| Where can this GitHub App be installed? | Only on this account |

*Note: You will need one GitHub App per org. Allowing installation to "Any account" makes it difficult to change access if installed on orgs outside your control.


### Setup Terraform Module

Consume the `azure_github_runner` module with inputs required for your GitHub Enterprise Cloud or GitHub Enterprise server configuration. Examples can be found in [Terraform Examples](./modules/terraform-examples).  

Run terraform by using the following commands

```zsh
terraform init
terraform apply
```

The terraform output displays the Azure Function endpoint and secret, which you need in the next step.

### Deploy Function App and App Service

The terraform module is set up by default to use the latest version of both apps and deploy them on `terraform apply`.  Specific versions found in our public [GitHub Packages](https://github.com/orgs/liatrio/packages?repo_name=terraform-azure-github-runner) and set in the terraform module inputs.  If you choose to publish your own images, functionality to do so will be implemented soon™.

### Setup the webhook and install the GitHub App

Go back to the GitHub App and update the following settings

1. Activate the webhook
2. Provide the webhook url, which should be part of the terraform output
3. Provide the webhook secret
4. Save changes and navigate to the Install App tab
5. Next to your GitHub App, select Install next to your org and select 'All Repositories'

 ## Required Inputs

 Below are the required inputs required to get started with this module.  Some may be marked with an asterisk which indicates we recommend you pull this from a data source.  Examples of usage can be found at [Terraform Examples](./modules/terraform-examples).

 | Name | Description | Type |
|------|-------------|------|
| [azure_tenant_id]() | Azure tenant ID | `string` |
| [azure_subscription_id]() | Azure subscription ID | `string` |
| [azure_resource_group_name]() | Resource Group that the components and runners will be created within | `string` |
| [azure_subnet_id]() | Azure subnet ID | `string` |
| [name_suffix]() | Identifying suffix that will be appended to all components created by this module (default: `null`) | `string` |
| [github_organization]() | GitHub organization | `string` |
| [github_app_id]() | GitHub App ID | `string` |
| [github_client_id]() | GitHub Client ID | `string` |
| [github_installation_id]() | GitHub App installation ID | `string` |
| [azure_secrets_key_vault_resource_id]() | Key Vault ID where GitHub secrets are stored | `string` |
| [*azure_runner_default_password_key_vault_id]() | Key Vault ID for Azure runner default password ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret))| `string` |
| [*github_client_secret_key_vault_id]() | Keyvault Vault ID for GitHub App client secret ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| [*github_webhook_secret_key_vault_id]() | Keyvault Vault ID for GitHub App webhook secret ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| [*github_private_key_key_vault_id]() | Keyvault Vault ID for GitHub App private key ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| [*owners]() | The list of owners that will be assigned to all components ([data source](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/users)) | `list(string)` |

## Optional Inputs

One goal of this module is to minimize the number of customizations needed in order to run autoscaling self-hosted runners.  With this being said, this list of optional inputs will grow but hopefully not so much that it becomes difficult to manage and get started with this solution.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| [log_level]() | Log level used across applications | `string` | Information |
| [azure_gallery_name]() | Azure Compute Gallery to be used in runner creation, leave default to use the Liatrio-provided image | `string` | /subscriptions/3d243cec-9a80-435e-8bcd-4349b654b665/resourceGroups/rg-liatrio-community-gallery |
| [azure_gallery_image_id]() | Azure Compute Gallery image ID to be used in runner creation, leave default to use `latest` Liatrio public image | `string` | /providers/Microsoft.Compute/galleries/liatrioCommunityGalleryTest/images/ubuntu_gh_runner/versions/0.0.4 |
| [event_handler_image_tag]() | Event-Handler image tag to use from [GitHub Packages](https://github.com/liatrio/terraform-azure-github-runner/pkgs/container/github-webhook-runner-controller) | `string` | latest |
| [runner_controller_image_tag]() | Runner-Controller image tag to use from [GitHub Packages](https://github.com/liatrio/terraform-azure-github-runner/pkgs/container/github-webhook-runner-controller) | `string` | latest |
