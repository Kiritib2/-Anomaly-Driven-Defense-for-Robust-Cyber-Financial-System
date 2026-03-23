"""
Convenience script to run both frontend and backend servers.
Usage: python run.py
"""
import subprocess
import sys
import os
import time


def main():
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

    print("=" * 60)
    print("  Cyber Fraud Intelligence Platform")
    print("=" * 60)
    print()

    # Start backend
    print("🚀 Starting Backend (FastAPI) at http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
    )

    time.sleep(2)

    # Start frontend
    print("🚀 Starting Frontend (Vite) at http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_dir,
        shell=True,
    )

    print()
    print("✅ Both servers starting...")
    print("   Backend:  http://localhost:8000")
    print("   Frontend: http://localhost:5173")
    print("   API Docs: http://localhost:8000/docs")
    print()
    print("Press Ctrl+C to stop both servers.")
    print()

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        backend_proc.terminate()
        frontend_proc.terminate()


if __name__ == "__main__":
    main()
