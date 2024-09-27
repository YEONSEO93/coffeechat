const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Set up JWKS client
const client = jwksClient({
    jwksUri: 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_V3WpJeTI8/.well-known/jwks.json'
});

// Function to get the signing key
function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}

const ensureAuthenticated = (req, res, next) => {
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
