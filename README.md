# Terraform Azure GitHub Runners (self-hosted)

> **⚠️ ARCHIVED REPOSITORY**
> 
> This repository is archived and no longer actively maintained. While the code remains available for reference, we recommend considering **GitHub Action runners with Azure Private VNET** as an excellent alternative for connecting runners to your private infrastructure. This approach provides secure connectivity between GitHub-hosted runners and your private Azure resources without the overhead of managing self-hosted runner infrastructure.
> 
> For more information, see the [GitHub documentation on using GitHub-hosted runners in Azure private networks](https://docs.github.com/en/actions/using-github-hosted-runners/connecting-to-a-private-network).

This project includes all necessary components to spin up the infrastructure for VM based GitHub self-hosted runners in Azure.  This project was created with some inspiration from the [Philips Lab AWS Solution](https://github.com/philips-labs/terraform-aws-github-runner) with some opinionated changes on what our team at [Liatrio](https://www.liatrio.com/) has seen work well across different enterprises.

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

## Architecture Diagram
![Terraform Azure GitHub Runners](https://user-images.githubusercontent.com/100593043/194669700-4cd851ab-b047-4dd4-87bd-81cb4e572e24.png)

### How It Works
1. **GitHub Actions event ➜ Event-Handler** – A `workflow_job` event is emitted by GitHub Enterprise/Cloud and forwarded by a GitHub App to the Event-Handler Azure Function.
2. **Event-Handler ➜ Service Bus** – The function validates the request, filters on runner labels, and publishes a message to an Azure Service Bus queue.
3. **Service Bus ➜ Runner-Controller** – The Runner-Controller Azure App Service continuously listens to the queue. Based on settings stored in Azure App Configuration it decides whether to spin up a new runner or rely on the warm-pool.
4. **Runner-Controller ➜ Azure VM** – When a new runner is required the controller:
   • Fetches the latest Packer-built image from an Azure Shared Image Gallery.  
   • Retrieves a one-time registration token from GitHub, storing it in the Registration Key Vault.  
   • Creates a spot/on-demand VM, injecting the token via cloud-init so the VM registers itself with GitHub on first boot.
5. **Runner lifecycle** – The VM processes exactly one job, then a shutdown hook notifies the controller which de-registers the runner and deletes the VM, keeping the warm-pool at the desired size.
6. **Secrets & config** – GitHub App credentials and webhook secret live in the App Key Vault; operational parameters are stored in Azure App Configuration. All resources use Managed Identities for least-privilege access.
7. **Provisioning** – This entire architecture is provisioned reproducibly by the Terraform module contained in this repository.


## Components

### Terraform Module
This [Terraform](https://www.terraform.io/) module generates the infrastructure required to host the applications that will manage the self-hosted runners.

### Event-Handler (Azure Function App)
The event-handler will receive messages from the GitHub App during workflow run events.  It will act as a filter to ensure they are from GitHub with labels that match what is provided in the module.

### Runner-Controller (Azure App Service)
This application will act as the controller for the warm pool and ensure that the pool size adheres to the parameters specified in the Terraform module. It consumes Service Bus messages to create or delete VMs so that a healthy number of runners are always ready to process workflow jobs.

### Service Bus (Azure Service Bus)
A reliable message queue that buffers `workflow_job` events between the Event-Handler and Runner-Controller, ensuring no job is lost and enabling smooth scale-out.

### App Configuration (Azure App Configuration)
Central store for runtime settings such as warm-pool size, VM SKU, image version, and spot/on-demand preferences. Runner-Controller reads these values on startup and on a configurable interval.

### App Key Vault (Azure Key Vault)
Holds long-lived secrets used by the Event-Handler and Runner-Controller (GitHub App private key, webhook secret, etc.). Accessed via Managed Identity with the minimum required permissions.

### Registration Key Vault (Azure Key Vault)
Stores the short-lived registration tokens generated by Runner-Controller. Each token is valid for a single VM and is deleted once the runner registers with GitHub.

### Shared Image Gallery
Contains HashiCorp Packer-built VM images pre-loaded with the toolchain your organization needs. Runner-Controller always provisions the latest image version.


## Getting Started

### Pre-requisites
- GitHub App for Organization (owner access)
- Azure
  - Subscription
    - *Note: Subscription quota for "Total Regional Spot vCPUs" should be increased to allow multiple spot instances*
  - Resource Group
  - Subnet with internet access
  - KeyVault for GitHub App Credential
  - Service Principal Roles/Permissions
    - `Microsoft.AppConfiguration/locations/deletedConfigurationStores/read` (Needed until closure of [issue #19605 in hashicorp/terraform-provider-azurerm](https://github.com/hashicorp/terraform-provider-azurerm/issues/19605))
  - Resource Provider Registration (See [here](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/azure_cli#registering-the-resource-provider) for steps to register the resource provider)
    - `Microsoft.AppConfiguration`
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
| GitHub App Name                         | {insert-name}        |
| Homepage URL                            | {insert-any-url}     |
| Webhook Active                          | False                |
| Webhook URL                             |                      |
| Subscribe to events*                     | Workflow job         |
| Where can this GitHub App be installed? | Only on this account |

*Note: You will need one GitHub App per org. Allowing installation to "Any account" makes it difficult to change access if installed on orgs outside your control.
*Note: Initially the webhook is disabled, but will be enabled in the next step. You will only see 'Subscribed to events' after the webhook is enabled.
#### **Add secrets to Azure KeyVault**

(optional) Set Key Vault name variable:

```bash
export KEYVAULT_NAME=<keyvault-name>
```

Runner Password:

```bash
az keyvault secret set --name azure-runner-default-password --value $(uuidgen) --vault-name $KEYVAULT_NAME
```

GitHub Client Secret:

```bash
az keyvault secret set --name github-client-secret --vault-name $KEYVAULT_NAME --value <secret-value>
```

GitHub Private Key:

```bash
az keyvault secret set --name github-private-key --encoding utf-8 --vault-name $KEYVAULT_NAME --file <location/pem>
```

Webhook Secret:

```bash
az keyvault secret set --name github-webhook-secret --value $(uuidgen) --vault-name $KEYVAULT_NAME
```

*Note: The private key must be added via the [AZ CLI](https://learn.microsoft.com/en-us/cli/azure/), all other secrets can be added manually via the portal if you choose to do so.*

> **Key Vault authorization models**
>
> • If your Key Vault was created with **RBAC authorization** (`enableRbacAuthorization = true` or `az keyvault create --enable-rbac-authorization true`), you must grant the **Key Vault Secrets Officer** (or Administrator) role to **both** the Event-Handler Function **and** the Runner-Controller App Service managed identities. Terraform cannot assign this role unless you opt into the upcoming RBAC support variable.
>
> • If your vault uses the older **access-policy model** (`enableRbacAuthorization = false`, the module default), Terraform will automatically create an access policy that lets the Function and Controller read secrets.
>
> **Default behaviour:** The Azure portal and recent versions of the Azure CLI (*az* ≥ 2.51) create Key Vaults with **RBAC enabled by default**. In contrast, the Terraform `azurerm_key_vault` resource keeps **RBAC disabled by default**—you must set `enable_rbac_authorization = true` to opt-in. Keep this in mind when mixing manual and IaC-provisioned environments.


### Setup Terraform Module

Below is a **minimal working example** you can copy-paste into a new `main.tf`. Replace the placeholder values with your own IDs.

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.100"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = ">= 2.45"
    }
  }
}

provider "azurerm" {
  features {}
  tenant_id       = "00000000-0000-0000-0000-000000000000" # Azure AD tenant
  subscription_id = "11111111-1111-1111-1111-111111111111" # Azure subscription
}

provider "azuread" {}

module "github_runners" {
  source  = "git::https://github.com/liatrio/terraform-azure-github-runner.git?ref=vX.Y.Z" # pin a release tag

  # ---- Azure settings ----
  azure_tenant_id                  = "00000000-0000-0000-0000-000000000000"
  azure_subscription_id            = "11111111-1111-1111-1111-111111111111"
  azure_resource_group_name        = "rg-github-runners"
  azure_resource_group_location    = "eastus"
  azure_subnet_id                  = "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/vnet-github-runners/subnets/subnet-runners"

  # ---- GitHub App details ----
  github_organization   = "my-org"
  github_app_id         = "123456"
  github_client_id      = "Iv1.abcdef123456"
  github_installation_id = "7891011"

  # ---- Key Vault secret IDs (Key Vault *ID* not value) ----
  azure_secrets_key_vault_resource_id          = "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/kv-gh-secrets"
  azure_runner_default_password_key_vault_id   = "/.../secrets/azure-runner-default-password"
  github_client_secret_key_vault_id            = "/.../secrets/github-client-secret"
  github_webhook_secret_key_vault_id           = "/.../secrets/github-webhook-secret"
  github_private_key_key_vault_id              = "/.../secrets/github-private-key"

  # ---- Misc ----
  owners = ["00000000-0000-0000-0000-000000000000"] # Azure AD object IDs
}

output "function_webhook_url" {
  value       = module.github_runners.function_webhook_url
  description = "URL to paste into the GitHub App webhook settings"
  sensitive   = true
}
```

Run Terraform:

```bash
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

After `terraform apply` completes, run:

```bash
terraform output -raw function_webhook_url
```

This returns **the full Azure Function URL**, including a `?code=` query-string.  Copy the **entire string** – the `code` value is the Function *host key* and must stay in the URL.

You will also need the **GitHub webhook secret** that you stored in Key Vault earlier:

```bash
az keyvault secret show \
  --vault-name <your-kv-name> \
  --name github-webhook-secret \
  --query value -o tsv
```

Keep both values handy for the next step.

### Deploy Function App and App Service

This terraform module is set up by default to use the latest version of both apps and deploy them on `terraform apply`.  Specific versions found in our public [GitHub Packages](https://github.com/orgs/liatrio/packages?repo_name=terraform-azure-github-runner) and set in the terraform module inputs.  If you choose to publish your own images, functionality to do so will be implemented soon™.

### Configure the GitHub App webhook and install the app

In the GitHub UI navigate to **Settings → Developer settings → GitHub Apps → _Your App_** and:

1. **Activate** the webhook toggle.
2. **Webhook URL** – paste the Function URL you copied from `terraform output` (it already contains the `code` host key).
3. **Webhook secret** – paste the value of `github-webhook-secret` you retrieved from Key Vault.
4. **Save**.
5. Open **Install App**, select the gear icon next to your organization, under 'Repository access' select 'All repositories' and click **Save**.

The system is now wired together: GitHub sends signed workflow-job events to your Function, the Function enqueues work, and the Runner Controller spins up VMs on demand.

## Required Inputs

 Below are the required inputs required to get started with this module.  Some may be marked with an asterisk (*) which indicates we recommend you pull this from a data source.  Examples of usage are coming soon.

| Name | Description | Type |
|------|-------------|------|
| <a name="azure_tenant_id"></a> [azure\_tenant\_id](#azure\_tenant\_id) | Azure tenant ID | `string` |
| <a name="azure_subscription_id"></a> [azure\_subscription\_id](#azure\_subscription\_id) | Azure subscription ID | `string` |
| <a name="azure_resource_group_name"></a> [azure\_resource\_group\_name](#azure\_resource\_group\_name) | Resource Group that the components and runners will be created within | `string` |
| <a name="azure_subnet_id"></a> [azure\_subnet\_id](#azure\_subnet\_id) | Azure subnet ID | `string` |
| <a name="name_suffix"></a> [name\_suffix](#name\_suffix) | Identifying suffix that will be appended to all components created by this module (default: `null`) | `string` |
| <a name="github_organization"></a> [github\_organization](#github\_organization) | GitHub organization | `string` |
| <a name="github_app_id"></a> [github\_app\_id](#github\_app\_id) | GitHub App ID | `string` |
| <a name="github_client_id"></a> [github\_client\_id](#github\_client\_id) | GitHub Client ID | `string` |
| <a name="github_installation_id"></a> [github\_installation\_id](#github\_installation\_id) | GitHub App installation ID | `string` |
| <a name="azure_secrets_key_vault_resource_id"></a> [azure\_secrets\_key\_vault\_resource\_id](#azure\_secrets\_key\_vault\_resource\_id) | Key Vault ID where GitHub secrets are stored | `string` |
| <a name="azure_runner_default_password_key_vault_id"></a> *[azure\_runner\_default\_password\_key\_vault\_id](#azure\_runner\_default\_password\_key\_vault\_id) | Key Vault ID for Azure runner default password ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret))| `string` |
| <a name="github_client_secret_key_vault_id"></a> *[github\_client\_secret\_key\_vault\_id](#github\_client\_secret\_key\_vault\_id) | Keyvault Vault ID for GitHub App client secret ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| <a name="github_webhook_secret_key_vault_id"></a> *[github\_webhook\_secret\_key\_vault\_id](#github\_webhook\_secret\_key\_vault\_id) | Keyvault Vault ID for GitHub App webhook secret ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| <a name="github_private_key_key_vault_id"></a> *[github\_private\_key\_key\_vault\_id](#github\_private\_key\_key\_vault\_id) | Keyvault Vault ID for GitHub App private key ([data source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret)) | `string` |
| <a name="owners"></a> *[owners](#owners) | The list of owners that will be assigned to all components ([data source](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/users)) | `list(string)` |

## Optional Inputs

One goal of this module is to minimize the number of customizations needed in order to run autoscaling self-hosted runners.  With this being said, this list of optional inputs will grow but hopefully not so much that it becomes difficult to manage and get started with this solution.

| Name                                                                                                         | Description                                                                                                                                                         | Type | Default                                                                                                              |
|:-------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|------|----------------------------------------------------------------------------------------------------------------------|
| <a name="github_repository"></a> [github\_repository](#github\_repository) | GitHub repository for repository specific runners. If blank runners will be created for the organization. | `string` |
| <a name="log_level"></a> [log\_level](#log\_level)                                                           | Log level used across applications                                                                                                                                  | `string` | Information                                                                                                          |
| <a name="azure_gallery_image_id"></a> [azure\_gallery\_image\_id](#azure\_gallery\_image\_id)                | Azure Compute Gallery image ID to be used in runner creation, leave default to use `latest` Liatrio public image                                                    | `string` | /communityGalleries/liatrio-4e8ffc8d-5950-4137-b02c-df028384cdcd<br />/images/ubuntu_gh_runner<br />/versions/latest |
| <a name="azure_gallery_image_type"></a> [azure\_gallery\_image\_type](#azure\_gallery\_image\_type)          | Azure Compute Gallery image type to be used in runner creation. Available options: 'community', 'direct-shared', 'rbac'                                             | `string` | community                                                                                                            |
| <a name="event_handler_image_tag"></a> [event\_handler\_image\_tag](#event\_handler\_image\_tag)             | Event-Handler image tag to use from [GitHub Packages](https://github.com/liatrio/terraform-azure-github-runner/pkgs/container/github-webhook-runner-controller)     | `string` | latest                                                                                                               |
| <a name="runner_controller_image_tag"></a> [runner\_controller\_image\_tag](#runner\_controller\_image\_tag) | Runner-Controller image tag to use from [GitHub Packages](https://github.com/liatrio/terraform-azure-github-runner/pkgs/container/github-webhook-runner-controller) | `string` | latest                                                                                                               |
| <a name="github_runner_group"></a> [github\_runner\_group](#github\_runner\_group)                           | Runner Group to register runners to                                                                                                                                 | `string` | Default                                                                                                              |
| <a name="tags"></a> [tags](#tags)                           | Map of tags that will be added to created resources                                                                                                                             | `map(string)` | {}                                                                                                             |
| <a name="azure_location"></a> [azure_location](#azure_location)                           | Azure location in which to create resources                         | `string` | location of the resource group