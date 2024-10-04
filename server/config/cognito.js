

const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { getSecretValue, getParameterValue } = require('./config/secretsManager'); // Import the helper functions to fetch secrets

// Function to initialize the Cognito client with the region from Parameter Store
async function initializeCognitoClient() {
    const region = await getParameterValue('/n11725605/AWS_REGION'); // Use AWS Parameter Store for the region
    return new CognitoIdentityProviderClient({ region });
}

// Function to sign up a user
async function signUpUser(username, password, email) {
    try {
        const cognitoClient = await initializeCognitoClient(); // Initialize Cognito client
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID'); // Fetch Cognito Client ID

        const signUpCommand = new SignUpCommand({
            ClientId: clientId,
            Username: username,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email }
            ]
        });

        const response = await cognitoClient.send(signUpCommand);
        console.log("Signup successful:", response);
        return response;
    } catch (error) {
        console.error("Error signing up user:", error);
        throw error;
    }
}

// Function to confirm a user's sign-up using the confirmation code
async function confirmUser(username, confirmationCode) {
    try {
        const cognitoClient = await initializeCognitoClient(); // Initialize Cognito client
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID'); // Fetch Cognito Client ID

        const confirmCommand = new ConfirmSignUpCommand({
            ClientId: clientId,
            Username: username,
            ConfirmationCode: confirmationCode
        });

        const response = await cognitoClient.send(confirmCommand);
        console.log("Confirmation successful:", response);
        return response;
    } catch (error) {
        console.error("Error confirming user:", error);
        throw error;
    }
}

// Function to log in a user and authenticate using their credentials
async function loginUser(username, password) {
    try {
        const cognitoClient = await initializeCognitoClient(); // Initialize Cognito client
        const clientId = await getParameterValue('/n11725605/COGNITO_CLIENT_ID'); // Fetch Cognito Client ID

        const authCommand = new InitiateAuthCommand({
            ClientId: clientId,
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password
            }
        });

        const response = await cognitoClient.send(authCommand);
        console.log("Login successful:", response.AuthenticationResult);
        return response.AuthenticationResult;
    } catch (error) {
        console.error("Error logging in user:", error);
        throw error;
    }
}

module.exports = {
    signUpUser,
    confirmUser,
    loginUser
};
