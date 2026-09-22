"""
core/task_queue.py - Async Background Task Queue for INDRA
Allows concurrent task execution without blocking WebSocket handlers.
Supports up to MAX_CONCURRENT tasks simultaneously.
"""
import asyncio
import os
from typing import Dict, Optional, Callable, Any


class WebSocketEmitter:
    """Mimics FastAPI WebSocket.send_json but routes to TaskQueue event store."""
    def __init__(self, task_id: str, queue: 'TaskQueue'):
        self.task_id = task_id
        self._queue_ref = queue

    async def send_json(self, data: dict):
        self._queue_ref.emit(self.task_id, data)

    async def close(self):
        pass  # No-op for emitter


class TaskQueue:
    """
    Async background task execution pool for INDRA.
    Tasks are enqueued and run by a semaphore-limited pool.
    WebSocket clients subscribe to the per-task event stream.
    """
    MAX_CONCURRENT = 3

    def __init__(self):
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._running: Dict[str, asyncio.Task] = {}
        self._event_queues: Dict[str, asyncio.Queue] = {}
        self._task_status: Dict[str, str] = {}
        self._queue_position: Dict[str, int] = {}

    def _get_semaphore(self) -> asyncio.Semaphore:
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(self.MAX_CONCURRENT)
        return self._semaphore

    async def enqueue(self, task_id: str, coro_factory: Callable, *args, **kwargs) -> int:
        """
        Enqueue a coroutine factory for background execution.
        Returns queue position (0 = will start immediately).
        """
        self._event_queues[task_id] = asyncio.Queue(maxsize=2000)
        self._task_status[task_id] = 'queued'
        sem = self._get_semaphore()
        queued_count = sum(1 for s in self._task_status.values() if s == 'queued') - 1
        position = max(0, queued_count)
        self._queue_position[task_id] = position

        loop_task = asyncio.create_task(
            self._run_with_semaphore(task_id, coro_factory, *args, **kwargs)
        )
        self._running[task_id] = loop_task
        return position

    async def _run_with_semaphore(self, task_id: str, coro_factory: Callable, *args, **kwargs):
        sem = self._get_semaphore()
        async with sem:
            self._task_status[task_id] = 'running'
            try:
                await coro_factory(*args, **kwargs)
                self._task_status[task_id] = 'done'
            except asyncio.CancelledError:
                self._task_status[task_id] = 'cancelled'
                q = self._event_queues.get(task_id)
                if q:
                    try:
                        q.put_nowait({'type': 'error', 'error': 'Task was cancelled'})
                        q.put_nowait({'type': 'done'})
                    except asyncio.QueueFull:
                        pass
                raise
            except Exception as e:
                self._task_status[task_id] = 'error'
                q = self._event_queues.get(task_id)
                if q:
                    try:
                        q.put_nowait({'type': 'error', 'error': str(e)})
                        q.put_nowait({'type': 'done'})
                    except asyncio.QueueFull:
                        pass
                import traceback
                traceback.print_exc()

    def emit(self, task_id: str, event: dict):
        """Emit an event to a task's event queue (called by WebSocketEmitter)."""
        q = self._event_queues.get(task_id)
        if q:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # Drop under back-pressure

    async def subscribe(self, task_id: str, websocket, timeout: float = 600.0):
        """
        Subscribe a WebSocket to a task's event stream.
        Relays all events from the task's queue to the WebSocket.
        """
        q = self._event_queues.get(task_id)
        if not q:
            await websocket.send_json({'type': 'error', 'error': 'Task not found in queue'})
            await websocket.send_json({'type': 'done'})
            return

        pos = self._queue_position.get(task_id, 0)
        if pos > 0:
            await websocket.send_json({'type': 'queued', 'position': pos, 'task_id': task_id})

        deadline = asyncio.get_event_loop().time() + timeout
        while True:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                try:
                    await websocket.send_json({'type': 'error', 'error': 'Task timeout after 600s'})
                    await websocket.send_json({'type': 'done'})
                except Exception:
                    pass
                break
            try:
                event = await asyncio.wait_for(q.get(), timeout=min(30.0, remaining))
                try:
                    await websocket.send_json(event)
                except Exception:
                    # Client disconnected - task keeps running
                    break
                if event.get('type') == 'done':
                    break
            except asyncio.TimeoutError:
                # Send keepalive ping every 30s
                try:
                    await websocket.send_json({'type': 'ping', 'task_id': task_id})
                except Exception:
                    break

    def get_emitter(self, task_id: str) -> WebSocketEmitter:
        """Get a WebSocket-compatible emitter for a task."""
        return WebSocketEmitter(task_id, self)

    def cancel(self, task_id: str) -> bool:
        """Cancel a running task."""
        task = self._running.get(task_id)
        if task and not task.done():
            task.cancel()
            self._task_status[task_id] = 'cancelled'
            return True
        return False

    def get_status(self, task_id: str) -> dict:
        """Get current status of a task."""
        return {
            'task_id': task_id,
            'status': self._task_status.get(task_id, 'unknown'),
            'queue_position': self._queue_position.get(task_id, 0),
            'is_running': task_id in self._running and not self._running[task_id].done(),
        }

    def get_metrics(self) -> dict:
        """Get system-wide task queue metrics."""
        statuses = list(self._task_status.values())
        sem = self._semaphore
        return {
            'running': statuses.count('running'),
            'queued': statuses.count('queued'),
            'done': statuses.count('done'),
            'error': statuses.count('error'),
            'cancelled': statuses.count('cancelled'),
            'total_lifetime': len(statuses),
            'max_concurrent': self.MAX_CONCURRENT,
            'available_slots': sem._value if sem else self.MAX_CONCURRENT,
        }

    def cleanup_old_tasks(self, keep_recent: int = 100):
        """Prune old done/error tasks to prevent memory growth."""
        done_ids = [tid for tid, s in self._task_status.items()
                    if s in ('done', 'error', 'cancelled')]
        for tid in done_ids[:-keep_recent]:
            self._task_status.pop(tid, None)
            self._event_queues.pop(tid, None)
            self._queue_position.pop(tid, None)
            self._running.pop(tid, None)


# Global singleton
task_queue = TaskQueue()