import getpass
import requests
from tapipy.tapis import Tapis

username = input("Enter your Tapis username: ")
password = getpass.getpass("Enter your Tapis password: ")

tapis = Tapis(
    base_url="https://designsafe.tapis.io", username=username, password=password
)
tapis.get_tokens()
tapis_jwt = tapis.access_token.access_token


# Image from "PRJ-3379 | GEER - Marshall Fire, Colorado" project on DesignSafe
# https://www.designsafe-ci.org/data/browser/public/designsafe.storage.published/PRJ-3379/%2FPRJ-3379%2FRApp%2Fuwrapid%2FHome?doi=10.17603/ds2-garb-1n48
inference_request = {
    "files": [
        {
            "systemId": "designsafe.storage.published",
            "path": "/PRJ-3379/RApp/uwrapid/Home/Photo 1642618419.jpg",
        }
    ]
}

headers = {"Content-Type": "application/json", "X-Tapis-Token": tapis_jwt}

# Using local imageinf but could be changed to deployed imageinf
IMAGEINF_URL = "http://localhost:8080/inference/sync"

response = requests.post(IMAGEINF_URL, headers=headers, json=inference_request)

try:
    print("Response JSON:", response.json())
except Exception:
    print("Response Text:", response.text)
