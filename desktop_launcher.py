"""
desktop_launcher.py — INDRA Sovereign AI Workbench Control Center
Launches backend (FastAPI :8000) and frontend (Next.js :3000).
No git sync. No repo monitoring. Just start, stop, and open.
"""

import os
import sys
import json
import time
import socket
import subprocess
import threading
import webbrowser
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
MODELS_DIR = Path(r"D:\models")
PHYSICAL_MODELS_DIR = Path(r"C:\models")

BACKEND_PORT  = 8000
FRONTEND_PORT = 3000
PYTHON_EXE    = sys.executable


def check_port(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex(('127.0.0.1', port)) == 0


def kill_process_tree(pid: int):
    try:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
    except Exception:
        pass


def ensure_d_mount():
    if MODELS_DIR.exists():
        return True, "D:\\models is mounted"
    PHYSICAL_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run("cmd /c subst D: C:\\", shell=True, capture_output=True)
    except Exception as e:
        return False, f"Failed to mount D: — {e}"
    return MODELS_DIR.exists(), "D:\\models mounted" if MODELS_DIR.exists() else "D: could not be mapped"


def is_node_installed():
    try:
        res = subprocess.run(["node", "-v"], capture_output=True, text=True, shell=True)
        return res.returncode == 0, res.stdout.strip()
    except Exception:
        return False, ""


class WorkbenchLauncher(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("INDRA — Sovereign AI Workbench")
        self.geometry("900x660")
        self.minsize(760, 540)
        self.configure(bg="#0B0F19")

        self.backend_proc  = None
        self.frontend_proc = None
        self._running      = True

        self._setup_theme()
        self._build_ui()
        self._check_prereqs()

        threading.Thread(target=self._health_loop, daemon=True).start()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── Theme ──────────────────────────────────────────────────────────────
    def _setup_theme(self):
        style = ttk.Style(self)
        style.theme_use("clam")
        self.c_bg    = "#0B0F19"
        self.c_card  = "#161F30"
        self.c_border= "#223048"
        self.c_text  = "#F1F5F9"
        self.c_muted = "#94A3B8"
        self.c_green = "#10B981"
        self.c_amber = "#F59E0B"
        self.c_red   = "#EF4444"
        self.c_blue  = "#0284C7"
        style.configure("TFrame",    background=self.c_bg)
        style.configure("TNotebook", background=self.c_bg, borderwidth=0)
        style.configure("TNotebook.Tab", background="#1E293B", foreground=self.c_text, padding=[12, 6])
        style.map("TNotebook.Tab",
                  background=[("selected", self.c_blue)],
                  foreground=[("selected", "#FFFFFF")])

    # ── UI ─────────────────────────────────────────────────────────────────
    def _build_ui(self):
        # ---- Header ----
        hdr = tk.Frame(self, bg=self.c_bg, pady=14, padx=22)
        hdr.pack(fill="x")

        left = tk.Frame(hdr, bg=self.c_bg)
        left.pack(side="left")
        tk.Label(left, text="⚡  INDRA  WORKBENCH",
                 font=("Segoe UI", 18, "bold"), fg=self.c_text, bg=self.c_bg).pack(anchor="w")
        tk.Label(left, text="Industrial Neural Decision & Reasoning Assistant  ·  Air-Gapped · On-Premise",
                 font=("Segoe UI", 9), fg=self.c_muted, bg=self.c_bg).pack(anchor="w")

        right = tk.Frame(hdr, bg=self.c_bg)
        right.pack(side="right")
        self.bk_badge = tk.Label(right, text="● Backend: Stopped",
                                 font=("Segoe UI", 9, "bold"), fg=self.c_red,
                                 bg="#1E293B", padx=10, pady=4)
        self.bk_badge.pack(side="left", padx=4)
        self.fe_badge = tk.Label(right, text="● Frontend: Stopped",
                                 font=("Segoe UI", 9, "bold"), fg=self.c_red,
                                 bg="#1E293B", padx=10, pady=4)
        self.fe_badge.pack(side="left", padx=4)

        # ---- Control Card ----
        card = tk.Frame(self, bg=self.c_card,
                        highlightbackground=self.c_border, highlightthickness=1,
                        padx=20, pady=16)
        card.pack(fill="x", padx=20, pady=(0, 12))

        tk.Label(card, text="SERVICE CONTROLS",
                 font=("Segoe UI", 10, "bold"), fg=self.c_muted, bg=self.c_card).pack(anchor="w", pady=(0,10))

        btns = tk.Frame(card, bg=self.c_card)
        btns.pack(fill="x")

        self.btn_launch = tk.Button(
            btns, text="🚀  LAUNCH WORKBENCH",
            font=("Segoe UI", 12, "bold"),
            bg=self.c_green, fg="#FFFFFF",
            activebackground="#059669", activeforeground="#FFFFFF",
            relief="flat", padx=20, pady=10, cursor="hand2",
            command=self.launch_all
        )
        self.btn_launch.pack(side="left", padx=(0, 10))

        self.btn_stop = tk.Button(
            btns, text="⏹  STOP ALL",
            font=("Segoe UI", 12, "bold"),
            bg="#334155", fg="#FFFFFF",
            activebackground=self.c_red, activeforeground="#FFFFFF",
            relief="flat", padx=18, pady=10, cursor="hand2",
            command=self.stop_all, state="disabled"
        )
        self.btn_stop.pack(side="left", padx=(0, 10))

        self.btn_browser = tk.Button(
            btns, text="🌐  Open Web UI",
            font=("Segoe UI", 11),
            bg=self.c_blue, fg="#FFFFFF",
            activebackground="#0369A1", activeforeground="#FFFFFF",
            relief="flat", padx=14, pady=10, cursor="hand2",
            command=self.open_browser
        )
        self.btn_browser.pack(side="left", padx=(0, 10))

        self.btn_mount = tk.Button(
            btns, text="💾  Remount D:",
            font=("Segoe UI", 10),
            bg="#1E293B", fg=self.c_text,
            activebackground="#334155", activeforeground="#FFFFFF",
            relief="flat", padx=12, pady=10, cursor="hand2",
            command=self.remount_d
        )
        self.btn_mount.pack(side="left")

        self.lbl_status = tk.Label(
            card, text="Ready. Click LAUNCH WORKBENCH to start.",
            font=("Segoe UI", 9), fg=self.c_muted, bg=self.c_card
        )
        self.lbl_status.pack(anchor="w", pady=(12, 0))

        # ---- System info bar ----
        info = tk.Frame(self, bg="#0F172A", padx=20, pady=6)
        info.pack(fill="x", padx=20, pady=(0, 10))

        self.lbl_mount  = tk.Label(info, text="D:\\models: Checking…",
                                   font=("Segoe UI", 8), fg=self.c_amber, bg="#0F172A")
        self.lbl_mount.pack(side="left", padx=(0, 20))

        self.lbl_node   = tk.Label(info, text="Node.js: Checking…",
                                   font=("Segoe UI", 8), fg=self.c_amber, bg="#0F172A")
        self.lbl_node.pack(side="left", padx=(0, 20))

        self.lbl_models = tk.Label(info, text="Models: Checking…",
                                   font=("Segoe UI", 8), fg=self.c_muted, bg="#0F172A")
        self.lbl_models.pack(side="left")

        tk.Button(info, text="Clear Logs", font=("Segoe UI", 8),
                  bg="#1E293B", fg=self.c_muted, relief="flat",
                  padx=8, pady=1, cursor="hand2",
                  command=self.clear_logs).pack(side="right")

        # ---- Log Tabs ----
        log_frame = tk.Frame(self, bg=self.c_bg, padx=20)
        log_frame.pack(fill="both", expand=True, pady=(0, 10))

        nb = ttk.Notebook(log_frame)
        nb.pack(fill="both", expand=True)

        self.txt_all      = self._log_tab(nb, "All Logs")
        self.txt_backend  = self._log_tab(nb, "Backend (:8000)")
        self.txt_frontend = self._log_tab(nb, "Frontend (:3000)")

    def _log_tab(self, parent, title):
        frame = ttk.Frame(parent)
        parent.add(frame, text=title)
        txt = scrolledtext.ScrolledText(
            frame, bg="#070A11", fg="#E2E8F0",
            insertbackground="#FFFFFF", font=("Consolas", 9),
            relief="flat", borderwidth=0
        )
        txt.pack(fill="both", expand=True)
        txt.tag_config("info",    foreground="#38BDF8")
        txt.tag_config("success", foreground="#34D399")
        txt.tag_config("warn",    foreground="#FBBF24")
        txt.tag_config("error",   foreground="#F87171")
        return txt

    # ── Logging ────────────────────────────────────────────────────────────
    def log(self, msg: str, tag: str = "info", target: str = "all"):
        def _w():
            ts  = time.strftime("[%H:%M:%S] ")
            line = f"{ts}{msg}\n"
            self.txt_all.insert("end", line, tag)
            self.txt_all.see("end")
            if target == "backend":
                self.txt_backend.insert("end", line, tag)
                self.txt_backend.see("end")
            elif target == "frontend":
                self.txt_frontend.insert("end", line, tag)
                self.txt_frontend.see("end")
        self.after(0, _w)

    def clear_logs(self):
        for t in [self.txt_all, self.txt_backend, self.txt_frontend]:
            t.delete("1.0", "end")

    # ── Prerequisites ──────────────────────────────────────────────────────
    def _check_prereqs(self):
        ok, msg = ensure_d_mount()
        if ok:
            self.lbl_mount.config(text="D:\\models: Mounted ✓", fg=self.c_green)
            self.log("D:\\models is mounted and accessible.", "success")
        else:
            self.lbl_mount.config(text="D:\\models: Missing ⚠", fg=self.c_red)
            self.log(f"Warning: {msg}", "warn")

        has_node, ver = is_node_installed()
        if has_node:
            self.lbl_node.config(text=f"Node.js: {ver} ✓", fg=self.c_green)
            self.log(f"Node.js {ver} detected.", "success")
        else:
            self.lbl_node.config(text="Node.js: Not Found ⚠", fg=self.c_amber)
            self.log("Node.js not found in PATH.", "warn")

        if MODELS_DIR.exists():
            items = [d.name for d in MODELS_DIR.iterdir()]
            self.lbl_models.config(text=f"Models: {len(items)} files in D:\\models", fg=self.c_text)
            self.log(f"Model files: {', '.join(items) if items else 'none'}", "info")

    # ── Service lifecycle ──────────────────────────────────────────────────
    def launch_all(self):
        self.btn_launch.config(state="disabled")
        self.btn_stop.config(state="normal")
        self.lbl_status.config(text="Starting services…", fg=self.c_amber)
        ensure_d_mount()
        threading.Thread(target=self._run_backend,  daemon=True).start()
        threading.Thread(target=self._run_frontend, daemon=True).start()

    def _run_backend(self):
        self.log(f"Starting backend on :{BACKEND_PORT}…", "info", "backend")
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"]    = "1"
        env["HF_HUB_OFFLINE"]      = "1"
        env["TRANSFORMERS_OFFLINE"] = "1"
        env["HF_HOME"]             = r"D:\huggingface_cache"
        try:
            self.backend_proc = subprocess.Popen(
                [PYTHON_EXE, "-m", "uvicorn", "main:app",
                 "--host", "0.0.0.0", "--port", str(BACKEND_PORT)],
                cwd=str(BACKEND_DIR), env=env,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1
            )
            self.log(f"Backend PID {self.backend_proc.pid}", "success", "backend")
            for line in self.backend_proc.stdout:
                s = line.strip()
                if s:
                    self.log(f"[BE] {s}", "error" if "error" in s.lower() else "info", "backend")
            self.backend_proc.wait()
            self.log("Backend exited.", "warn", "backend")
            self.after(0, lambda: self.bk_badge.config(text="● Backend: Stopped", fg=self.c_red))
        except Exception as e:
            self.log(f"Backend error: {e}", "error", "backend")
            self.after(0, lambda: self.bk_badge.config(text="● Backend: Error", fg=self.c_red))

    def _run_frontend(self):
        self.log(f"Starting frontend on :{FRONTEND_PORT}…", "info", "frontend")
        if not (FRONTEND_DIR / "node_modules").exists():
            self.log("Running npm install (first run)…", "warn", "frontend")
            subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), shell=True)
        try:
            self.frontend_proc = subprocess.Popen(
                "npm run dev", cwd=str(FRONTEND_DIR), shell=True,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1
            )
            self.log(f"Frontend PID {self.frontend_proc.pid}", "success", "frontend")
            for line in self.frontend_proc.stdout:
                s = line.strip()
                if s:
                    tag = "success" if ("ready" in s.lower() or "localhost:3000" in s) else "info"
                    self.log(f"[FE] {s}", tag, "frontend")
            self.frontend_proc.wait()
            self.log("Frontend exited.", "warn", "frontend")
            self.after(0, lambda: self.fe_badge.config(text="● Frontend: Stopped", fg=self.c_red))
        except Exception as e:
            self.log(f"Frontend error: {e}", "error", "frontend")
            self.after(0, lambda: self.fe_badge.config(text="● Frontend: Error", fg=self.c_red))

    def stop_all(self):
        self.log("Stopping all services…", "warn")
        if self.backend_proc:
            kill_process_tree(self.backend_proc.pid)
            self.backend_proc = None
        if self.frontend_proc:
            kill_process_tree(self.frontend_proc.pid)
            self.frontend_proc = None
        for port in (BACKEND_PORT, FRONTEND_PORT):
            try:
                out = subprocess.run(f"netstat -ano | findstr :{port}",
                                     shell=True, capture_output=True, text=True)
                for ln in out.stdout.splitlines():
                    parts = ln.split()
                    if len(parts) >= 5 and "LISTENING" in parts:
                        subprocess.run(f"taskkill /F /PID {parts[-1]}",
                                       shell=True, capture_output=True)
            except Exception:
                pass
        self.btn_launch.config(state="normal")
        self.btn_stop.config(state="disabled")
        self.bk_badge.config(text="● Backend: Stopped",  fg=self.c_red)
        self.fe_badge.config(text="● Frontend: Stopped", fg=self.c_red)
        self.lbl_status.config(text="All services stopped.", fg=self.c_muted)
        self.log("All services stopped.", "success")

    def open_browser(self):
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}/workbench")

    def remount_d(self):
        ok, msg = ensure_d_mount()
        if ok:
            self.lbl_mount.config(text="D:\\models: Mounted ✓", fg=self.c_green)
            self.log("D: drive remounted.", "success")
        else:
            messagebox.showerror("Mount Error", msg)

    # ── Health monitor ─────────────────────────────────────────────────────
    def _health_loop(self):
        opened = False
        while self._running:
            time.sleep(2.5)
            bk = check_port(BACKEND_PORT)
            fe = check_port(FRONTEND_PORT)

            def _ui(bk=bk, fe=fe):
                if bk:
                    self.bk_badge.config(text=f"● Backend: Running (:{BACKEND_PORT})", fg=self.c_green)
                elif not self.backend_proc:
                    self.bk_badge.config(text="● Backend: Stopped", fg=self.c_red)

                if fe:
                    self.fe_badge.config(text=f"● Frontend: Running (:{FRONTEND_PORT})", fg=self.c_green)
                elif not self.frontend_proc:
                    self.fe_badge.config(text="● Frontend: Stopped", fg=self.c_red)

                if bk and fe:
                    self.lbl_status.config(
                        text="● Sovereign AI Workbench is Online  (Backend :8000 · Frontend :3000)",
                        fg=self.c_green
                    )
                elif bk:
                    self.lbl_status.config(
                        text="Backend online. Waiting for frontend…",
                        fg=self.c_amber
                    )

            self.after(0, _ui)

            if bk and fe and not opened:
                opened = True
                self.after(0, self.open_browser)
            elif not self.backend_proc and not self.frontend_proc:
                opened = False

    def _on_close(self):
        if self.backend_proc or self.frontend_proc:
            if messagebox.askyesno("Exit", "Services are running. Stop and exit?"):
                self.stop_all()
                self._running = False
                self.destroy()
        else:
            self._running = False
            self.destroy()


if __name__ == "__main__":
    app = WorkbenchLauncher()
    app.mainloop()
