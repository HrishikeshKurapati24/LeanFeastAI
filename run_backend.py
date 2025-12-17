#!/usr/bin/env python3
"""
Script to run the LeanFeastAI backend server
"""
import subprocess
import sys
import os

def main():
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    
    # Install requirements if needed
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
    except subprocess.CalledProcessError:
        print("Failed to install requirements. Please install manually:")
        print("pip install -r backend/requirements.txt")
        return
    
    # Run the server
    try:
        subprocess.run([sys.executable, 'main.py'], check=True)
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except subprocess.CalledProcessError as e:
        print(f"Error running server: {e}")

if __name__ == "__main__":
    main()
