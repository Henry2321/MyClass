const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const attrs = [
  { name: 'commonName', value: '26.140.16.205' },
  { name: 'countryName', value: 'VN' },
  { name: 'stateOrProvinceName', value: 'HCM' },
  { name: 'localityName', value: 'HCM' },
  { name: 'organizationName', value: 'Dev' }
];

const options = {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256'
};

const pems = selfsigned.generate(attrs, options);

// Tạo thư mục certs nếu chưa có
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Ghi certificate và private key
fs.writeFileSync(path.join(certsDir, 'cert.pem'), pems.cert || '');
fs.writeFileSync(path.join(certsDir, 'key.pem'), pems.private || '');

console.log('SSL certificates generated successfully!');
console.log('Certificate:', pems.cert ? 'Generated' : 'Failed');
console.log('Private key:', pems.private ? 'Generated' : 'Failed');
console.log('Files created:');
console.log('- certs/cert.pem');
console.log('- certs/key.pem');