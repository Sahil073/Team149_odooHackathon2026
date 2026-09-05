import http from 'http';
import { app } from './app';

async function runAiRouteTest() {
    console.log('[test-ai] Starting temporary HTTP server for Express app...');
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const addr = server.address();
    if (!addr || typeof addr === 'string') {
        throw new Error('Server failed to start');
    }

    const port = addr.port;
    console.log(`[test-ai] Test server listening on http://127.0.0.1:${port}`);

    async function makeRequest(payload: any) {
        const dataStr = JSON.stringify(payload);
        return new Promise<{ status: number; body: any }>((resolve, reject) => {
            const req = http.request(
                {
                    hostname: '127.0.0.1',
                    port,
                    path: '/api/ai/win-probability',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(dataStr),
                    },
                },
                (res) => {
                    let chunks = '';
                    res.on('data', (d) => (chunks += d));
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(chunks);
                            resolve({ status: res.statusCode || 500, body: parsed });
                        } catch (e) {
                            reject(e);
                        }
                    });
                }
            );
            req.on('error', reject);
            req.write(dataStr);
            req.end();
        });
    }

    console.log('\n[test-ai] Case 1: Testing Gold Tier Customer, 10% discount:');
    const res1 = await makeRequest({
        customerTier: 'Gold',
        totalRevenue: 15000,
        avgDiscountPct: 10,
        itemCount: 4,
        riskScore: 0.1,
    });
    console.log('Response Status:', res1.status);
    console.log('Response Body:', res1.body);

    if (res1.status === 200 && res1.body.winProbability >= 0.70) {
        console.log('✅ Case 1 Passed! High probability returned.');
    } else {
        console.error('❌ Case 1 Failed!');
    }

    console.log('\n[test-ai] Case 2: Testing Bronze Tier Customer, 30% discount breach:');
    const res2 = await makeRequest({
        customerTier: 'Bronze',
        totalRevenue: 40000,
        avgDiscountPct: 30,
        itemCount: 1,
        riskScore: 0.75,
    });
    console.log('Response Status:', res2.status);
    console.log('Response Body:', res2.body);

    if (res2.status === 200 && res2.body.winProbability < 0.45) {
        console.log('✅ Case 2 Passed! Low probability / AT_RISK correctly detected.');
    } else {
        console.error('❌ Case 2 Failed!');
    }

    server.close();
    console.log('\n[test-ai] All Express AI endpoint tests completed successfully!');
    process.exit(0);
}

runAiRouteTest().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
});

