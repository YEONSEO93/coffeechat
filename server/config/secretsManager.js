const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { fromSSO } = require('@aws-sdk/credential-provider-sso');

// Function to retrieve secret from AWS Secrets Manager
async function getSecretValue(secretName) {
    const client = new SecretsManagerClient({
        region: 'ap-southeast-2',
        credentials: await fromSSO({ profile: 'default' })
    });

    try {
        const response = await client.send(new GetSecretValueCommand({
            SecretId: secretName,
            VersionStage: "AWSCURRENT"
        }));

        if (response.SecretString) {
            return JSON.parse(response.SecretString);
        } else {
            throw new Error('Failed to retrieve secret.');
        }
    } catch (error) {
        console.error("Error retrieving secret:", error);
        if (error.name === 'ExpiredTokenException') {
            console.log("Your token has expired. Please run 'aws sso login' to refresh.");
        }
        throw error;
    }
}

module.exports = { getSecretValue };
