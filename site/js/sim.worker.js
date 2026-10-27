/// <reference lib="webworker" />
import { simulate } from "./runner.js";
import { createRng } from "./rng.js";

export const BATCH_SIZE = 100;

export type RunConfig = Parameters<typeof simulate>[0];

type ProgressMessage = { type: "progress"; completed: number; total: number };
type ResultMessage = { type: "result"; result: ReturnType<typeof simulate>; stoppedEarly: boolean };

const post = (msg: ProgressMessage | ResultMessage) =>
  (self as unknown as { postMessage: (m: unknown) => void }).postMessage(msg);

self.onmessage = (event: MessageEvent) => {
  const { config, batchSize = BATCH_SIZE } = event.data as { config: RunConfig; batchSize?: number };
  const seed = config.seed ?? 1;
  const totalBatches = Math.max(1, Math.ceil(config.sims / batchSize));
  let batch = 0;
  let prevShare = -1;
  let stoppedEarly = false;

  const finish = (result: ReturnType<typeof simulate>) => post({ type: "result", result, stoppedEarly });

  const runBatch = () => {
    const start = batch * batchSize;
    const n = Math.min(batchSize, config.sims - start);
    const result = simulate({ ...config, sims: n, rng: createRng(seed + batch) });
    const share = result.top?.title ?? 0;
    batch += 1;
    post({ type: "progress", completed: start + n, total: config.sims });

    const converged = config.converge && batch >= 2 && Math.abs(share - prevShare) < 0.001;
    prevShare = share;

    if (converged) {
      stoppedEarly = true;
      return finish(result);
    }
    if (batch < totalBatches) {
      return runBatch();
    }
    finish(simulate({ ...config, rng: createRng(seed) }));
  };

  runBatch();
};

self.postMessage({ type: "ready" });
