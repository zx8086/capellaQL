import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    // { duration: '1m30s', target: 25 },
    // { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'], // 95% of requests should be below 50ms
  },
};

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;
console.log(BASE_URL);

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}