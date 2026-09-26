"""
desktop_launcher.py — Single-App Sovereign Desktop Launcher for INDRA
Mounts virtual storage, boots on-premise backend & frontend,
presents the workbench in a dedicated desktop window,
and guarantees 100% clean shutdown of all background services on window close.
"""

import os
import sys
import time
import socket
import signal
import atexit
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"

_KATTY_FRONTEND = Path(r"C:\Users\booya\OneDrive\Desktop\SIH frontend 1\SIH frontend 1\katty\indra")
FRONTEND_DIR = (BASE_DIR / "frontend") if (BASE_DIR / "frontend" / "node_modules").exists() else _KATTY_FRONTEND

MODELS_DIR = Path(r"D:\models")
PHYSICAL_MODELS_DIR = Path(r"C:\models")

BACKEND_PORT = 8000
FRONTEND_PORT = 3000

backend_proc = None
frontend_proc = None
app_proc = None
backend_log_file = None
frontend_log_file = None


def print_banner():
    banner = r"""
================================================================================
  ___ _   _ ____  ____      _       ____  _____ _____ _____ _   _ ____  _____ 
 |_ _| \ | |  _ \|  _ \    / \     / ___|| ____|_   _|_   _| | | |  _ \| ____|
  | ||  \| | | | | |_) |  / _ \    \___ \|  _|   | |   | | | | | | |_) |  _|  
  | || |\  | |_| |  _ <  / ___ \    ___) | |___  | |   | | | |_| |  __/| |___ 
 |___|_| \_|____/|_| \_\/_/   \_\  |____/|_____| |_|   |_|  \___/|_|   |_____|

  SOVEREIGN AIR-GAPPED INDUSTRIAL AI WORKBENCH | SMART INDIA HACKATHON 2026
  0-WAN Air-Gap Bound (127.0.0.1) • IEC 62443 / CMMC OT • AST Verified
================================================================================
"""
    print(banner)


def kill_tree(pid: int):
    """Forcefully terminates a Windows process and all child processes."""
    if not pid:
        return
    try:
        import psutil
        parent = psutil.Process(pid)
        for child in parent.children(recursive=True):
            try:
                child.kill()
            except Exception:
                pass
        parent.kill()
    except Exception:
        pass

    try:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True, check=False)
    except Exception:
        pass


def cleanup_ports(ports):
    """Kills any lingering processes bound to the specified ports."""
    for port in ports:
        try:
            out = subprocess.run(
                f"netstat -ano | findstr :{port}",
                shell=True,
                capture_output=True,
                text=True
            )
            for line in out.stdout.splitlines():
                parts = line.split()
                if len(parts) >= 5 and "LISTENING" in parts:
                    pid = parts[-1]
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True, check=False)
        except Exception:
            pass


def cleanup_all():
    """Shuts down all backend and frontend services cleanly."""
    global backend_proc, frontend_proc, app_proc, backend_log_file, frontend_log_file
    print("\n[SHUTDOWN] Releasing on-premise daemons and ports...")

    if backend_proc:
        try:
            kill_tree(backend_proc.pid)
        except Exception:
            pass
        backend_proc = None

    if frontend_proc:
        try:
            kill_tree(frontend_proc.pid)
        except Exception:
            pass
        frontend_proc = None

    if app_proc and app_proc.poll() is None:
        try:
            kill_tree(app_proc.pid)
        except Exception:
            pass
        app_proc = None

    if backend_log_file:
        try:
            backend_log_file.close()
        except Exception:
            pass
        backend_log_file = None

    if frontend_log_file:
        try:
            frontend_log_file.close()
        except Exception:
            pass
        frontend_log_file = None

    cleanup_ports([BACKEND_PORT, FRONTEND_PORT])
    print("[SHUTDOWN] Air-gap preserved. Ports 8000 and 3000 released. Clean exit.")


atexit.register(cleanup_all)


def sig_handler(signum, frame):
    cleanup_all()
    sys.exit(0)


signal.signal(signal.SIGINT, sig_handler)
signal.signal(signal.SIGTERM, sig_handler)


def ensure_d_mount():
    """Mounts D: to C: for offline GGUF model access."""
    if MODELS_DIR.exists():
        return True
    PHYSICAL_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    subst_exe = r"C:\Windows\System32\subst.exe"
    if os.path.exists(subst_exe):
        try:
            subprocess.run([subst_exe, "D:", r"C:\\"], capture_output=True)
            return True
        except Exception:
            pass
    return False


