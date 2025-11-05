// Test file for Secret Detection: AWS API Key
// This file contains a fake AWS access key that should be detected by Gitleaks
// Expected: Pipeline should FAIL with critical severity finding

const AWS = require('aws-sdk');

// SECURITY ISSUE: Hardcoded AWS credentials (fake but realistic pattern)
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

// Initialize AWS S3 client with hardcoded credentials
const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});

// Upload file to S3
async function uploadFile(filePath, bucketName) {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: bucketName,
    Key: path.basename(filePath),
    Body: fileContent
  };

  return s3.upload(params).promise();
}

module.exports = { uploadFile };
