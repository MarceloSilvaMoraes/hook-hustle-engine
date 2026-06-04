import json
import os

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]

CLIENT_SECRETS_FILE = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRETS", "client_secret.json")


def build_flow_from_values(client_id: str, client_secret: str):
    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
        }
    }
    return InstalledAppFlow.from_client_config(client_config, SCOPES)


def main() -> None:
    if os.path.exists(CLIENT_SECRETS_FILE):
        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
    else:
        client_id = os.environ.get("GOOGLE_CLIENT_ID") or input("Cole o Client ID do OAuth do Google: ").strip()
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET") or input("Cole o Client Secret do OAuth do Google: ").strip()
        if not client_id or not client_secret:
            print("Credenciais do Google não encontradas.")
            print("1) Crie um OAuth Client no Google Cloud Console.")
            print("2) Baixe o JSON ou copie Client ID e Client Secret.")
            print("3) Execute novamente: py youtube_auth.py")
            return
        flow = build_flow_from_values(client_id, client_secret)

    credentials = flow.run_local_server(port=0)

    print("\nCopie estes valores para o seu .env:\n")
    print(f"YOUTUBE_CLIENT_ID={credentials.client_id}")
    print(f"YOUTUBE_CLIENT_SECRET={credentials.client_secret}")
    print(f"YOUTUBE_REFRESH_TOKEN={credentials.refresh_token}")
    print("\nYOUTUBE_AUTO_PUBLISH=true")
    print("YOUTUBE_PRIVACY_STATUS=private")


if __name__ == "__main__":
    main()