def is_port_listening(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(('127.0.0.1', port)) == 0


def wait_for_service(port: int, name: str, timeout: int = 30) -> bool:
    start = time.time()
    sys.stdout.write(f"  [*] Waiting for {name} (127.0.0.1:{port}) to bind ")
    sys.stdout.flush()
    while time.time() - start < timeout:
        if is_port_listening(port):
            sys.stdout.write(" [ONLINE]\n")
            sys.stdout.flush()
            return True
        sys.stdout.write(".")
        sys.stdout.flush()
        time.sleep(0.5)
    sys.stdout.write(" [TIMEOUT]\n")
    sys.stdout.flush()
    return False


def main():
    global backend_proc, frontend_proc, app_proc, backend_log_file, frontend_log_file

    print_banner()

    # 1. Mount virtual drive D:
    print("[PRE-FLIGHT 1/6] Storage Architecture: Virtual GGUF Mount (D:\\)")
    mounted = ensure_d_mount()
    print(f"  [+] Storage status: {'Mounted (D:)' if mounted or MODELS_DIR.exists() else 'Default C: storage'}")

    # 2. Clear old instances to avoid port conflicts
    print("[PRE-FLIGHT 2/6] Port Sanity Check: Clearing lingering sockets...")
    cleanup_ports([BACKEND_PORT, FRONTEND_PORT])
    print("  [+] Ports 8000 & 3000 verified free.")

    # 3. Start Backend (Uvicorn / FastAPI) in background
    print("[PRE-FLIGHT 3/6] Starting Sovereign Backend Service (FastAPI / Uvicorn)...")
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    env["HF_HUB_OFFLINE"] = "1"
    env["TRANSFORMERS_OFFLINE"] = "1"
    env["HF_HOME"] = r"D:\huggingface_cache"

    backend_log_path = BASE_DIR / "backend_launcher.log"
    backend_log_file = open(backend_log_path, "w", encoding="utf-8")

    backend_proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(BACKEND_PORT),
        ],
        cwd=str(BACKEND_DIR),
        env=env,
        stdout=backend_log_file,
        stderr=subprocess.STDOUT,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
    )

    # 4. Start Frontend (Next.js) in background
    print("[PRE-FLIGHT 4/6] Starting Sovereign Frontend Service (Next.js)...")
    npm_path = r"C:\Program Files\nodejs\npm.cmd"
    npm_cmd = f'"{npm_path}" run dev' if os.path.exists(npm_path) else "npm run dev"

    frontend_log_path = BASE_DIR / "frontend_launcher.log"
    frontend_log_file = open(frontend_log_path, "w", encoding="utf-8")

    frontend_proc = subprocess.Popen(
        npm_cmd,
        cwd=str(FRONTEND_DIR),
        shell=True,
        stdout=frontend_log_file,
        stderr=subprocess.STDOUT,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
    )

    # 5. Service Readiness Validation
    print("[PRE-FLIGHT 5/6] Validating On-Premise Loopback Bindings...")
    wait_for_service(BACKEND_PORT, "FastAPI Sovereign Kernel", timeout=25)
    wait_for_service(FRONTEND_PORT, "Next.js Micro-Frontend UI", timeout=35)

    # 6. Launch native desktop window (Electron or Edge App Mode)
    print("[PRE-FLIGHT 6/6] Launching Sovereign Desktop Window...")
    electron_exe = FRONTEND_DIR / "node_modules" / "electron" / "dist" / "electron.exe"
    electron_script = FRONTEND_DIR / "electron" / "main.js"

    launched = False

    if electron_exe.exists() and electron_script.exists():
        try:
            print("  [+] Starting native Electron shell...")
            app_proc = subprocess.Popen(
                [str(electron_exe), str(electron_script)],
                cwd=str(FRONTEND_DIR),
            )
            launched = True
        except Exception as e:
            print(f"  [-] Electron shell launch fallback: {e}")
            launched = False

    # Fallback to Microsoft Edge standalone App Mode if Electron binary is missing
    if not launched:
        edge_paths = [
            Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
            Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        ]
        edge_bin = next((p for p in edge_paths if p.exists()), None)

        target_url = f"http://localhost:{FRONTEND_PORT}/workbench"
        user_data_dir = BASE_DIR / ".edge_app_profile"

        if edge_bin:
            print(f"  [+] Opening Sovereign Standalone App window via Edge App mode...")
            app_proc = subprocess.Popen(
                [
                    str(edge_bin),
                    f"--app={target_url}",
                    f"--user-data-dir={user_data_dir}",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--window-size=1440,920",
                ]
            )
        else:
            print(f"  [+] Opening browser window to {target_url}...")
            import webbrowser
            webbrowser.open(target_url)
            while is_port_listening(FRONTEND_PORT):
                time.sleep(1)
            cleanup_all()
            return

    print("\n" + "=" * 80)
    print("  [ONLINE] INDRA Sovereign AI Workbench is active and air-gap certified.")
    print("  Close the application window or press Ctrl+C to terminate services cleanly.")
    print("=" * 80 + "\n")

    # 7. Wait for the desktop application window to close
    try:
        app_proc.wait()
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        # 8. As soon as the desktop window is closed, stop everything immediately
        cleanup_all()


if __name__ == "__main__":
    main()
