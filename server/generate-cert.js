const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certHost = process.env.LOCAL_HTTPS_HOST || 'localhost';
const certDays = Number(process.env.LOCAL_HTTPS_DAYS || 365);
const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(certHost);

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = String(Date.now());
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + certDays);

const attrs = [
  { name: 'commonName', value: certHost },
  { name: 'countryName', value: 'VN' },
  { shortName: 'ST', value: 'HCM' },
  { name: 'localityName', value: 'HCM' },
  { name: 'organizationName', value: 'OnlineClass Local Dev' }
];

const altNames = [
  { type: 2, value: 'localhost' },
  { type: 7, ip: '127.0.0.1' }
];

if (isIpAddress) {
  altNames.push({ type: 7, ip: certHost });
} else {
  altNames.push({ type: 2, value: certHost });
}

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  { name: 'basicConstraints', cA: false },
  { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
  { name: 'extKeyUsage', serverAuth: true },
  { name: 'subjectAltName', altNames }
]);

cert.sign(keys.privateKey, forge.md.sha256.create());

const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

fs.writeFileSync(path.join(certsDir, 'cert.pem'), certPem);
fs.writeFileSync(path.join(certsDir, 'key.pem'), keyPem);

console.log('SSL certificates generated successfully.');
console.log(`Host: ${certHost}`);
console.log(`Expires in: ${certDays} days`);
console.log('Files created:');
console.log('- certs/cert.pem');
console.log('- certs/key.pem');
