
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { getParameterValue } = require('../config/secretsManager'); // Import the function to get values from Parameter Store

// Set up JWKS client
async function createJwksClient() {
    // Fetch JWKS URI from Parameter Store
    const jwksUri = await getParameterValue('/n11725605/JWKS_URI');

    return jwksClient({
        jwksUri: jwksUri,
    });
}

// Function to get the signing key
async function getKey(header, callback) {
    try {
        const client = await createJwksClient(); // Create JWKS client dynamically
        client.getSigningKey(header.kid, (err, key) => {
            if (err) {
                return callback(err, null);
            }
            const signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
        });
    } catch (err) {
        console.error('Error fetching JWKS signing key:', err);
        callback(err, null);
    }
}

// Middleware to ensure authentication
const ensureAuthenticated = async (req, res, next) => {
    const token = req.session.token;

    if (token) {
        // Decode the token to see the payload
        const decodedToken = jwt.decode(token, { complete: true });
        console.log('Decoded Token (before verification):', decodedToken);

        // Verify the token using RS256 and the correct signing key
        jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
            if (err) {
                console.log('Token verification failed or expired:', err.message);
                req.flash('error_msg', 'Session expired, please log in again');
                return res.redirect('/auth/login');
            }
            req.user = decoded; // Attach decoded user data to the request object
            next();
        });
    } else {
        console.log('No token found');
        req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/auth/login');
    }
};

module.exports = ensureAuthenticated;
