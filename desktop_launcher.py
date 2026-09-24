"""
desktop_launcher.py — Sovereign AI Workbench Desktop Control Center
Native Windows GUI for managing backend (FastAPI :8000), frontend (Next.js :3000),
virtual drive D:\\models mapping, and continuous dual-repository sync monitoring:
1. Main Project: https://github.com/prushidhar/SIH260117
2. Frontend Project: https://github.com/undrajavarapukatherine-crypto/katty.git
"""

import os
import sys
import json
import time
import socket
import urllib.request
import urllib.error
import subprocess
import threading
import webbrowser
import shutil
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

# Enable High-DPI awareness on Windows
try:
    import ctypes
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
# Live frontend with node_modules (katty/indra). Falls back to repo copy if missing.
_KATTY_FRONTEND = Path(r"C:\Users\booya\OneDrive\Desktop\SIH frontend 1\SIH frontend 1\katty\indra")
FRONTEND_DIR = _KATTY_FRONTEND if (_KATTY_FRONTEND / "node_modules").exists() else BASE_DIR / "frontend"
CONFIG_FILE = BASE_DIR / "launcher_config.json"
MODELS_DIR = Path(r"D:\models")
PHYSICAL_MODELS_DIR = Path(r"C:\models")

DEFAULT_CONFIG = {
    "main_repo_url": "https://github.com/prushidhar/SIH260117.git",
    "katty_repo_url": "https://github.com/undrajavarapukatherine-crypto/katty.git",
    "github_token": "",
    "auto_sync_interval_sec": 60,
    "backend_port": 8000,
    "frontend_port": 3000,
    "auto_open_browser": True,
    "main_last_sha": "",
    "katty_last_sha": ""
}

def load_config():
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                merged = DEFAULT_CONFIG.copy()
                merged.update(cfg)
                return merged
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"Error saving config: {e}")


