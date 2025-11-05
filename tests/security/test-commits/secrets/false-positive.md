# API Documentation - Authentication Guide

This document explains how to authenticate with our API using API keys.

## Example API Key Format

API keys follow this pattern:

```
EXAMPLE_API_KEY_1234567890abcdef
```

## How to Use Your API Key

1. Obtain your API key from the dashboard
2. Set it as an environment variable:

```bash
export API_KEY="your_actual_api_key_here"
```

3. Include it in your API requests:

```javascript
const headers = {
  'Authorization': `Bearer ${process.env.API_KEY}`
};
```

## Example Request

```bash
curl -H "Authorization: Bearer EXAMPLE_API_KEY" \
  https://api.example.com/v1/data
```

## Important Notes

- **Never** commit your actual API key to git
- Always use environment variables
- The example key "EXAMPLE_API_KEY" shown above is not a real key
- Keys starting with "EXAMPLE_" are placeholders only

## Valid Key Formats

- Production keys: `prod_key_[alphanumeric]`
- Development keys: `dev_key_[alphanumeric]`
- Test keys: `test_key_[alphanumeric]`

## Security Best Practices

1. Use environment variables for secrets
2. Rotate keys regularly
3. Use different keys for different environments
4. Example placeholder: `AKIAIOSFODNN7EXAMPLE` (not a real AWS key)
