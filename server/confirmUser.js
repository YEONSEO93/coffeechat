const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-southeast-2' }); // 지역 설정

const cognito = new AWS.CognitoIdentityServiceProvider();

const params = {
  UserPoolId: 'ap-southeast-2_V3WpJeTI8', // 사용자 풀 ID
  Username: 'sssyyn94@gmail.com' // 확인할 사용자 이름
};

cognito.adminConfirmSignUp(params, function(err, data) {
  if (err) {
    console.log('Error confirming sign up:', err);
  } else {
    console.log('User confirmed successfully:', data);
  }
});