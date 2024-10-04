const { getSecretValue, getParameterValue } = require('./config/secretsManager');

// Test fetching a parameter and a secret
(async () => {
  try {
    const qutUsername = await getParameterValue('/n11725605/QUT_USERNAME');
    console.log('QUT Username:', qutUsername);

    const secretValue = await getSecretValue('n11725605-assignment2-latest');
    console.log('Secret Value:', secretValue);
  } catch (error) {
    console.error('Error fetching parameter or secret:', error);
  }
})();
