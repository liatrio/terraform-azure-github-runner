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
  - Applications are designed with minimal access to other resources and resource groups utilzing Managed Identities for each resource created.

## Arcitecture Diagram
![Terraform Azure GitHub Runners](https://user-images.githubusercontent.com/100593043/194669700-4cd851ab-b047-4dd4-87bd-81cb4e572e24.png)

## Components

### Terraform Module
This [Terraform](https://www.terraform.io/) module generates the infrastructure required to host the applications that will manage the self-hosted runners.

### Applications (Event-Handler and Runner-Controller)

#### Event-Handler (Function App)
The event-handler will receive traffic from the GitHub App.  Once received it will validate the payload against the GitHub App installation, ensure labels received match what is provided in the Terraform Module, and send the valid messages to the Service Bus Event Queue.

#### Runner-Controller (App Service)
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
For initial POCs, it is recommended to use the image we provide in our public Azure Community Gallery and move to custom images once you've determined this solution meets your needs. Referencing the [Packer Template repo](https://github.com/liatrio/packer-azure-github-runner), create an image and publish it to [Azure Compute Gallery](https://docs.microsoft.com/en-us/azure/virtual-machines/azure-compute-gallery) that can be created by this Terraform module.

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

Consume the ```azure_github_runner``` module with inputs required for your GitHub Enterprise Cloud or GitHub Enterprise server configuration. Examples can be found in [Terraform Examples](./modules/terraform-examples).  

Run terraform by using the following commands

```zsh
terraform init
terraform apply
```

The terraform output displays the Azure Function endpoint and secret, which you need in the next step.

### Deploy Function App and App Service

The terraform module is set up by default to use the latest version of both apps and deploy them on ```terraform apply```.  Specific versions found in our public [GitHub Packages](https://github.com/orgs/liatrio/packages?repo_name=terraform-azure-github-runner) and set in the terraform module inputs.  If you choose to publish your own images, functionality to do so will be implemented soon™.

### Setup the webhook and install the GitHub App

Go back to the GitHub App and update the following settings

1. Activate the webhook
2. Provide the webhook url, should be part of the output of terraform
3. Provide the webhook secret
4. Save changes and navigate to the Install App tab
5. Next to your GitHub App, select Install App and select 'All Repositories'

 ## Required Inputs

 Below are the minimum inputs required to get started with this module.  Some may be marked with an asterisk which indicates we recommend you pull this from a data source.  Examples of usage can be found at [Terraform Examples](./modules/terraform-examples).

 | Name | Description | Type |
|------|-------------|------|
| <a name="azure_tenant_id"></a> [azure\_tenant\_id](#input\_azure\_tenant\_id) | Azure tenant Id | `string` |
| <a name="azure_subscription_id"></a> [azure\_subscription\_id](#input\_azure\_subscription\_id) | Azure subscription Id | `string` |
| <a name="azure_resource_group_name"></a> [azure\_resource\_group\_name](#input\_azure\_resource\_group\_name) | Resource Group that the components and runners will be created within | `string` |
| <a name="azure_subnet_id"></a> [azure\_subnet\_id](#input\_azure\_subnet\_id) | Azure subnet id | `string` |
| <a name="name_suffix"></a> [name\_suffix](#input\_name_\_suffix) | Identifying suffix that will be appended to all components created by this module (default: `null`) | `string` |
| <a name="github_organization"></a> [github\_organization](#input\_github\_organization) | GitHub organization | `string` |
| <a name="github_app_id"></a> [github\_app\_id](#input\_github\_app\_id) | GitHub App Id | `string` |
| <a name="github_client_id"></a> [github\_client\_id](#input\_github\_client\_id) | GitHub Client Id | `string` |
| <a name="github_installation_id"></a> [github\_installation\_id](#input\_github\_installation\_id) | GitHub App installation Id | `string` |
| <a name="azure_secrets_key_vault_resource_id"></a> [azure\_secrets\_key\_vault\_resource\_id](#input\_azure\_secrets\_key\_vault\_resource\_id) | Key Vault Id where GitHub Secrets are stored | `string` |
| <a name="azure_runner_default_password_key_vault_id"></a> [* azure\_runner\_default\_password\_key\_vault\_id](#input\_azure\_runner\_default\_password\_key\_vault\_id) | Key Vault Id for Azure Runner Default Password ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret))| `string` |
| <a name="github_client_secret_key_vault_id"></a> [* github\_client\_secret\_key\_vault\_id](#input\_github\_client\_secret\_key\_vault\_id) | Keyvault Vault Id for GitHub App Client Secret ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| <a name="github_webhook_secret_key_vault_id"></a> [* github\_webhook\_secret\_key\_vault\_id](#input\_github\_webhook\_secret\_key\_vault\_id) | Keyvault Vault Id for GitHub App Webhook Secret ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| <a name="github_private_key_key_vault_id"></a> [* github\_private\_key\_key\_vault\_id](#input\_github\_private\_key\_key\_vault\_id) | Keyvault Vault Id for GitHub App Private Key ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| <a name="owners"></a> [* owners](#input\_owners) | The list of owners that will be assigned to all components ([data source](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/users)) | `list(string)` |

## Optional Inputs

One goal of this module is to minimize the number of customizations needed in order to run autoscaling self-hosted runners.  With this being said, this list of optional inputs will grow but hopefully not so much that it becomes difficult to manage and get started with this solution.

| Name | Description | Type | Default |
|------|-------------|------|---------|
| <a name="log_level"></a> [log\_level](#input\_log\_level) | Log level used across applications | `string` | Information |
| <a name="azure_gallery_name"></a> [azure\_gallery\_name](#input\_azure\_gallery\_name) | Azure Compute Gallery to be used in runner creation, leave default to use Liatrio Public Image | `string` | /subscriptions/3d243cec-9a80-435e-8bcd-4349b654b665/resourceGroups/rg-liatrio-community-gallery |
| <a name="azure_gallery_image_id"></a> [azure\_gallery\_image\_id](#input\_azure\_gallery\_image\_id) | Azure Compute Gallery Image Id to be used in runner creation, leave default to use `latest` Liatrio Public Image | `string` | /providers/Microsoft.Compute/galleries/liatrioCommunityGalleryTest/images/ubuntu_gh_runner/versions/0.0.4 |
| <a name="event_handler_image_tag"></a> [event\_handler\_image\_tag](#input\event\_handler\_image\_tag) | Event-Handler image tag to use from [GitHub Packages](https://github.com/liatrio/terraform-azure-github-runner/pkgs/container/github-webhook-runner-controller) | `string` | latest |
| <a name="runner_controller_image_tag"></a> [runner\_controller\_image\_tag](#input\_runner\_controller\_image\_tag) | Runner-Controller image tag to use from [GitHub Packages](https://github.com/liatrio/terraform-azure-github-runner/pkgs/container/github-webhook-runner-controller) | `string` | latest |
