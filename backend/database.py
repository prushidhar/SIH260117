import sqlite3
import json
from typing import Dict, Any

class Database:
    def __init__(self, db_path="backend_tasks.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    taskId TEXT PRIMARY KEY,
                    title TEXT,
                    type TEXT,
                    timestamp TEXT,
                    status TEXT,
                    messages TEXT,
                    toolCalls TEXT,
                    deliverables TEXT,
                    prompt TEXT
                )
            """)
            cursor.execute("PRAGMA table_info(tasks)")
            cols = [c[1] for c in cursor.fetchall()]
            if "prompt" not in cols:
                cursor.execute("ALTER TABLE tasks ADD COLUMN prompt TEXT")
            if "file_ids" not in cols:
                cursor.execute("ALTER TABLE tasks ADD COLUMN file_ids TEXT")
            if "model" not in cols:
                cursor.execute("ALTER TABLE tasks ADD COLUMN model TEXT")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS approvals (
                    id TEXT PRIMARY KEY,
                    equipment TEXT,
                    task_id TEXT,
                    recommendation TEXT,
                    required_tier INTEGER,
                    status TEXT,
                    created_at TEXT,
                    signed_by TEXT,
                    signed_at TEXT
                )
            """)
            conn.commit()

    def create_task(self, task_id: str, title: str, task_type: str, timestamp: str, prompt: str = "", file_ids: list = None, model: str = None):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO tasks (taskId, title, type, timestamp, status, messages, toolCalls, deliverables, prompt, file_ids, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (task_id, title, task_type, timestamp, "pending", "[]", "[]", "[]", prompt or title, json.dumps(file_ids or []), model or "")
            )
            conn.commit()

    def update_task_status(self, task_id: str, status: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE tasks SET status = ? WHERE taskId = ?", (status, task_id))
            conn.commit()

    def complete_task(self, task_id: str, messages: list, tool_calls: list, deliverables: list):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE tasks SET status = ?, messages = ?, toolCalls = ?, deliverables = ? WHERE taskId = ?",
                ("done", json.dumps(messages), json.dumps(tool_calls), json.dumps(deliverables), task_id)
            )
            conn.commit()

    def get_all_tasks(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT taskId, title, type, timestamp, status FROM tasks ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            return [{"taskId": r[0], "title": r[1], "type": r[2], "timestamp": r[3], "status": r[4]} for r in rows]

    def clear_all_tasks(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks")
            cursor.execute("DELETE FROM approvals")
            conn.commit()

    def delete_task(self, task_id: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks WHERE taskId = ?", (task_id,))
            conn.commit()

    def get_task(self, task_id: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT taskId, title, type, timestamp, status, messages, toolCalls, deliverables, prompt, file_ids, model FROM tasks WHERE taskId = ?", (task_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "taskId": row[0],
                "title": row[1],
                "type": row[2],
                "timestamp": row[3],
                "status": row[4],
                "messages": json.loads(row[5]) if row[5] else [],
                "toolCalls": json.loads(row[6]) if row[6] else [],
                "deliverables": json.loads(row[7]) if row[7] else [],
                "prompt": row[8] if len(row) > 8 and row[8] else row[1],
                "file_ids": json.loads(row[9]) if len(row) > 9 and row[9] else [],
                "model": row[10] if len(row) > 10 and row[10] else ""
            }

    def add_approval(self, approval_id: str, equipment: str, task_id: str, recommendation: str, required_tier: int = 2):
        import time
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO approvals (id, equipment, task_id, recommendation, required_tier, status, created_at, signed_by, signed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (approval_id, equipment, task_id, recommendation, required_tier, "pending", time.strftime("%Y-%m-%dT%H:%M:%SZ"), "", "")
            )
            conn.commit()

    def get_pending_approvals(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, equipment, task_id, recommendation, required_tier, status, created_at, signed_by, signed_at FROM approvals WHERE status = 'pending' ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "equipment": r[1],
                    "task_id": r[2],
                    "recommendation": r[3],
                    "required_tier": r[4],
                    "status": r[5],
                    "created_at": r[6],
                    "signed_by": r[7],
                    "signed_at": r[8]
                }
                for r in rows
            ]

    def sign_approval(self, approval_id: str, decision: str, signed_by: str, tier: int):
        import time
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT required_tier, equipment, id FROM approvals WHERE id = ? OR task_id = ?", (approval_id, approval_id))
            row = cursor.fetchone()
            if not row:
                return False, "Approval request not found"
            req_tier, eq, real_id = row
            if tier < req_tier:
                return False, f"Requires Tier {req_tier} clearance. Current tier: {tier}"
            now = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            cursor.execute(
                "UPDATE approvals SET status = ?, signed_by = ?, signed_at = ? WHERE id = ?",
                (decision.lower(), signed_by, now, real_id)
            )
            conn.commit()
            return True, {"id": real_id, "equipment": eq, "status": decision.lower(), "signed_by": signed_by, "signed_at": now}

db = Database()

