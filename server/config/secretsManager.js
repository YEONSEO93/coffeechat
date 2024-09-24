// const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// async function getSecretValue(secretName) {
//     const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

//     try {
//         const response = await client.send(new GetSecretValueCommand({
//             SecretId: secretName,
//             VersionStage: "AWSCURRENT",
//         }));
//         if (response.SecretString) {
//             return JSON.parse(response.SecretString);
//         } else {
//             throw new Error('No secret string found');
//         }
//     } catch (error) {
//         console.error("Secrets Manager Error:", error);
//         throw error;
//     }
// }

// module.exports = {
//     getSecretValue,
// };


const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecretValue(secretName) {
    try {
        const response = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        if (response.SecretString) {
            const secret = JSON.parse(response.SecretString);
            console.log("Secrets Manager returned credentials:", secret); // 자격 증명 확인을 위한 출력
            return secret;
        } else {
            throw new Error('No secret string found');
        }
    } catch (error) {
        console.error("Secrets Manager Error:", error.message);  // 오류 메시지 출력
        console.error("Stack trace:", error.stack);  // 오류의 자세한 내용 출력
        throw error;
    }
}

module.exports = { getSecretValue };
