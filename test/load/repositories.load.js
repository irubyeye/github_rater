const autocannon = require('autocannon');

const baseUrl = process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000';
const duration = Number(process.env.LOAD_TEST_DURATION_SECONDS || 20);
const connections = Number(process.env.LOAD_TEST_CONNECTIONS || 10);
const limit = Number(process.env.LOAD_TEST_LIMIT || 20);
const noCache = process.env.LOAD_TEST_NO_CACHE === 'true';
const language = process.env.LOAD_TEST_LANGUAGE || 'TypeScript';
const page = Number(process.env.LOAD_TEST_PAGE || 1);
const createdAfter = process.env.LOAD_TEST_CREATED_AFTER || '2024-01-01';

let sequence = 0;

function buildPath() {
  if (!noCache) {
    return `/repositories?language=${encodeURIComponent(language)}&createdAfter=${encodeURIComponent(createdAfter)}&page=${page}&limit=${limit}`;
  }

  sequence += 1;
  const uniqueCreatedAfter = new Date(Date.UTC(2024, 0, 1, 0, 0, sequence)).toISOString();
  return `/repositories?language=${encodeURIComponent(language)}&createdAfter=${encodeURIComponent(uniqueCreatedAfter)}&page=${page}&limit=${limit}`;
}

const instance = autocannon({
  url: baseUrl,
  requests: [
    {
      method: 'GET',
      path: buildPath(),
      setupRequest: (req) => ({
        ...req,
        path: buildPath()
      })
    }
  ],
  connections,
  duration
});

autocannon.track(instance, { renderProgressBar: true });

instance.on('done', (result) => {
  const summary = {
    requestsPerSecond: result.requests.average,
    latencyP95Ms: result.latency.p95,
    latencyP99Ms: result.latency.p99,
    limit,
    noCache,
    errors: result.errors,
    non2xx: result.non2xx
  };

  console.log('\nLoad test summary');
  console.log(JSON.stringify(summary, null, 2));

  if (result.errors > 0 || result.non2xx > 0) {
    process.exit(1);
  }
});
