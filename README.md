# Terraform Azure GitHub Runners (self-hosted)
This project includes all necessary components to spin up the infrastructure for VM based GitHub self-hosted runners.  This project was created with some inspiration from the [Philips Lab AWS Solution](https://github.com/philips-labs/terraform-aws-github-runner) with some opinionated changes on what our team at [Liatrio](https://www.liatrio.com/) has seen work well across different enterprises.  

#### **These patterns include:**
- *Ephemeral Only* 
  - Runners should only run one job to avoid interference from one workflow run to the next
- *Warm Pool by Default* 
  - Keeping idle runners on is a must to ensure quick feedback loops
- *Custom Images*
  - Images should be able to build *most* apps in organization without additional tool installation ([example](packer/README.md)) ← TODO
  - Including necessary tools in VM Image to reduce startup time for *most* builds
- *Security*
  - Runner VMs are granted a single use registration token with no additional access to GitHub
  - Application can only interact with resources created in the Resource Group managed by this module

## Diagram
![Terraform Azure GitHub Runners](https://user-images.githubusercontent.com/47790839/187289724-ee54ccdf-898b-43b0-82bd-4ded9dd9f5a1.png)

## Components

### Terraform Module
This [Terraform](https://www.terraform.io/) module generates the infrastructure required to host the applications that will manage the self-hosted runners.

### Applications (a & b)

#### App A
This application will serve as a filter for events being published from GitHub that are not intended to use these self-hosted runners and will process valid events to a Service Bus queue.

#### App B
This application will act as the controller for the warm pool and ensure that the pool size adheres to the parameters specified in the Terraform module.  It will consume events from the queue as necessary to create VMs and ensure a healthy number of VMs are always ready to process new workflow jobs.

### Packer Custom Image
This [Packer](https://www.packer.io/) template automates the creation of a shared image that is referenced by the Terraform module for use in Runner VM creation.  *Another image can be used if desired.*

## Getting Started

### Pre-requisites
- GitHub App for Organization (owner access)
- Azure
  - Subscription
  - Resource Group
  - Subnet with internet access
  - KeyVault for GitHub App Credential
  - *optional* - Managed Image Id accessible by App B

### Create Custom Image (optional)
Referencing the Packer Template repo, create an image and publish it to [Azure Compute Gallery](https://docs.microsoft.com/en-us/azure/virtual-machines/azure-compute-gallery).

### Create GitHub App
The GitHub App serves as the foundation for sending webhook events to App A and retrieving registration tokens to store in Azure Key Vault.

1) Navigate: Settings → Developer Settings → GitHub Apps → New GitHub App
2) Configure permissions
3) Configure settings, webhook settings will need to be changed later
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

*Note: You will need one GitHub App per org and allowing installation to "Any account" makes it near impossible to change access if installed on orgs outside your control.

<br></br>
### Deploy Terraform Infrastructure

Should this be deployed from local first or action first?  🐓 🐣 🥚 problem

### Deploy App with or separate from Terraform??


