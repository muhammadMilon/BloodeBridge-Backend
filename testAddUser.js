const fetch = require('node-fetch');
(async () => {
  const res = await fetch('http://localhost:5001/add-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testgender2@example.com',
      password: 'test1234',
      name: 'Test Gender2',
      gender: 'female'
    })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
})();
