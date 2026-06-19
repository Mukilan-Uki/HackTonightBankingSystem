const http = require('http');
const data = JSON.stringify({
  username: 'testuser',
  fullName: 'Test User',
  branch: 'Main',
  email: 'test@example.test',
  password: 'testpass',
});
const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk });
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log(body);
  });
});
req.on('error', (e) => {
  console.error('request error', e);
});
req.write(data);
req.end();
