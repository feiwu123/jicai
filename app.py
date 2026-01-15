import os

from backend.server import run


if __name__ == "__main__":
    host = os.getenv("PICAI_HOST", "127.0.0.1")
    port = int(os.getenv("PICAI_PORT", "8000"))
    run(host=host, port=port)
