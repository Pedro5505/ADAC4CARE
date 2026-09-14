param environmentName string
param location string
param projectName string
param suffix string
@secure()
param administratorPassword string

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${projectName}-${environmentName}-pg-${suffix}'
  location: location
  sku: { name: environmentName == 'prod' ? 'Standard_D2ds_v5' : 'Standard_B1ms', tier: environmentName == 'prod' ? 'GeneralPurpose' : 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: 'adacadmin'
    administratorLoginPassword: administratorPassword
    storage: { storageSizeGB: environmentName == 'prod' ? 128 : 32 }
    backup: { backupRetentionDays: environmentName == 'prod' ? 35 : 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: environmentName == 'prod' ? 'ZoneRedundant' : 'Disabled' }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: 'adac4care'
}

output serverName string = server.name
