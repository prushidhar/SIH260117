import os
from celery import Celery

# Configure Celery for the INDRA Sovereign Workbench
# Since this is an air-gapped on-premise Windows deployment, 
# we default to using a local SQLite database as both the broker and result backend.
# In a production Linux cluster, replace this with "redis://localhost:6379/0".

broker_url = 'sqla+sqlite:///celery_broker.sqlite'
result_backend = 'db+sqlite:///celery_results.sqlite'

celery_app = Celery(
    "indra_tasks",
    broker=broker_url,
    backend=result_backend,
    include=["sandbox.executor"]  # Modules containing celery tasks
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Worker optimization for long-running AI tasks
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_track_started=True
)

@celery_app.task(bind=True, max_retries=3)
def process_agentic_task_async(self, task_id: str, prompt: str, file_ids: list, requested_model: str):
    """
    Background Celery task for running the agent orchestration independently 
    of the FastAPI websocket lifecycle.
    """
    import asyncio
    from agents.planner import AgentDAG
    from database import db
    
    # In a full production setup, the websocket is detached, and the client 
    # subscribes to a Redis PubSub channel. For this local worker, we 
    # execute the DAG and update the central database.
    try:
        # Mocking the websocket interface for headless execution
        class HeadlessWebsocket:
            async def send_json(self, data):
                pass
                
        ws = HeadlessWebsocket()
        agent = AgentDAG(ws, task_id, prompt, file_ids=file_ids, requested_model=requested_model)
        
        # Run async code inside the sync celery task
        loop = asyncio.get_event_loop()
        loop.run_until_complete(agent.run())
        
        deliverables_payload = [
            {
                "filename": os.path.basename(p),
                "url": f"/files/{task_id}/artifacts/{os.path.basename(p)}",
                "kind": os.path.splitext(p)[1].lstrip('.') or "docx"
            }
            for p in agent.state.deliverables
        ]
        
        db.complete_task(
            task_id=task_id,
            messages=agent.state.messages,
            tool_calls=getattr(agent.state, 'recorded_tool_calls', []),
            deliverables=deliverables_payload
        )
        return {"status": "success", "task_id": task_id}
        
    except Exception as exc:
        db.update_task_status(task_id, "error")
        # Retry with exponential backoff if it's a transient failure
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

