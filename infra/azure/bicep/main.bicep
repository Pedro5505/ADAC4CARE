targetScope = 'subscription'

@allowed(['dev', 'staging', 'prod'])
param environmentName string
param location string = 'australiaeast'
param projectName string = 'adac4care'
@secure()
param postgresAdminPassword string

var suffix = uniqueString(subscription().id, environmentName)
var resourceGroupName = '${projectName}-${environmentName}-rg'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module appService 'app-service.bicep' = {
  name: 'app-service'
  scope: rg
  params: { environmentName: environmentName, location: location, projectName: projectName, suffix: suffix }
}

module postgres 'postgres.bicep' = {
  name: 'postgres'
  scope: rg
  params: { environmentName: environmentName, location: location, projectName: projectName, suffix: suffix, administratorPassword: postgresAdminPassword }
}

module networking 'networking.bicep' = {
  name: 'networking'
  scope: rg
  params: { location: location, projectName: projectName, environmentName: environmentName }
}
