# Test file for SAST: Insecure Cryptography
# Feature: 002-gitlab-security-pipeline
# Purpose: Test Semgrep detection of weak cryptographic functions
# Expected: MEDIUM/HIGH severity findings - Weak hashing and encryption algorithms

import hashlib
import random
from Crypto.Cipher import DES, ARC4
from Crypto.Hash import MD5, SHA1

# VULNERABLE: Using MD5 for password hashing
# Semgrep Rule: python.lang.security.audit.insecure-hash-function
def hash_password_md5(password):
    """
    ❌ UNSAFE: MD5 is cryptographically broken and unsuitable for password hashing
    Vulnerable to collision attacks and rainbow table attacks
    """
    return hashlib.md5(password.encode()).hexdigest()

# VULNERABLE: Using SHA1 for password hashing
# Semgrep Rule: python.lang.security.audit.insecure-hash-function
def hash_password_sha1(password):
    """
    ❌ UNSAFE: SHA1 is deprecated and vulnerable to collision attacks
    Not suitable for password hashing (lacks salt and key stretching)
    """
    return hashlib.sha1(password.encode()).hexdigest()

# VULNERABLE: Using DES encryption (weak 56-bit key)
# Semgrep Rule: python.lang.security.audit.insecure-cipher-algorithm
def encrypt_data_des(data, key):
    """
    ❌ UNSAFE: DES uses 56-bit keys, easily broken by modern hardware
    Deprecated by NIST in 2005
    """
    cipher = DES.new(key[:8], DES.MODE_ECB)
    padded_data = data + ' ' * (8 - len(data) % 8)
    return cipher.encrypt(padded_data.encode())

# VULNERABLE: Using RC4/ARC4 stream cipher
# Semgrep Rule: python.lang.security.audit.insecure-cipher-algorithm
def encrypt_data_rc4(data, key):
    """
    ❌ UNSAFE: RC4 has known biases and vulnerabilities (BEAST, CRIME attacks)
    Prohibited by RFC 7465 (2015)
    """
    cipher = ARC4.new(key)
    return cipher.encrypt(data.encode())

# VULNERABLE: Weak random number generation for security
# Semgrep Rule: python.lang.security.audit.insecure-random
def generate_session_token():
    """
    ❌ UNSAFE: random module is not cryptographically secure
    Predictable random numbers can compromise security tokens
    """
    return ''.join([str(random.randint(0, 9)) for _ in range(32)])

# VULNERABLE: Hardcoded cryptographic key
# Semgrep Rule: python.lang.security.audit.hardcoded-password
SECRET_KEY = "my_secret_key_12345"  # ❌ UNSAFE: Hardcoded key in source code
API_TOKEN = "ghp_1234567890abcdef"  # ❌ UNSAFE: Hardcoded API token

def encrypt_with_hardcoded_key(data):
    """
    ❌ UNSAFE: Using hardcoded key compromises all encrypted data
    """
    cipher = ARC4.new(SECRET_KEY.encode())
    return cipher.encrypt(data.encode())

# Example Attack Scenarios:
# - MD5/SHA1: Rainbow table attacks reveal passwords in seconds
# - DES: Can be broken in hours with consumer hardware
# - RC4: BEAST attack can decrypt HTTPS traffic
# - Weak random: Session token prediction leads to account takeover
# - Hardcoded keys: Source code leak exposes all encrypted data

# Expected SAST Findings:
# - CWE-327: Use of a Broken or Risky Cryptographic Algorithm (MD5, SHA1, DES, RC4)
# - CWE-330: Use of Insufficiently Random Values (random module)
# - CWE-798: Use of Hard-coded Credentials (SECRET_KEY, API_TOKEN)
# - Severity: MEDIUM to HIGH
# - Locations: Lines 13, 22, 32, 42, 52, 59-60

# SECURE Alternatives (for reference):
# 1. Password Hashing:
#    import bcrypt
#    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
#
# 2. Encryption:
#    from Crypto.Cipher import AES
#    from Crypto.Random import get_random_bytes
#    key = get_random_bytes(32)  # AES-256
#    cipher = AES.new(key, AES.MODE_GCM)
#
# 3. Random Token Generation:
#    import secrets
#    token = secrets.token_urlsafe(32)
#
# 4. Key Management:
#    import os
#    SECRET_KEY = os.environ['SECRET_KEY']  # Load from environment variable

if __name__ == "__main__":
    # Demo vulnerable functions
    print(f"MD5 hash: {hash_password_md5('password123')}")
    print(f"Session token: {generate_session_token()}")
