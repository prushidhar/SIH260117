'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Activity, 
  Calendar
} from 'lucide-react';
import { useIndraStore, type WatchdogTask } from '@/store/indra-store';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ScheduledTasksModal() {
  const { 
    isScheduledTasksOpen, 
    setScheduledTasksOpen, 
    sendMessage, 
    setActiveNav,
    isAgentWorking,
    scheduledTasks,
    toggleScheduledTask,
    removeScheduledTask,
    addScheduledTask
  } = useIndraStore();

  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskSchedule, setTaskSchedule] = useState('Every 30 mins');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskQuery, setTaskQuery] = useState('');

  const tasks = scheduledTasks || [];
  const activeCount = tasks.filter((t) => t.status === 'active').length;

  const handleRunNow = (task: WatchdogTask) => {
    if (isAgentWorking) return;
    setScheduledTasksOpen(false);
    setActiveNav('workbench');
    router.push('/workbench');
    sendMessage(task.query);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !taskQuery.trim()) return;

    const newTask: WatchdogTask = {
      id: `task-${Date.now()}`,
      name: taskName.trim(),
      schedule: taskSchedule,
      description: taskDescription.trim() || 'Automated periodic sovereign execution routine',
      engine: 'On-Premise Daemon Kernel',
      status: 'active',
      lastRun: 'Pending initial trigger',
      query: taskQuery.trim(),
    };

    addScheduledTask(newTask);
    setTaskName('');
    setTaskDescription('');
    setTaskQuery('');
    setIsCreating(false);
  };

  return (
    <Dialog open={isScheduledTasksOpen} onOpenChange={setScheduledTasksOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden text-slate-800 dark:text-zinc-100">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/70">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  Scheduled Autonomous Plant Watchdogs
                  <Badge variant="success">
                    {activeCount} Active
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] mt-0.5">
                  Periodic sovereign routines executing on-premise without cloud dependencies.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant={isCreating ? 'secondary' : 'gradient'}
              size="sm"
              onClick={() => setIsCreating(!isCreating)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Cancel' : 'Add Routine'}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Create Routine Form */}
        {isCreating && (
          <form onSubmit={handleCreate} className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/60 space-y-3 font-mono text-xs">
            <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>Configure New Autonomous Watchdog</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mb-1">Routine Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. ASME B31.3 Stress Check"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mb-1">Schedule Interval</label>
                <select
                  value={taskSchedule}
                  onChange={(e) => setTaskSchedule(e.target.value)}
                  className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-zinc-100 shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  <option value="Every 15 mins">Every 15 mins</option>
                  <option value="Every 30 mins">Every 30 mins</option>
                  <option value="Every hour">Every hour</option>
                  <option value="Daily at 00:00 UTC">Daily at 00:00 UTC</option>
                  <option value="Continuous Daemon">Continuous Daemon</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 dark:text-zinc-400 mb-1">Routine Description</label>
              <Input
                type="text"
                placeholder="Brief summary of statutory engineering check"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 dark:text-zinc-400 mb-1">Agent Query / Task Execution Command</label>
              <Input
                type="text"
                required
                placeholder="e.g. Verify pipeline minimum thickness under ASME B31.3"
                value={taskQuery}
                onChange={(e) => setTaskQuery(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="success"
                size="sm"
              >
                Save Routine
              </Button>
            </div>
          </form>
        )}

        {/* Task List or Zero-Mock Empty State */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-thin dark:scrollbar-thumb-zinc-700">
          {tasks.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                No Scheduled Watchdog Routines Configured
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono max-w-md mx-auto leading-relaxed">
                Autonomous scheduled watchdog routines execute on-premise without cloud dependencies. Click &quot;Add Routine&quot; above to configure a periodic monitoring routine.
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const isActive = task.status === 'active';

              return (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`p-2 rounded-xl border flex-shrink-0 ${
                        isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500'
                      }`}>
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono flex items-center gap-2">
                          <span>{task.name}</span>
                          <Badge variant={isActive ? 'success' : 'secondary'}>
                            {isActive ? 'ACTIVE' : 'PAUSED'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                          {task.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleScheduledTask(task.id)}
                        title={isActive ? 'Pause watchdog routine' : 'Resume watchdog routine'}
                      >
                        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                      </Button>
                      <Button
                        variant="gradient"
                        size="xs"
                        onClick={() => handleRunNow(task)}
                        disabled={isAgentWorking}
                        className="gap-1.5"
                        title="Run routine immediately on live backend"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run Now</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeScheduledTask(task.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Delete routine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-2 border-t border-slate-200/80 dark:border-zinc-800/60">
                    <div className="flex items-center gap-3">
                      <span>Schedule: <strong className="text-slate-700 dark:text-zinc-400">{task.schedule}</strong></span>
                      <span>Engine: <strong className="text-slate-700 dark:text-zinc-400">{task.engine}</strong></span>
                    </div>
                    <div>Last Run: <span className="text-slate-700 dark:text-zinc-400">{task.lastRun}</span></div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/70 flex justify-between items-center text-xs font-mono sm:justify-between">
          <span className="text-slate-400 dark:text-zinc-500 text-[11px]">
            Execution environment: 100% on-premise local node
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScheduledTasksOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
