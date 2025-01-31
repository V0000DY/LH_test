import { IExecutor } from './Executor';
import Executor from './Executor';
import ITask from './Task';
import ITaskExt from '../test/ITaskExt';

const threads = 3;


const mockQueue: ITask[] = [
  { targetId: 4, action: 'init' }, { targetId: 0, action: 'init' }, { targetId: 1, action: 'init' },
  { targetId: 6, action: 'init' }, { targetId: 1, action: 'prepare' }, { targetId: 8, action: 'init' },
  { targetId: 6, action: 'prepare' }, { targetId: 2, action: 'init' }, { targetId: 0, action: 'prepare' },
  { targetId: 5, action: 'init' }, { targetId: 3, action: 'init' }, { targetId: 7, action: 'init' },
  { targetId: 7, action: 'prepare' }, { targetId: 3, action: 'prepare' }, { targetId: 0, action: 'work' },
  { targetId: 8, action: 'prepare' }, { targetId: 3, action: 'work' }, { targetId: 4, action: 'prepare' },
  { targetId: 9, action: 'init' }, { targetId: 2, action: 'prepare' },
  { targetId: 5, action: 'prepare' }, { targetId: 0, action: 'finalize' }, { targetId: 2, action: 'work' },
  { targetId: 8, action: 'work' }, { targetId: 8, action: 'finalize' }, { targetId: 4, action: 'work' },
  { targetId: 8, action: 'cleanup' }, { targetId: 9, action: 'prepare' }, { targetId: 0, action: 'cleanup' },
  { targetId: 5, action: 'work' }, { targetId: 1, action: 'work' }, { targetId: 5, action: 'finalize' },
  { targetId: 1, action: 'finalize' }, { targetId: 3, action: 'finalize' }, { targetId: 7, action: 'work' },
  { targetId: 2, action: 'finalize' }, { targetId: 6, action: 'work' }, { targetId: 2, action: 'cleanup' },
  { targetId: 3, action: 'cleanup' }, { targetId: 6, action: 'finalize' }, { targetId: 4, action: 'finalize' },
  { targetId: 7, action: 'finalize' }, { targetId: 4, action: 'cleanup' }, { targetId: 5, action: 'cleanup' },
  { targetId: 6, action: 'cleanup' }, { targetId: 7, action: 'cleanup' }, { targetId: 9, action: 'work' },
  { targetId: 9, action: 'finalize' }, { targetId: 9, action: 'cleanup' }, { targetId: 1, action: 'cleanup' },
  { targetId: 10, action: 'init' }, { targetId: 10, action: 'prepare' }, { targetId: 10, action: 'work' },
  { targetId: 10, action: 'finalize' }, { targetId: 10, action: 'cleanup' }, { targetId: 11, action: 'init' },
  { targetId: 11, action: 'prepare' }, { targetId: 11, action: 'work' }, { targetId: 11, action: 'finalize' },
  { targetId: 11, action: 'cleanup' }
];

function getQueue(maxThreads = 0) {
  const q = mockQueue.map(t => {
      const item: ITaskExt = { ...t };
      item._onExecute = () => item.running = true;
      item._onComplete = () => {
          delete item.running;
          item.completed = true;
      };
      return item;
  });

  return {
      [Symbol.asyncIterator]() {
          let i = 0;
          return {
              async next() {
                  while (q[i] && (q[i].completed || q[i].acquired)) {
                      i++;
                  }
                  if (i < q.length) {
                      if (i && i % maxThreads === 0) {
                          await new Promise(r => setTimeout(r, 100));
                      }
                      const value = q[i++];
                      if (value) {
                          value.acquired = true;
                      }
                      return {
                          done: false,
                          value
                      };
                  } else {
                      return {
                          done: true,
                          value: undefined as unknown as ITaskExt
                      };
                  }
              }
          };
      },
      q
  };
}

const mockAsyncQueue = getQueue(threads);

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
    // console.log(`Состояние семафора: current = ${this.current}, max = ${this.max}`);
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

export default async function mockRun(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
  maxThreads = Math.max(0, maxThreads);
  /**
   * Код надо писать сюда
   * Тут что-то вызываем в правильном порядке executor.executeTask для тасков из очереди queue
   */
  
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
      pendingTasks.set(targetId, new Queue());
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
    
        // console.log(`Запущена задача id = ${targetId}, тип = ${action} активных потоков = ${[...activeTasks].length}`);
        if (controller) {
          console.log(`Задача id = ${targetId}, тип = ${action} встала перед семафором`);
          await controller.acquire();
        }
        // console.log(`Задача прошла семафор id = ${targetId}, тип = ${action} активных потоков = ${[...activeTasks].length}`);

        if (!canExecuteTask(currentTask!)) {
          // console.log(`Задача id = ${targetId} с типом = ${action} не может быть выполнена, предыдущие задачи не выполнены! Закинули задачу в массив pendingTasks = ${pendingTasks.get(targetId)}`);
          addToPendingTasks(currentTask!);
          continue;
        }
  
        if (activeTasks.has(targetId)) {
          // console.log(`Задача с id = ${targetId} сейчас на выполнении в activeTasks, тип задачи = ${action} ушедшей в очередь на выполнение`);
          addToPendingTasks(currentTask!);
          continue;
        }
  
        const taskPromise = executor.executeTask(currentTask!).finally(() => {
          activeTasks.delete(targetId);
          console.log(`Задача id = ${targetId} выполнена, тип задачи = ${action} активных потоков = ${[...activeTasks].length}`);
          if (controller) {
            controller.release();
          }
          if (!completedTasks.has(targetId)) {
            completedTasks.set(targetId, []);
          }
          completedTasks.get(targetId)!.push(action);
  
          const nextTasks = pendingTasks.get(targetId);
          if (nextTasks && nextTasks.peek()) {
            // console.log(`Есть невыполненные задачи в очереди на выполнение с id = ${targetId}`);
            const nextTask = nextTasks.dequeue()!;
            // console.log(`Удаляем задачу ${JSON.stringify(nextTask, null, 2)} из pendingTasks`);
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

  console.log(completedTasks.get(11));

  return { completedTasks };
  // const result: Record<any, string[]> = {};

  // for (const [key, value] of Object.entries(completedTasks)) {
  //   result[key] = value;
  // }

  // return  completedTasks;

  // for await (const task of queue) {
  //   processTask(task);
  // }

  // await Promise.all(activeTasks.values());

}

mockRun(new Executor, mockAsyncQueue, threads);
