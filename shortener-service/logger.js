// logger.js
const axios = require('axios');

const CLIENT_ID     = '37c3a1ff-f1ca-4fe6-861c-6eec2e234f3f';
const CLIENT_SECRET = 'dNHFFcPyZcGBEwmV';
const AUTH_URL      = 'http://20.244.56.144/evaluation-service/auth';
const LOG_URL       = 'http://20.244.56.144/evaluation-service/logs';

let token = null;

async function authenticate() {
  if (token) return token;
  const { data } = await axios.post(AUTH_URL, {
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET
  });
  token = data.access_token;
  return token;
}

async function Log(stack, level, pkg, message) {
  if (!['backend','frontend'].includes(stack))   return;
  if (!['debug','info','warn','error','fatal'].includes(level)) return;
  if (![
    'cache','controller','cron_job','db','domain',
    'handler','repository','route','service'
  ].includes(pkg)) return;

  await authenticate();
  await axios
    .post(LOG_URL, { stack, level, package: pkg, message }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .catch(e => console.error('Log failed:', e.response?.data || e.message));
}

module.exports = Log;
