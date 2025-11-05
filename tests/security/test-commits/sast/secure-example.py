# Test file for SAST: Secure Code Example
# Feature: 002-gitlab-security-pipeline
# Purpose: Verify SAST doesn't produce false positives on secure code
# Expected: PASS - No security vulnerabilities detected

import os
import secrets
import bcrypt
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import PBKDF2

# ✅ SECURE: Using bcrypt for password hashing
def hash_password_secure(password: str) -> bytes:
    """
    Securely hash password using bcrypt with automatic salt generation.
    bcrypt includes salt and uses key stretching to resist brute-force attacks.
    """
    salt = bcrypt.gensalt(rounds=12)  # 12 rounds = good balance of security/performance
    return bcrypt.hashpw(password.encode(), salt)

def verify_password(password: str, hashed: bytes) -> bool:
    """
    Securely verify password against bcrypt hash.
    """
    return bcrypt.checkpw(password.encode(), hashed)

# ✅ SECURE: Using AES-256-GCM for encryption
def encrypt_data_secure(plaintext: str, master_key: bytes) -> tuple:
    """
    Securely encrypt data using AES-256 in GCM mode (authenticated encryption).
    GCM mode provides both confidentiality and integrity protection.
    """
    # Derive encryption key from master key
    salt = get_random_bytes(16)
    key = PBKDF2(master_key, salt, dkLen=32, count=100000)

    # Encrypt with AES-256-GCM
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode())

    return (ciphertext, cipher.nonce, tag, salt)

def decrypt_data_secure(ciphertext: bytes, nonce: bytes, tag: bytes, salt: bytes, master_key: bytes) -> str:
    """
    Securely decrypt AES-256-GCM encrypted data.
    """
    # Derive same encryption key
    key = PBKDF2(master_key, salt, dkLen=32, count=100000)

    # Decrypt and verify integrity
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)

    return plaintext.decode()

# ✅ SECURE: Using secrets module for cryptographically secure random tokens
def generate_session_token_secure() -> str:
    """
    Generate cryptographically secure random session token.
    secrets module uses os.urandom() which is suitable for security purposes.
    """
    return secrets.token_urlsafe(32)  # 32 bytes = 256 bits of entropy

def generate_api_key_secure() -> str:
    """
    Generate cryptographically secure API key.
    """
    return secrets.token_hex(32)  # 32 bytes = 64 hex characters

# ✅ SECURE: Load secrets from environment variables
def get_database_credentials() -> dict:
    """
    Load sensitive credentials from environment variables, not hardcoded values.
    """
    return {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'username': os.environ.get('DB_USERNAME'),
        'password': os.environ.get('DB_PASSWORD'),
        'database': os.environ.get('DB_NAME')
    }

# ✅ SECURE: Key management with proper storage
class SecureKeyManager:
    """
    Secure key manager that loads keys from environment or secure key storage.
    Never hardcodes keys in source code.
    """
    def __init__(self):
        self.master_key = self._load_master_key()

    def _load_master_key(self) -> bytes:
        """
        Load master key from environment variable or secure key management system.
        In production, use AWS KMS, HashiCorp Vault, or similar.
        """
        key_hex = os.environ.get('MASTER_ENCRYPTION_KEY')
        if not key_hex:
            raise ValueError("MASTER_ENCRYPTION_KEY environment variable not set")
        return bytes.fromhex(key_hex)

    def encrypt(self, data: str) -> tuple:
        """Encrypt data using the master key."""
        return encrypt_data_secure(data, self.master_key)

    def decrypt(self, ciphertext: bytes, nonce: bytes, tag: bytes, salt: bytes) -> str:
        """Decrypt data using the master key."""
        return decrypt_data_secure(ciphertext, nonce, tag, salt, self.master_key)

# Example usage demonstrating secure practices
if __name__ == "__main__":
    # Secure password hashing
    password = "user_password_123"
    hashed = hash_password_secure(password)
    is_valid = verify_password(password, hashed)
    print(f"Password verification: {is_valid}")

    # Secure token generation
    session_token = generate_session_token_secure()
    print(f"Session token length: {len(session_token)} characters")

    # Secure encryption (requires MASTER_ENCRYPTION_KEY environment variable)
    try:
        key_manager = SecureKeyManager()
        encrypted = key_manager.encrypt("Sensitive data")
        print("Data encrypted successfully")
    except ValueError as e:
        print(f"Key management: {e}")

# Expected SAST Results:
# - No security vulnerabilities detected
# - No warnings for weak cryptography
# - No warnings for hardcoded secrets
# - Clean bill of health ✅
