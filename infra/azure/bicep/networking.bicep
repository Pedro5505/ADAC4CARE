param location string
param projectName string
param environmentName string

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: '${projectName}-${environmentName}-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.40.0.0/16'] }
    subnets: [
      { name: 'apps', properties: { addressPrefix: '10.40.1.0/24', delegations: [{ name: 'web', properties: { serviceName: 'Microsoft.Web/serverFarms' } }] } }
      { name: 'data', properties: { addressPrefix: '10.40.2.0/24', delegations: [{ name: 'postgres', properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' } }] } }
    ]
  }
}
