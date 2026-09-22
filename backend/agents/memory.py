import os
import sqlite3
import time
from typing import List, Dict, Any

class SovereignEpisodicMemory:
    """
    Sovereign, air-gapped episodic memory store for INDRA.
    Persists engineering preferences, equipment observations, and user interaction facts
    locally in SQLite with zero external cloud dependencies.
    """
    def __init__(self):
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        os.makedirs(data_dir, exist_ok=True)
        self.db_path = os.path.join(data_dir, "episodic_memory.sqlite")
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS interactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        prompt TEXT NOT NULL,
                        ai_response TEXT NOT NULL,
                        extracted_facts TEXT
                    )
                """)
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON interactions(user_id)")
        except Exception as e:
            print(f"[EpisodicMemory Warning] DB Init Error: {e}")

    def add_interaction(self, user_id: str, prompt: str, ai_response: str) -> None:
        """Saves interaction and indexes key operational context."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO interactions (user_id, prompt, ai_response)
                    VALUES (?, ?, ?)
                """, (user_id, prompt, ai_response[:1000]))
        except Exception as e:
            print(f"[EpisodicMemory Error] Add Interaction: {e}")

    def get_context(self, user_id: str, prompt: str) -> str:
        """Retrieves recent user preferences and relevant historical interactions."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT prompt, ai_response FROM interactions
                    WHERE user_id = ?
                    ORDER BY id DESC LIMIT 2
                """, (user_id,))
                rows = cursor.fetchall()
                if rows:
                    facts = []
                    for p, resp in rows:
                        snippet = resp.replace("\n", " ")[:140]
                        facts.append(f"Past Query: {p} -> Verified Summary: {snippet}...")
                    return "SOVEREIGN EPISODIC MEMORY (Prior Plant Interventions):\n" + "\n".join(f"- {f}" for f in facts)
        except Exception as e:
            print(f"[EpisodicMemory Error] Query Context: {e}")
        return ""

episodic_memory = SovereignEpisodicMemory()
