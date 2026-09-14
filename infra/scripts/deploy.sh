#!/usr/bin/env sh
set -eu
: "${ENVIRONMENT_NAME:?Set ENVIRONMENT_NAME to dev, staging, or prod}"
az deployment sub create --location australiaeast --template-file infra/azure/bicep/main.bicep --parameters environmentName="$ENVIRONMENT_NAME"
