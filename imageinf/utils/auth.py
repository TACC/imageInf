from fastapi import Header, HTTPException
import jwt
from typing import Dict, Any, Optional
from tapipy.tapis import Tapis
from tapipy.errors import BaseTapyException
from urllib.parse import urlparse
import logging
from pydantic import BaseModel

# Configure logging
logger = logging.getLogger(__name__)

# TODO consider just trusting *.tapis.io
ALLOWED_TAPIS_TENANTS: list = [
    "https://designsafe.tapis.io",
    "https://portals.tapis.io",
]


# Pydantic model for Tapis user data
class TapisUser(BaseModel):
    username: str
    tapis_token: str
    tenant_host: str


def _extract_tenant_from_token(token: str) -> Optional[str]:
    """
    Extract the issuer (i.e. tapis tenant host) from a JWT token without verifying it.
    This is used to determine which Tapis tenant to use for validation.

    NOTE: we are not verifying token here!  See _validate_tapis_token and
     `validate_token` from Tapis.

    raises HTTPException when unable to decode
    """
    try:
        # Decode the token without verification (just to get the issuer);
        # validation of token occurs elsewhere (using `validate_token` from tapipy)
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("iss")
    except Exception as e:
        logger.error(f"Failed to decode token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token: failed to decode")


def _validate_tapis_token(token: str) -> Dict[str, Any]:
    """Internal helper function to validate token and extract data"""
    try:
        # Extract the tenant base URL from the token
        issuer = _extract_tenant_from_token(token)
        if not issuer:
            logger.error("JWT token does not contain an issuer (iss) claim")
            raise HTTPException(
                status_code=401, detail="Invalid token: missing issuer claim"
            )

        parsed_url = urlparse(issuer)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        tenant_host = parsed_url.netloc

        if base_url not in ALLOWED_TAPIS_TENANTS:
            logger.error(f"Unauthorized Tapis tenant: {base_url}")
            raise HTTPException(status_code=401, detail="Unauthorized Tapis tenant")

        tapis_client = Tapis(base_url=base_url)
        validation_response = tapis_client.validate_token(token)

        # Extract username
        username = validation_response.get("tapis/username")
        if not username:
            logger.error("JWT token does not contain a username claim")
            raise HTTPException(
                status_code=401, detail="Invalid token: missing username"
            )
        return {
            "username": username,
            "tapis_token": token,
            "tenant_host": tenant_host,
            "tenant_id": validation_response.get("tapis/tenant_id"),
            "account_type": validation_response.get("tapis/account_type"),
            "tapis_client": tapis_client,
            "raw_validation": validation_response,
        }

    except BaseTapyException as e:
        logger.exception(f"Tapis token validation failed: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    except Exception as e:
        logger.exception(f"Error processing token: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


def get_tapis_user(x_tapis_token: Optional[str] = Header(None)):
    """
    Dependency that returns a TapisUser model with user information.
    """
    if not x_tapis_token:
        raise HTTPException(status_code=401, detail="Missing X-Tapis-Token")
    data = _validate_tapis_token(x_tapis_token)
    return TapisUser(
        username=data["username"],
        tapis_token=data["tapis_token"],
        tenant_host=data["tenant_host"],
    )
