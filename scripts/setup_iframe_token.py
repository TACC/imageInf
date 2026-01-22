#!/usr/bin/env python3
"""
Setup JWT token for iframe testing by authenticating with Tapis.
Writes the token to .env.iframe file.

"""

import getpass
from pathlib import Path

try:
    from tapipy.tapis import Tapis
except ImportError:
    print(
        "Error: tapipy not found. "
        "Make sure you're running this in the imageinf container."
    )
    exit(1)


TAPIS_SITES = {
    "1": {"name": "DesignSafe", "url": "https://designsafe.tapis.io"},
    "2": {"name": "Portals", "url": "https://portals.tapis.io"},
}


def main():
    print("=== ImageInf iframe Test Token Setup ===\n")

    # Prompt for Tapis site
    print("Select Tapis site:")
    for key, site in TAPIS_SITES.items():
        print(f"  {key}) {site['name']} ({site['url']})")

    site_choice = input("\nEnter choice (1-2): ").strip()

    if site_choice not in TAPIS_SITES:
        print("Invalid choice. Exiting.")
        exit(1)

    base_url = TAPIS_SITES[site_choice]["url"]
    site_name = TAPIS_SITES[site_choice]["name"]

    print(f"\nUsing {site_name} ({base_url})")

    # Prompt for credentials
    username = input("\nUsername: ")
    password = getpass.getpass("Password: ")

    print(f"\nAuthenticating with {site_name}...")

    try:
        # Authenticate with Tapis
        t = Tapis(base_url=base_url, username=username, password=password)
        t.get_tokens()

        jwt_token = t.access_token.access_token

        print("✓ Authentication successful!")

        # Write to .env.iframe file
        env_file = Path("/app/.env.iframe")
        env_file.write_text(f"JWT_TOKEN={jwt_token}\n")

        print(f"\n✓ Token written to {env_file}")
        print("\nYou can now run: make start-iframe-cep-test-simulation")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nAuthentication failed. Please check your credentials and try again.")
        exit(1)


if __name__ == "__main__":
    main()
