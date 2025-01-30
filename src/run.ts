import { IExecutor } from './Executor';
import ITask from './Task';

export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
    maxThreads = Math.max(0, maxThreads);
    /**
     * Код надо писать сюда
     * Тут что-то вызываем в правильном порядке executor.executeTask для тасков из очереди queue
     */
  const TASK_ORDER = ['init', 'prepare', 'work', 'finalize', 'cleanup'];

  class ThreadsController {
    private max: number;
    private current: number;
    private queue: (() => void)[] = [];

    constructor(max: number) {
      this.max = max;
      this.current = 0;
    }

    acquire(): Promise<void> {
      return new Promise((resolve) => {
        if (this.current < this.max) {
          this.current += 1;
          resolve();
        } else {
          this.queue.push(resolve);
        }
      });
    }

    release(): void {
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) { next() }
      } else {
        this.current -= 1;
      }
    }
  }
  
  const activeTasks = new Map<number, Promise<void>>();
  const pendingTasks = new Map<number, ITask[]>();
  const completedTasks = new Map<number, string[]>();
  const controller = maxThreads > 0 ? new ThreadsController(maxThreads) : null;

  function canExecuteTask(task: ITask): boolean {
    const { targetId, action } = task;
    const completed = completedTasks.get(targetId) || [];
    const currentActionIndex = TASK_ORDER.indexOf(action);

    for (let i = 0; i < currentActionIndex; i += 1) {
      if (!completed.includes(TASK_ORDER[i])) {
        return false;
      }
    }

    return true;
  };

  function addToPendingTasks(task: ITask): void {
    const { targetId } = task;
    if (!pendingTasks.has(targetId)) {
      pendingTasks.set(targetId, []);
    }
    pendingTasks.get(targetId)!.push(task);
    if (controller) {
      controller.release();
    }
  }

  async function processTask(task: ITask) {
    const { targetId, action } = task;

    if (controller) {
      await controller.acquire();
    }

    try {
      if (!canExecuteTask(task)) {
        addToPendingTasks(task);
        return;
      }

      if (activeTasks.has(targetId)) {
        addToPendingTasks(task);
        return;
      }

      const taskPromise = executor.executeTask(task).finally(() => {
        activeTasks.delete(targetId);
        if (controller) {
          controller.release();
        }
        if (!completedTasks.has(targetId)) {
          completedTasks.set(targetId, []);
        }
        completedTasks.get(targetId)!.push(action);

        const nextTasks = pendingTasks.get(targetId);
        if (nextTasks && nextTasks.length > 0) {
          const nextTask = nextTasks.shift()!;
          processTask(nextTask);
        }
      });

      activeTasks.set(targetId, taskPromise);
      await taskPromise;
    } catch (error) {
      console.error(`Error executing task: ${error}`);
    }
  }

  const taskPromises: Promise<void>[] = [];

  for await (const task of queue) {
    taskPromises.push(processTask(task));
  }

  await Promise.all(taskPromises);

  return completedTasks;
}
