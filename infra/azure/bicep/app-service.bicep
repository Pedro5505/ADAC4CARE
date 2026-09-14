param environmentName string
param location string
param projectName string
param suffix string

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${projectName}-${environmentName}-plan'
  location: location
  sku: { name: environmentName == 'prod' ? 'P1v3' : 'B1' }
  properties: { reserved: true }
}

resource api 'Microsoft.Web/sites@2024-04-01' = {
  name: '${projectName}-${environmentName}-api-${suffix}'
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: { linuxFxVersion: 'PYTHON|3.12', ftpsState: 'Disabled', minTlsVersion: '1.2' }
  }
}

resource frontend 'Microsoft.Web/sites@2024-04-01' = {
  name: '${projectName}-${environmentName}-web-${suffix}'
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: { linuxFxVersion: 'NODE|22-lts', ftpsState: 'Disabled', minTlsVersion: '1.2' }
  }
}

output apiName string = api.name
output frontendName string = frontend.name
