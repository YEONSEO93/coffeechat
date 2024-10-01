const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");

// Initialize the Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION
});

// Function to sign up a user
async function signUpUser(username, password, email) {
    try {
        const signUpCommand = new SignUpCommand({
            ClientId: process.env.COGNITO_CLIENT_ID,
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
        const confirmCommand = new ConfirmSignUpCommand({
            ClientId: process.env.COGNITO_CLIENT_ID,
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
        const authCommand = new InitiateAuthCommand({
            ClientId: process.env.COGNITO_CLIENT_ID,
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
