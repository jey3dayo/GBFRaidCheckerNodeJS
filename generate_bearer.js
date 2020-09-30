const fetch = require('node-fetch');
const { execSync } = require('child_process');
const { USER_CONSUMER_KEY, USER_CONSUMER_SECRET } = process.env;

/**
 * BearerToken Generater
 * consumer_key, consumer_secret から アプリケーション認証に必要なbearerトークンを取得する
 */

const getAccessToken = async () => {
  const basic = new Buffer.from(USER_CONSUMER_KEY + ':' + USER_CONSUMER_SECRET).toString('base64');
  var data = new URLSearchParams({ grant_type: 'client_credentials' });
  const options = {
    method: 'POST',
    headers: {
      grant_type: 'client_credentials',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + basic,
    },
    body: data,
  };

  const res = await fetch('https://api.twitter.com/oauth2/token', options);
  const accessToken = await res.json().then(v => v.access_token);
  console.log(accessToken);
};

getAccessToken();
