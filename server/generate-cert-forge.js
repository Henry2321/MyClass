const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

// Tạo key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Tạo certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
  name: 'commonName',
  value: '26.140.16.205'
}, {
  name: 'countryName',
  value: 'VN'
}, {
  name: 'stateOrProvinceName',
  value: 'HCM'
}, {
  name: 'localityName',
  value: 'HCM'
}, {
  name: 'organizationName',
  value: 'Dev'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Self-sign certificate
cert.sign(keys.privateKey);

// Convert to PEM format
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

// Tạo thư mục certs
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Ghi files
fs.writeFileSync(path.join(certsDir, 'cert.pem'), certPem);
fs.writeFileSync(path.join(certsDir, 'key.pem'), keyPem);

console.log('SSL certificates created successfully!');
console.log('Files:');
console.log('- certs/cert.pem');
console.log('- certs/key.pem');