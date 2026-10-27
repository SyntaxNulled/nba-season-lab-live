/// <reference lib="webworker" />
import { simulate } from "./runner.js";
import { createRng } from "./rng.js";

export const BATCH_SIZE = 100;

function post(msg) {
  self.postMessage(msg);
}

self.onmessage = (event) => {
  const data = event.data || {};
  const config = data.config;
  const batchSize = data.batchSize || BATCH_SIZE;
  const seed = (config && config.seed) || 1;
  const totalBatches = Math.max(1, Math.ceil(config.sims / batchSize));
  let batch = 0;
  let prevShare = -1;
  let stoppedEarly = false;

  function finish(result) {
    post({ type: "result", result: result, stoppedEarly: stoppedEarly });
  }

  function runBatch() {
    const start = batch * batchSize;
    const n = Math.min(batchSize, config.sims - start);
    const result = simulate(Object.assign({}, config, { sims: n, rng: createRng(seed + batch) }));
    const share = (result.top && result.top.title) || 0;
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
    finish(simulate(Object.assign({}, config, { rng: createRng(seed) })));
  };

  runBatch();
};

self.postMessage({ type: "ready" });
