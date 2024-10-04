
// server/config/secretsManager.js
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
// const { fromIni } = require('@aws-sdk/credential-provider-ini');  // Add this line
const { fromSSO } = require('@aws-sdk/credential-provider-sso');  // Use fromSSO to get SSO credentials


// Function to retrieve secret from AWS Secrets Manager
async function getSecretValue(secretName) {
  const client = new SecretsManagerClient({
    region: 'ap-southeast-2',
    credentials: fromSSO({ profile: 'default' })  // Use your SSO profile here
  });

  try {
    const response = await client.send(new GetSecretValueCommand({
      SecretId: secretName,
    }));

    if (response.SecretString) {
      console.log(`Secret fetched successfully for: ${secretName}`);
      return JSON.parse(response.SecretString);
    } else {
      throw new Error('Failed to retrieve secret. SecretString is empty.');
    }
  } catch (error) {
    console.error(`Error retrieving secret [${secretName}]:`, error);
    throw error;
  }
}

// Function to retrieve parameter from AWS Systems Manager (SSM) Parameter Store
async function getParameterValue(parameterName) {
  const client = new SSMClient({
    region: 'ap-southeast-2',
    credentials: fromSSO({ profile: 'default' })  // Use your SSO profile here
  });

        try {
    console.log(`Fetching parameter: ${parameterName}`);
    const response = await client.send(new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,  // Ensure decryption of sensitive parameters
    }));

    if (response.Parameter && response.Parameter.Value) {
      console.log(`Parameter fetched successfully: ${parameterName}`);
      return response.Parameter.Value;
    } else {
      throw new Error(`Failed to retrieve parameter: ${parameterName}`);
    }
  } catch (error) {
    console.error(`Error fetching parameter [${parameterName}]:`, error);
    throw error;
  }
}


module.exports = { getSecretValue, getParameterValue };
