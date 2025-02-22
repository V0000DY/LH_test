import { IExecutor } from './Executor';
import ITask from './Task';

export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
    maxThreads = Math.max(0, maxThreads);
    /**
     * Код надо писать сюда
     * Тут что-то вызываем в правильном порядке executor.executeTask для тасков из очереди queue
     */
  const TASK_ORDER = ['init', 'prepare', 'work', 'finalize', 'cleanup'];

  class Queue <T>{
    private stack1: Array<T>;
    private stack2: Array<T>;

    constructor() {
      this.stack1 = [];
      this.stack2 = [];
    }

    enqueue(value: T) {
      while (this.stack2.length > 0) {
        this.stack1.push(this.stack2.pop()!);
      }
      this.stack1.push(value);
    }

    dequeue() {
      while (this.stack1.length > 0) {
        this.stack2.push(this.stack1.pop()!);
      }
      return this.stack2.pop();
    }

    peek() {
      if (this.stack1.length > 0) {
        return true;
      }

      if (this.stack2.length > 0) {
        return true;
      }

      return false;
    }
  }

  class ThreadsController {
    private max: number;
    private current: number;
    private queue: Queue<(() => void)>;

    constructor(max: number) {
      this.max = max;
      this.current = 0;
      this.queue = new Queue();
    }

    acquire(): Promise<void> {
      return new Promise((resolve) => {
        if (this.current < this.max) {
          this.current += 1;
          resolve();
        } else {
          this.queue.enqueue(resolve);
        }
      });
    }

    release(): void {
      if (this.queue.peek()) {
        const next = this.queue.dequeue();
        if (next) { next() }
      } else {
        this.current -= 1;
      }
    }
  }
  
  const activeTasks = new Map<number, Promise<void>>();
  const pendingTasks = new Map<number, Queue<ITask>>();
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
      pendingTasks.set(targetId, new Queue);
    }
    pendingTasks.get(targetId)!.enqueue(task);
    if (controller) {
      controller.release();
    }
  }

  async function processTask(task: ITask) {
    try {
      const taskQueue: Queue<ITask>  = new Queue();
      taskQueue.enqueue(task);
      
      while (taskQueue.peek()) {
        const currentTask = taskQueue.dequeue();
        const { targetId, action } = currentTask!;
    
        if (controller) {
          await controller.acquire();
        }

        if (!canExecuteTask(currentTask!)) {
          addToPendingTasks(currentTask!);
          continue;
        }
  
        if (activeTasks.has(targetId)) {
          addToPendingTasks(currentTask!);
          continue;
        }
  
        const taskPromise = executor.executeTask(currentTask!).finally(() => {
          activeTasks.delete(targetId);
          if (controller) {
            controller.release();
          }
          if (!completedTasks.has(targetId)) {
            completedTasks.set(targetId, []);
          }
          completedTasks.get(targetId)!.push(action);
  
          const nextTasks = pendingTasks.get(targetId);
          if (nextTasks && nextTasks.peek()) {
            const nextTask = nextTasks.dequeue()!;
            taskQueue.enqueue(nextTask);
          }
        });
  
        activeTasks.set(targetId, taskPromise);
        await taskPromise;
      }
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
