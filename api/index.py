"""
Vercel Serverless Function Entrypoint
Routes requests to the Flask application for Vercel deployment.
"""

import os
import sys

# Ensure root and backend directories are on Python search path
CUR_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CUR_DIR, ".."))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

for directory in (BACKEND_DIR, ROOT_DIR):
    if directory not in sys.path:
        sys.path.insert(0, directory)

# Import the existing Flask app from backend/app.py
from backend.app import app

# Vercel's @vercel/python runtime automatically exposes the `app` WSGI instance
if __name__ == "__main__":
    app.run()
