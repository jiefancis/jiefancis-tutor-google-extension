import {Task} from "./Task";

export class TaskQueue {

    tasks: Task[];

    constructor(task: Task[] = []) {
        this.tasks = task;
    }

    add(task: Task) {
        this.tasks.push(task);
    }

    execute() {
        this.tasks.forEach((task) => {
            if (task.waitDocumentReady && document.readyState !== 'complete') {
                return;
            }
            task.execute();
        });
    }
}
