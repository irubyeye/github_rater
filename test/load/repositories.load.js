const autocannon = require('autocannon');

const baseUrl = process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000';
const duration = Number(process.env.LOAD_TEST_DURATION_SECONDS || 20);
const connections = Number(process.env.LOAD_TEST_CONNECTIONS || 10);

const instance = autocannon({
  url: `${baseUrl}/repositories?language=TypeScript&createdAfter=2024-01-01&page=1&limit=20`,
  connections,
  duration
});

autocannon.track(instance, { renderProgressBar: true });

instance.on('done', (result) => {
  const summary = {
    requestsPerSecond: result.requests.average,
    latencyP95Ms: result.latency.p95,
    latencyP99Ms: result.latency.p99,
    errors: result.errors,
    non2xx: result.non2xx
  };

  console.log('\nLoad test summary');
  console.log(JSON.stringify(summary, null, 2));

  if (result.errors > 0 || result.non2xx > 0) {
    process.exit(1);
  }
});
