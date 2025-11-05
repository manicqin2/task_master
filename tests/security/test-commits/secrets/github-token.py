# Test file for Secret Detection: GitHub Token
# This file contains a fake GitHub personal access token
# Expected: Pipeline should FAIL with critical severity finding

import requests

# SECURITY ISSUE: Hardcoded GitHub personal access token
GITHUB_TOKEN = "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"
GITHUB_API_URL = "https://api.github.com"

def create_github_issue(repo_owner, repo_name, title, body):
    """Create a GitHub issue using hardcoded credentials."""

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }

    url = f"{GITHUB_API_URL}/repos/{repo_owner}/{repo_name}/issues"
    data = {
        "title": title,
        "body": body
    }

    response = requests.post(url, headers=headers, json=data)
    return response.json()

def get_user_repos():
    """Fetch user repositories using hardcoded token."""

    headers = {
        "Authorization": f"token {GITHUB_TOKEN}"
    }

    response = requests.get(f"{GITHUB_API_URL}/user/repos", headers=headers)
    return response.json()

if __name__ == "__main__":
    repos = get_user_repos()
    print(f"Found {len(repos)} repositories")
