
import { Worker } from 'node:worker_threads'


type WorkerInstance = {
    name: string;
    worker: Worker;
    data?: Record<string, string | number>;
}

type LaunchWorkerOptions = {
    name?: string;
    data?: Record<string, string | number>
}

const workerInstances = [] as WorkerInstance[];

export function useWorker() {

    const getWorker = (name: string) => {
        return workerInstances.find((w)=> w.name === name);
    }

    const launchWorker = (script: string, opts?: LaunchWorkerOptions) => {

        const worker = new Worker(script, {
            name: opts?.name,
            workerData: opts?.data
        });

        workerInstances.push({
            name: opts?.name || script,
            worker: worker,
            data: opts?.data
        })

        return worker
    }

    const closeWorker = async () => {
        for( const w of workerInstances){
            w.worker.terminate()
        }
    }

    return {
        getWorker,
        launchWorker,
        closeWorker
    }
}

