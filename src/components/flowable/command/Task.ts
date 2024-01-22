export interface Task {
    type: string;
    name: string;
    description: string;
    waitDocumentReady: boolean;

    execute(): any;
}

export abstract class AbstractActionTask implements Task {
    abstract type: string;
    abstract name: string;
    abstract description: string;
    abstract waitDocumentReady: boolean;

    protected constructor() {

    }

    execute(): any {
        throw new Error("Method not implemented.");
    }
}

export abstract class AbstractFuncTask implements Task {
    abstract type: string;
    abstract name: string;
    abstract description: string;
    abstract waitDocumentReady: boolean;

    protected constructor() {

    }

    execute(): any {
        throw new Error("Method not implemented.");
    }
}

export class ClickTask extends AbstractActionTask {
    type: string = 'CLICK';
    selector: string;
    name: string;
    description: string;
    waitDocumentReady: boolean;

    constructor(name: string, description: string, selector: string, waitDocumentReady: boolean = false) {
        super();
        this.name = name;
        this.description = description;
        this.selector = selector;
        this.waitDocumentReady = waitDocumentReady;
    }


    execute(): void {
        let element = document.querySelector(this.selector) as HTMLElement;

        if (element) {
            //element.click();
            element.dispatchEvent(new Event('click', {bubbles: true}));
        }
    }
}

export class InputTask extends AbstractActionTask {
    description: string;
    name: string;
    selector: string;
    text: string;
    waitDocumentReady: boolean;
    type: string = 'INPUT';


    constructor(description: string, name: string, selector: string, text: string, waitDocumentReady: boolean = false) {
        super();
        this.description = description;
        this.name = name;
        this.selector = selector;
        this.text = text;
        this.waitDocumentReady = waitDocumentReady;
    }

    execute(): void {
        let element = document.querySelector(this.selector) as HTMLInputElement;
        if (element) {
            element.focus();
            element.value = this.text;
            // 有些网站会监听input事件做一些事情, 派发事件, 且遵循事件的冒泡机制
            element.dispatchEvent(new Event('input', {bubbles: true}));
        }
    }

}

export class ConditionTask extends AbstractActionTask {
    type: string = 'CONDITION';
    name: string;
    description: string;
    waitDocumentReady: boolean;

    constructor(name: string, description: string, waitDocumentReady: boolean) {
        super();
        this.name = name;
        this.description = description;
        this.waitDocumentReady = waitDocumentReady;
    }

    execute(): any {

    }
}

export class LoopTask extends AbstractFuncTask {
    type: string = 'LOOP';
    name: string;
    description: string;
    waitDocumentReady: boolean;
    task: Task[];
    breakCondition: ConditionTask;

    constructor(name: string, description: string, waitDocumentReady: boolean, task: Task[], breakCondition: ConditionTask) {
        super();
        this.name = name;
        this.description = description;
        this.waitDocumentReady = waitDocumentReady;
        this.task = task;
        this.breakCondition = breakCondition;
    }

    execute(): any {
        while (this.breakCondition.execute() as boolean) {
            this.task.forEach((task) => {
                if (task.waitDocumentReady && document.readyState !== 'complete') {
                    return;
                }
                task.execute();
            });
            if (this.breakCondition) {
                this.breakCondition.execute();
            }
        }
    }
}