def check_port(port: int) -> bool:
    """Returns True if the port is open and listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex(('127.0.0.1', port)) == 0


def kill_process_tree(pid: int):
    """Forcefully terminates a Windows process and all child processes."""
    try:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
    except Exception:
        pass


def is_node_installed():
    try:
        res = subprocess.run(["node", "-v"], capture_output=True, text=True, shell=True)
        return res.returncode == 0, res.stdout.strip()
    except Exception:
        return False, ""


def ensure_d_mount():
    """Ensures D:\\models exists by executing subst D: C:\\ if needed."""
    if MODELS_DIR.exists():
        return True, "D:\\models is mounted and accessible"
    PHYSICAL_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run("cmd /c subst D: C:\\", shell=True, capture_output=True)
        if MODELS_DIR.exists():
            return True, "Successfully mapped D: -> C:\\ (subst active)"
    except Exception as e:
        return False, f"Failed to mount D: drive: {e}"
    return MODELS_DIR.exists(), "D:\\models exists" if MODELS_DIR.exists() else "D: drive could not be mapped"


class WorkbenchLauncher(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("INDRA — Sovereign AI Workbench Desktop Control")
        self.geometry("1020x800")
        self.minsize(880, 680)
        self.configure(bg="#0B0F19")

        self.cfg = load_config()
        self.backend_proc = None
        self.frontend_proc = None
        self.is_monitoring = True
        self.repo_poll_thread = None
        self.health_thread = None

        self._setup_theme()
        self._build_ui()
        self._check_system_prereqs()

        # Start continuous repo monitoring daemon
        self.repo_poll_thread = threading.Thread(target=self._continuous_repo_watcher, daemon=True)
        self.repo_poll_thread.start()

        # Start health check loop
        self.health_thread = threading.Thread(target=self._health_check_loop, daemon=True)
        self.health_thread.start()

        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _setup_theme(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        # Palette
        self.c_bg = "#0B0F19"
        self.c_card = "#161F30"
        self.c_card_border = "#223048"
        self.c_text = "#F1F5F9"
        self.c_muted = "#94A3B8"
        self.c_green = "#10B981"
        self.c_amber = "#F59E0B"
        self.c_red = "#EF4444"
        self.c_blue = "#0284C7"

        style.configure("TFrame", background=self.c_bg)
        style.configure("Card.TFrame", background=self.c_card, relief="flat")
        style.configure("TNotebook", background=self.c_bg, borderwidth=0)
        style.configure("TNotebook.Tab", background="#1E293B", foreground=self.c_text, padding=[12, 6])
        style.map("TNotebook.Tab", background=[("selected", self.c_blue)], foreground=[("selected", "#FFFFFF")])

    def _build_ui(self):
        # 1. Top Header Banner
        header = tk.Frame(self, bg=self.c_bg, pady=12, padx=20)
        header.pack(fill="x")

        title_box = tk.Frame(header, bg=self.c_bg)
        title_box.pack(side="left")

        title_lbl = tk.Label(
            title_box, text="⚡ SOVEREIGN AI WORKBENCH", font=("Segoe UI", 16, "bold"),
            fg=self.c_text, bg=self.c_bg
        )
        title_lbl.pack(anchor="w")

        sub_lbl = tk.Label(
            title_box, text="INDRA · Air-Gapped Multi-Model Engine · Dual-Repo Auto-Sync",
            font=("Segoe UI", 9), fg=self.c_muted, bg=self.c_bg
        )
        sub_lbl.pack(anchor="w")

        # Quick Status Indicators in Header
        self.hdr_status_box = tk.Frame(header, bg=self.c_bg)
        self.hdr_status_box.pack(side="right")

        self.mount_badge = tk.Label(
            self.hdr_status_box, text="● D:\\models: Checking...", font=("Segoe UI", 9, "bold"),
            fg=self.c_amber, bg="#1E293B", padx=8, pady=4
        )
        self.mount_badge.pack(side="left", padx=4)

        self.bk_badge = tk.Label(
            self.hdr_status_box, text="● Backend: Stopped", font=("Segoe UI", 9, "bold"),
            fg=self.c_red, bg="#1E293B", padx=8, pady=4
        )
        self.bk_badge.pack(side="left", padx=4)

        self.fe_badge = tk.Label(
            self.hdr_status_box, text="● Frontend: Stopped", font=("Segoe UI", 9, "bold"),
            fg=self.c_red, bg="#1E293B", padx=8, pady=4
        )
        self.fe_badge.pack(side="left", padx=4)

        # 2. Main Action Control Card
        ctrl_card = tk.Frame(self, bg=self.c_card, highlightbackground=self.c_card_border, highlightthickness=1, padx=16, pady=14)
        ctrl_card.pack(fill="x", padx=20, pady=(0, 10))

        ctrl_title = tk.Label(ctrl_card, text="SERVICE CONTROLS", font=("Segoe UI", 10, "bold"), fg=self.c_muted, bg=self.c_card)
        ctrl_title.pack(anchor="w", pady=(0, 10))

        btn_row = tk.Frame(ctrl_card, bg=self.c_card)
        btn_row.pack(fill="x")

        self.btn_launch = tk.Button(
            btn_row, text="🚀 LAUNCH WORKBENCH", font=("Segoe UI", 11, "bold"),
            bg=self.c_green, fg="#FFFFFF", activebackground="#059669", activeforeground="#FFFFFF",
            relief="flat", padx=16, pady=8, cursor="hand2", command=self.launch_all
        )
        self.btn_launch.pack(side="left", padx=(0, 10))

        self.btn_stop = tk.Button(
            btn_row, text="⏹ STOP ALL", font=("Segoe UI", 11, "bold"),
            bg="#334155", fg="#FFFFFF", activebackground=self.c_red, activeforeground="#FFFFFF",
            relief="flat", padx=14, pady=8, cursor="hand2", command=self.stop_all, state="disabled"
        )
        self.btn_stop.pack(side="left", padx=(0, 10))

        self.btn_browser = tk.Button(
            btn_row, text="🌐 Open Web UI (:3000)", font=("Segoe UI", 10),
            bg=self.c_blue, fg="#FFFFFF", activebackground="#0369A1", activeforeground="#FFFFFF",
            relief="flat", padx=12, pady=8, cursor="hand2", command=self.open_browser
        )
        self.btn_browser.pack(side="left", padx=(0, 10))

        self.btn_mount = tk.Button(
            btn_row, text="💾 Remount D: Drive", font=("Segoe UI", 10),
            bg="#1E293B", fg=self.c_text, activebackground="#334155", activeforeground="#FFFFFF",
            relief="flat", padx=12, pady=8, cursor="hand2", command=self.remount_d_drive
        )
        self.btn_mount.pack(side="left", padx=(0, 10))

        self.lbl_server_info = tk.Label(
            ctrl_card, text="Ready to start services. Ports: Backend 8000 · Frontend 3000",
            font=("Segoe UI", 9), fg=self.c_muted, bg=self.c_card
        )
        self.lbl_server_info.pack(anchor="w", pady=(10, 0))

        # 3. Continuous Dual-Repo Monitor Card
        repo_card = tk.Frame(self, bg=self.c_card, highlightbackground=self.c_card_border, highlightthickness=1, padx=16, pady=12)
        repo_card.pack(fill="x", padx=20, pady=(0, 10))

        repo_header_row = tk.Frame(repo_card, bg=self.c_card)
        repo_header_row.pack(fill="x", pady=(0, 8))

        repo_title = tk.Label(repo_header_row, text="CONTINUOUS REPOSITORY MONITOR & SYNC", font=("Segoe UI", 10, "bold"), fg=self.c_muted, bg=self.c_card)
        repo_title.pack(side="left")

        self.lbl_poll_timer = tk.Label(repo_header_row, text="Auto-checking every 60s", font=("Segoe UI", 8, "italic"), fg=self.c_muted, bg=self.c_card)
        self.lbl_poll_timer.pack(side="left", padx=12)

        btn_check_all = tk.Button(
            repo_header_row, text="🔄 Check Now", font=("Segoe UI", 8, "bold"),
            bg="#1E293B", fg=self.c_text, relief="flat", padx=8, pady=3, cursor="hand2", command=self.trigger_manual_repo_check
        )
        btn_check_all.pack(side="right")

        btn_set_token = tk.Button(
            repo_header_row, text="🔑 GitHub Token", font=("Segoe UI", 8),
            bg="#1E293B", fg=self.c_text, relief="flat", padx=8, pady=3, cursor="hand2", command=self.prompt_github_token
        )
        btn_set_token.pack(side="right", padx=(0, 6))

        # Two subcards for the 2 repos
        repo_subcards = tk.Frame(repo_card, bg=self.c_card)
        repo_subcards.pack(fill="x")

        # Repo 1: Main Project
        card_main = tk.Frame(repo_subcards, bg="#0F172A", highlightbackground=self.c_card_border, highlightthickness=1, padx=12, pady=10)
        card_main.pack(side="left", fill="both", expand=True, padx=(0, 6))

        tk.Label(card_main, text="Main Project: prushidhar/SIH260117", font=("Segoe UI", 9, "bold"), fg=self.c_text, bg="#0F172A").pack(anchor="w")
        self.lbl_main_status = tk.Label(card_main, text="● Checking repository...", font=("Segoe UI", 8), fg=self.c_amber, bg="#0F172A")
        self.lbl_main_status.pack(anchor="w", pady=(2, 0))

        self.lbl_main_commit = tk.Label(card_main, text="Latest: —", font=("Segoe UI", 8), fg=self.c_muted, bg="#0F172A", wraplength=420, justify="left")
        self.lbl_main_commit.pack(anchor="w", pady=(2, 6))

        btn_sync_main = tk.Button(
            card_main, text="⬇️ Pull / Sync Main Repo", font=("Segoe UI", 8, "bold"),
            bg="#1E293B", fg=self.c_text, relief="flat", padx=8, pady=3, cursor="hand2", command=self.sync_main_repo
        )
        btn_sync_main.pack(anchor="w")

        # Repo 2: Katty Frontend
        card_katty = tk.Frame(repo_subcards, bg="#0F172A", highlightbackground=self.c_card_border, highlightthickness=1, padx=12, pady=10)
        card_katty.pack(side="left", fill="both", expand=True, padx=(6, 0))

        tk.Label(card_katty, text="Frontend: undrajavarapukatherine-crypto/katty", font=("Segoe UI", 9, "bold"), fg=self.c_text, bg="#0F172A").pack(anchor="w")
        self.lbl_katty_status = tk.Label(card_katty, text="● Checking repository...", font=("Segoe UI", 8), fg=self.c_amber, bg="#0F172A")
        self.lbl_katty_status.pack(anchor="w", pady=(2, 0))

        self.lbl_katty_commit = tk.Label(card_katty, text="Latest: —", font=("Segoe UI", 8), fg=self.c_muted, bg="#0F172A", wraplength=420, justify="left")
        self.lbl_katty_commit.pack(anchor="w", pady=(2, 6))

        btn_sync_katty = tk.Button(
            card_katty, text="⬇️ Pull / Sync Katty Frontend", font=("Segoe UI", 8, "bold"),
            bg=self.c_blue, fg="#FFFFFF", relief="flat", padx=8, pady=3, cursor="hand2", command=self.sync_katty_repo
        )
        btn_sync_katty.pack(anchor="w")

        # 4. Live Console Logs (Tabbed)
        log_frame = tk.Frame(self, bg=self.c_bg, padx=20)
        log_frame.pack(fill="both", expand=True, pady=(0, 10))

        self.notebook = ttk.Notebook(log_frame)
        self.notebook.pack(fill="both", expand=True)

        self.txt_all = self._create_log_widget(self.notebook, "All Logs")
        self.txt_backend = self._create_log_widget(self.notebook, "Backend (:8000)")
        self.txt_frontend = self._create_log_widget(self.notebook, "Frontend (:3000)")
        self.txt_repo = self._create_log_widget(self.notebook, "Repo Sync Monitor")

        # 5. Bottom System Diagnostics Bar
        bottom_bar = tk.Frame(self, bg="#0F172A", padx=20, pady=8)
        bottom_bar.pack(fill="x", side="bottom")

        self.lbl_py_info = tk.Label(
            bottom_bar, text=f"Python: {sys.version.split()[0]}", font=("Segoe UI", 8),
            fg=self.c_muted, bg="#0F172A"
        )
        self.lbl_py_info.pack(side="left", padx=(0, 15))

        self.lbl_node_info = tk.Label(
            bottom_bar, text="Node.js: Checking...", font=("Segoe UI", 8),
            fg=self.c_amber, bg="#0F172A"
        )
        self.lbl_node_info.pack(side="left", padx=(0, 15))

        self.lbl_models_info = tk.Label(
            bottom_bar, text="Model Weights: Checking...", font=("Segoe UI", 8),
            fg=self.c_muted, bg="#0F172A"
        )
        self.lbl_models_info.pack(side="left")

        btn_clear_logs = tk.Button(
            bottom_bar, text="Clear Logs", font=("Segoe UI", 8),
            bg="#1E293B", fg=self.c_muted, relief="flat", padx=8, pady=1, cursor="hand2", command=self.clear_logs
        )
        btn_clear_logs.pack(side="right")

    def _create_log_widget(self, parent, tab_title):
        frame = ttk.Frame(parent)
        parent.add(frame, text=tab_title)

        txt = scrolledtext.ScrolledText(
            frame, bg="#070A11", fg="#E2E8F0", insertbackground="#FFFFFF",
            font=("Consolas", 9), relief="flat", borderwidth=0
        )
        txt.pack(fill="both", expand=True)

        txt.tag_config("info", foreground="#38BDF8")
        txt.tag_config("success", foreground="#34D399")
        txt.tag_config("warn", foreground="#FBBF24")
        txt.tag_config("error", foreground="#F87171")
        txt.tag_config("repo", foreground="#C084FC")
        return txt

    def log(self, message: str, tag: str = "info", target: str = "all"):
        def _write():
            timestamp = time.strftime("[%H:%M:%S] ")
            formatted = f"{timestamp}{message}\n"
            
            # Write to 'All' log
            self.txt_all.insert("end", formatted, tag)
            self.txt_all.see("end")

            if target == "backend":
                self.txt_backend.insert("end", formatted, tag)
                self.txt_backend.see("end")
            elif target == "frontend":
                self.txt_frontend.insert("end", formatted, tag)
                self.txt_frontend.see("end")
            elif target == "repo":
                self.txt_repo.insert("end", formatted, tag)
                self.txt_repo.see("end")

        self.after(0, _write)

    def clear_logs(self):
        for txt in [self.txt_all, self.txt_backend, self.txt_frontend, self.txt_repo]:
            txt.delete("1.0", "end")

    # --- System Prerequisite Checks ---
    def _check_system_prereqs(self):
        # 1. Check D: drive
        mounted, msg = ensure_d_mount()
        if mounted:
            self.mount_badge.config(text="● D:\\models: Mounted", fg=self.c_green)
            self.log("Virtual Drive D:\\models is mounted and accessible.", "success")
        else:
            self.mount_badge.config(text="● D:\\models: Missing", fg=self.c_red)
            self.log(f"Warning: {msg}", "warn")

        # 2. Check Node.js
        has_node, node_ver = is_node_installed()
        if has_node:
            self.lbl_node_info.config(text=f"Node.js: {node_ver}", fg=self.c_green)
            self.log(f"Detected {node_ver} for Next.js frontend.", "success")
        else:
            self.lbl_node_info.config(text="Node.js: Not Found in PATH", fg=self.c_amber)
            self.log("Notice: Node.js is not found in PATH. You will need Node.js (v20+) installed to launch the Next.js frontend Web UI.", "warn")

        # 3. Check downloaded models in D:\models
        if MODELS_DIR.exists():
            subdirs = [d.name for d in MODELS_DIR.iterdir() if d.is_dir() or d.name.endswith('.gguf')]
            self.lbl_models_info.config(text=f"Models in D:\\models: {len(subdirs)} folders/files found", fg=self.c_text)
            self.log(f"Models directory D:\\models ready with {len(subdirs)} model targets: {', '.join(subdirs) if subdirs else 'empty'}", "info")

    def remount_d_drive(self):
        mounted, msg = ensure_d_mount()
        if mounted:
            self.mount_badge.config(text="● D:\\models: Mounted", fg=self.c_green)
            self.log("D: drive remounted successfully: D:\\models -> C:\\models", "success")
            messagebox.showinfo("Drive Mount", "Virtual Drive D:\\models is successfully mounted via 'subst D: C:\\'.")
        else:
            self.mount_badge.config(text="● D:\\models: Error", fg=self.c_red)
            messagebox.showerror("Drive Mount Error", f"Could not mount D: drive: {msg}")

    # --- Service Lifecycle Management ---
    def launch_all(self):
        self.btn_launch.config(state="disabled")
        self.btn_stop.config(state="normal")
        self.lbl_server_info.config(text="Starting backend and frontend services...", fg=self.c_amber)

        # 1. Mount D: drive
        ensure_d_mount()

        # 2. Launch Backend
        threading.Thread(target=self._start_backend_thread, daemon=True).start()

        # 3. Launch Frontend
        threading.Thread(target=self._start_frontend_thread, daemon=True).start()

    def _start_backend_thread(self):
        port = self.cfg.get("backend_port", 8000)
        self.log(f"Initializing Backend server on port {port}...", "info", "backend")

        # Clean up existing port if in use
        if check_port(port):
            self.log(f"Port {port} is already active. Checking existing service...", "warn", "backend")

        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["HF_HUB_OFFLINE"] = "1"
        env["TRANSFORMERS_OFFLINE"] = "1"
        env["HF_HOME"] = r"D:\huggingface_cache"

        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", str(port)]
        try:
            self.backend_proc = subprocess.Popen(
                cmd, cwd=str(BACKEND_DIR), env=env,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
            )
            self.log(f"Backend process spawned (PID: {self.backend_proc.pid})", "success", "backend")
            self.bk_badge.config(text=f"● Backend: PID {self.backend_proc.pid}", fg=self.c_amber)

            for line in self.backend_proc.stdout:
                line_str = line.strip()
                if line_str:
                    tag = "error" if "error" in line_str.lower() else "info"
                    self.log(f"[Backend] {line_str}", tag, "backend")

            self.backend_proc.wait()
            self.bk_badge.config(text="● Backend: Stopped", fg=self.c_red)
            self.log("Backend process exited.", "warn", "backend")
        except Exception as e:
            self.log(f"Failed to start backend: {e}", "error", "backend")
            self.bk_badge.config(text="● Backend: Error", fg=self.c_red)

    def _start_frontend_thread(self):
        port = self.cfg.get("frontend_port", 3000)
        has_node, _ = is_node_installed()
        if not has_node:
            self.log("Cannot start frontend: Node.js is not installed. Please install Node.js (v20 LTS) to run the Next.js UI.", "error", "frontend")
            self.fe_badge.config(text="● Frontend: Node Missing", fg=self.c_amber)
            return

        self.log(f"Starting Next.js frontend on port {port}...", "info", "frontend")

        # Check if node_modules exists
        if not (FRONTEND_DIR / "node_modules").exists():
            self.log("Installing frontend dependencies (npm install)... this may take a couple minutes...", "warn", "frontend")
            p_install = subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), shell=True, capture_output=True, text=True)
            if p_install.returncode != 0:
                self.log(f"npm install error: {p_install.stderr[:300]}", "error", "frontend")

        cmd = "npm run dev"
        try:
            self.frontend_proc = subprocess.Popen(
                cmd, cwd=str(FRONTEND_DIR), shell=True,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1
            )
            self.log(f"Frontend process spawned (PID: {self.frontend_proc.pid})", "success", "frontend")
            self.fe_badge.config(text=f"● Frontend: PID {self.frontend_proc.pid}", fg=self.c_amber)

            for line in self.frontend_proc.stdout:
                line_str = line.strip()
                if line_str:
                    tag = "success" if "ready" in line_str.lower() or "localhost:3000" in line_str else "info"
                    self.log(f"[Frontend] {line_str}", tag, "frontend")

            self.frontend_proc.wait()
            self.fe_badge.config(text="● Frontend: Stopped", fg=self.c_red)
            self.log("Frontend process exited.", "warn", "frontend")
        except Exception as e:
            self.log(f"Failed to start frontend: {e}", "error", "frontend")
            self.fe_badge.config(text="● Frontend: Error", fg=self.c_red)

    def stop_all(self):
        self.log("Stopping all workbench processes...", "warn")
        if self.backend_proc:
            kill_process_tree(self.backend_proc.pid)
            self.backend_proc = None

        if self.frontend_proc:
            kill_process_tree(self.frontend_proc.pid)
            self.frontend_proc = None

        # Clean any remaining processes bound to 8000 or 3000
        self._cleanup_ports([self.cfg.get("backend_port", 8000), self.cfg.get("frontend_port", 3000)])

        self.btn_launch.config(state="normal")
        self.btn_stop.config(state="disabled")
        self.bk_badge.config(text="● Backend: Stopped", fg=self.c_red)
        self.fe_badge.config(text="● Frontend: Stopped", fg=self.c_red)
        self.lbl_server_info.config(text="All workbench services stopped.", fg=self.c_muted)
        self.log("All services cleanly terminated.", "success")

    def _cleanup_ports(self, ports):
        for port in ports:
            try:
                out = subprocess.run(f"netstat -ano | findstr :{port}", shell=True, capture_output=True, text=True)
                for line in out.stdout.splitlines():
                    parts = line.split()
                    if len(parts) >= 5 and "LISTENING" in parts:
                        pid = parts[-1]
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
            except Exception:
                pass

    def open_browser(self):
        port = self.cfg.get("frontend_port", 3000)
        webbrowser.open(f"http://localhost:{port}")

    def _health_check_loop(self):
        has_opened_browser = False
        while True:
            time.sleep(2.5)
            bk_port = self.cfg.get("backend_port", 8000)
            fe_port = self.cfg.get("frontend_port", 3000)

            bk_live = check_port(bk_port)
            fe_live = check_port(fe_port)

            def update_health_ui():
                if bk_live:
                    self.bk_badge.config(text=f"● Backend: Running (:{bk_port})", fg=self.c_green)
                elif not self.backend_proc:
                    self.bk_badge.config(text="● Backend: Stopped", fg=self.c_red)

                if fe_live:
                    self.fe_badge.config(text=f"● Frontend: Running (:{fe_port})", fg=self.c_green)
                elif not self.frontend_proc:
                    self.fe_badge.config(text="● Frontend: Stopped", fg=self.c_red)

                if bk_live and fe_live:
                    self.lbl_server_info.config(
                        text="● Sovereign AI Workbench is Online! (Backend :8000 · Frontend :3000)",
                        fg=self.c_green
                    )
                elif bk_live:
                    self.lbl_server_info.config(
                        text="Backend is Online (:8000). Waiting for Frontend (:3000)...",
                        fg=self.c_amber
                    )

            self.after(0, update_health_ui)

            if bk_live and fe_live:
                if not has_opened_browser and self.cfg.get("auto_open_browser", True):
                    has_opened_browser = True
                    self.open_browser()
            elif not self.backend_proc and not self.frontend_proc:
                has_opened_browser = False

    # --- Continuous Dual-Repository Watcher ---
    def _continuous_repo_watcher(self):
        """Continuously polls remote repos every N seconds."""
        time.sleep(2)  # Initial wait
        while self.is_monitoring:
            try:
                self._check_all_repos()
            except Exception as e:
                self.log(f"Repo monitoring error: {e}", "warn", "repo")

            interval = max(20, int(self.cfg.get("auto_sync_interval_sec", 60)))
            for _ in range(interval):
                if not self.is_monitoring:
                    return
                time.sleep(1)

    def trigger_manual_repo_check(self):
        threading.Thread(target=self._check_all_repos, daemon=True).start()

    def _check_all_repos(self):
        check_time = time.strftime("%H:%M:%S")
        self.lbl_poll_timer.config(text=f"Last checked: {check_time}")
        self.log(f"Checking remote repositories for updates ({check_time})...", "repo", "repo")

        # 1. Check Katty Frontend Repo (Public)
        self._check_katty_repo()

        # 2. Check Main Project Repo (Private / Restricted)
        self._check_main_repo()

    def _check_katty_repo(self):
        url = self.cfg.get("katty_repo_url", "https://github.com/undrajavarapukatherine-crypto/katty.git")
        token = self.cfg.get("github_token", "").strip()

        try:
            # Query GitHub API directly for detailed commit message and sha
            api_url = "https://api.github.com/repos/undrajavarapukatherine-crypto/katty/commits/main"
            req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})
            if token:
                req.add_header("Authorization", f"Bearer {token}")

            with urllib.request.urlopen(req, timeout=6) as response:
                data = json.loads(response.read().decode())
                sha = data.get("sha", "")[:8]
                msg = data.get("commit", {}).get("message", "").split("\n")[0]
                date_str = data.get("commit", {}).get("author", {}).get("date", "")

                last_sha = self.cfg.get("katty_last_sha", "")
                if not last_sha:
                    self.cfg["katty_last_sha"] = sha
                    save_config(self.cfg)
                    last_sha = sha

                def update_katty_ui():
                    self.lbl_katty_commit.config(text=f"Latest: {sha} — {msg}")
                    if sha != last_sha:
                        self.lbl_katty_status.config(text="● Update Available", fg=self.c_amber)
                    else:
                        self.lbl_katty_status.config(text="● Up-to-Date", fg=self.c_green)
                self.after(0, update_katty_ui)

                if sha != last_sha:
                    self.log(f"[Katty] New update available! Commit: {sha} ({msg})", "warn", "repo")
                else:
                    self.log(f"[Katty] Synchronized at commit {sha}.", "success", "repo")
                return
        except Exception:
            pass

        # Fallback to git ls-remote
        try:
            res = subprocess.run(
                ["git", "-c", "credential.helper=", "ls-remote", "-h", url],
                capture_output=True, text=True, timeout=6, env=dict(os.environ, GIT_TERMINAL_PROMPT="0")
            )
            if res.returncode == 0 and res.stdout:
                sha = res.stdout.split()[0][:8]
                last_sha = self.cfg.get("katty_last_sha", "")
                def update_katty_ls():
                    self.lbl_katty_commit.config(text=f"Latest SHA: {sha}")
                    if last_sha and sha != last_sha:
                        self.lbl_katty_status.config(text="● Update Available", fg=self.c_amber)
                    else:
                        self.lbl_katty_status.config(text="● Up-to-Date", fg=self.c_green)
                self.after(0, update_katty_ls)
                return
        except Exception as ex:
            self.after(0, lambda: self.lbl_katty_status.config(text=f"● Check Failed: {str(ex)[:20]}", fg=self.c_amber))

    def _check_main_repo(self):
        url = self.cfg.get("main_repo_url", "https://github.com/prushidhar/SIH260117.git")
        token = self.cfg.get("github_token", "").strip()

        # If token is provided, attempt GitHub API
        if token:
            try:
                api_url = "https://api.github.com/repos/prushidhar/SIH260117/commits/main"
                req = urllib.request.Request(api_url, headers={
                    "User-Agent": "Mozilla/5.0",
                    "Authorization": f"Bearer {token}"
                })
                with urllib.request.urlopen(req, timeout=6) as response:
                    data = json.loads(response.read().decode())
                    sha = data.get("sha", "")[:8]
                    msg = data.get("commit", {}).get("message", "").split("\n")[0]
                    last_sha = self.cfg.get("main_last_sha", "")

                    def update_main_api():
                        self.lbl_main_commit.config(text=f"Latest: {sha} — {msg}")
                        if sha != last_sha and last_sha:
                            self.lbl_main_status.config(text="● Update Available", fg=self.c_amber)
                        else:
                            self.lbl_main_status.config(text="● Up-to-Date", fg=self.c_green)
                    self.after(0, update_main_api)

                    if sha != last_sha and last_sha:
                        self.log(f"[Main Project] New commit on main: {sha} ({msg})", "warn", "repo")
                    else:
                        self.log(f"[Main Project] Synchronized at commit {sha}.", "success", "repo")
                    return
            except urllib.error.HTTPError as he:
                if he.code in (401, 403, 404):
                    self.after(0, lambda: self.lbl_main_status.config(text="● Auth Token Invalid or Repo Private", fg=self.c_amber))
                    self.log("[Main Project] GitHub Token rejected or insufficient permissions.", "warn", "repo")
                    return

        # Without token, attempt git ls-remote non-interactively
        try:
            res = subprocess.run(
                ["git", "-c", "credential.helper=", "ls-remote", "-h", url],
                capture_output=True, text=True, timeout=5, env=dict(os.environ, GIT_TERMINAL_PROMPT="0")
            )
            if res.returncode == 0 and res.stdout:
                sha = res.stdout.split()[0][:8]
                def update_main_ls():
                    self.lbl_main_commit.config(text=f"Latest SHA: {sha}")
                    self.lbl_main_status.config(text="● Accessible / Up-to-Date", fg=self.c_green)
                self.after(0, update_main_ls)
                self.log(f"[Main Project] Remote HEAD is at {sha}.", "success", "repo")
            else:
                def update_main_priv():
                    self.lbl_main_status.config(text="● Private (Click 'GitHub Token' to auth)", fg=self.c_amber)
                    self.lbl_main_commit.config(text="Private repository: credentials required to check commits.")
                self.after(0, update_main_priv)
                self.log("[Main Project] prushidhar/SIH260117 is private. Add a GitHub Token to enable commit tracking.", "info", "repo")
        except Exception as ex:
            self.after(0, lambda: self.lbl_main_status.config(text=f"● Connection Error: {str(ex)[:20]}", fg=self.c_amber))

    def sync_katty_repo(self):
        """Pulls latest files from katty repository into frontend."""
        def _sync():
            self.log("Syncing from Katty repository (https://github.com/undrajavarapukatherine-crypto/katty.git)...", "repo", "repo")
            temp_dir = BASE_DIR / ".temp_katty_sync"
            try:
                if temp_dir.exists():
                    shutil.rmtree(temp_dir, ignore_errors=True)

                self.log("Cloning latest Katty commits...", "repo", "repo")
                p = subprocess.run(
                    ["git", "clone", "--depth", "1", "https://github.com/undrajavarapukatherine-crypto/katty.git", str(temp_dir)],
                    capture_output=True, text=True
                )
                if p.returncode != 0:
                    self.log(f"Clone error: {p.stderr}", "error", "repo")
                    return

                # Katty puts frontend source inside 'indra/' subfolder
                src_dir = temp_dir / "indra" if (temp_dir / "indra").exists() else temp_dir
                
                # Copy updated files into frontend
                for item in src_dir.iterdir():
                    if item.name in (".git", "node_modules", ".next"):
                        continue
                    dest = FRONTEND_DIR / item.name
                    if item.is_dir():
                        shutil.copytree(item, dest, dirs_exist_ok=True)
                    else:
                        shutil.copy2(item, dest)

                # Get latest SHA
                rev = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(temp_dir), capture_output=True, text=True)
                sha = rev.stdout.strip()[:8]
                self.cfg["katty_last_sha"] = sha
                save_config(self.cfg)

                self.log(f"Katty frontend sync complete! Updated to commit {sha}.", "success", "repo")
                self.lbl_katty_status.config(text="● 🟢 Up-to-Date", fg=self.c_green)
                messagebox.showinfo("Sync Success", f"Frontend updated successfully from Katty repository (Commit {sha})!")
            except Exception as e:
                self.log(f"Sync error: {e}", "error", "repo")
                messagebox.showerror("Sync Error", str(e))
            finally:
                if temp_dir.exists():
                    shutil.rmtree(temp_dir, ignore_errors=True)

        threading.Thread(target=_sync, daemon=True).start()

    def sync_main_repo(self):
        """Pulls latest files from main project if authenticated."""
        def _sync():
            token = self.cfg.get("github_token", "").strip()
            url = self.cfg.get("main_repo_url", "https://github.com/prushidhar/SIH260117.git")
            
            if token and "@" not in url:
                # Inject token for authentication
                auth_url = url.replace("https://", f"https://{token}@")
            else:
                auth_url = url

            self.log(f"Checking git pull for main repository...", "repo", "repo")
            temp_dir = BASE_DIR / ".temp_main_sync"
            try:
                if temp_dir.exists():
                    shutil.rmtree(temp_dir, ignore_errors=True)

                p = subprocess.run(
                    ["git", "clone", "--depth", "1", auth_url, str(temp_dir)],
                    capture_output=True, text=True
                )
                if p.returncode != 0:
                    self.log(f"Could not pull main repo: {p.stderr}", "error", "repo")
                    messagebox.showwarning("Auth Required", "Could not access main project repository. Make sure you have set a valid GitHub Token with read access.")
                    return

                rev = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(temp_dir), capture_output=True, text=True)
                sha = rev.stdout.strip()[:8]
                self.cfg["main_last_sha"] = sha
                save_config(self.cfg)

                self.log(f"Main repository update verified at commit {sha}.", "success", "repo")
                self.lbl_main_status.config(text="● 🟢 Up-to-Date", fg=self.c_green)
                messagebox.showinfo("Sync Success", f"Main project repository checked and synchronized (Commit {sha})!")
            except Exception as e:
                self.log(f"Main repo sync error: {e}", "error", "repo")
            finally:
                if temp_dir.exists():
                    shutil.rmtree(temp_dir, ignore_errors=True)

        threading.Thread(target=_sync, daemon=True).start()

    def prompt_github_token(self):
        """Opens a prompt window to configure GitHub Personal Access Token."""
        dialog = tk.Toplevel(self)
        dialog.title("Configure GitHub Access Token")
        dialog.geometry("520x220")
        dialog.configure(bg=self.c_card)
        dialog.resizable(False, False)

        tk.Label(
            dialog, text="GitHub Personal Access Token (PAT)", font=("Segoe UI", 10, "bold"),
            fg=self.c_text, bg=self.c_card
        ).pack(anchor="w", padx=20, pady=(15, 4))

        tk.Label(
            dialog, text="Required to monitor and sync private repository (prushidhar/SIH260117).\nToken needs 'repo:read' permission.",
            font=("Segoe UI", 8), fg=self.c_muted, bg=self.c_card, justify="left"
        ).pack(anchor="w", padx=20, pady=(0, 10))

        entry_token = tk.Entry(dialog, font=("Consolas", 10), show="*", bg="#0B0F19", fg="#FFFFFF", relief="flat", insertbackground="#FFFFFF")
        entry_token.pack(fill="x", padx=20, ipady=4)
        entry_token.insert(0, self.cfg.get("github_token", ""))

        def _save():
            tok = entry_token.get().strip()
            self.cfg["github_token"] = tok
            save_config(self.cfg)
            self.log("GitHub Token updated.", "success", "repo")
            dialog.destroy()
            self.trigger_manual_repo_check()

        btn_box = tk.Frame(dialog, bg=self.c_card)
        btn_box.pack(fill="x", padx=20, pady=15)

        tk.Button(
            btn_box, text="Save Token", font=("Segoe UI", 9, "bold"),
            bg=self.c_blue, fg="#FFFFFF", relief="flat", padx=12, pady=4, cursor="hand2", command=_save
        ).pack(side="right")

        tk.Button(
            btn_box, text="Cancel", font=("Segoe UI", 9),
            bg="#334155", fg="#FFFFFF", relief="flat", padx=12, pady=4, cursor="hand2", command=dialog.destroy
        ).pack(side="right", padx=(0, 8))

    def _on_close(self):
        if self.backend_proc or self.frontend_proc:
            if messagebox.askyesno("Exit Workbench", "Services are still running. Do you want to stop all services and exit?"):
                self.stop_all()
                self.is_monitoring = False
                self.destroy()
        else:
            self.is_monitoring = False
            self.destroy()


def main():
    app = WorkbenchLauncher()
    app.mainloop()

if __name__ == "__main__":
    main()
