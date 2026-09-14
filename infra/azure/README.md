# Azure deployment

The Bicep template provisions an Australian-region baseline: App Service plans and apps for the frontend and API, PostgreSQL Flexible Server, Application Insights, and Key Vault. Review SKU sizing, networking, private endpoints, backups, geo-redundancy, and organisation policy before production.

Deploy from the repository root with Azure CLI after authenticating:

```sh
az deployment sub create --location australiaeast --template-file infra/azure/bicep/main.bicep --parameters environmentName=dev
```

The deployment workflow expects Azure federated identity credentials and secrets to be configured in GitHub Environments. Do not store publish profiles, database passwords, or application secrets in the repository.
