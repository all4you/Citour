require('dotenv').config({ path: 'apps/server/.env' });
const axios = require('axios');

async function verify() {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;
    const baseToken = process.env.FEISHU_BASE_TOKEN;

    console.log('Verifying configuration...');
    console.log(`App ID: ${appId}`);
    console.log(`Base Token: ${baseToken}`);

    if (baseToken === 'basxxx') {
        console.error('ERROR: Base Token is still "basxxx". Please update it with your actual Base Token.');
        return;
    }

    // 1. Get Token
    let token;
    try {
        const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: appId,
            app_secret: appSecret
        });
        if (res.data.code !== 0) {
            console.error(`ERROR: Failed to get Access Token. ${res.data.msg}`);
            return;
        }
        token = res.data.tenant_access_token;
        console.log('SUCCESS: Authentication successful.');
    } catch (err) {
        console.error('ERROR: Network or Auth error', err.message);
        return;
    }

    // 2. List Tables
    try {
        const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${baseToken}/tables`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.code !== 0) {
            console.error(`ERROR: Failed to list tables. ${res.data.msg}`);
            return;
        }

        const tables = res.data.data.items.map(t => t.name);
        console.log('Found Tables:', tables.join(', '));

        const required = ['Tenants', 'Users', 'Wordbooks', 'Words', 'Practice Records', 'Practice Details'];
        const missing = required.filter(r => !tables.includes(r));

        if (missing.length > 0) {
            console.error(`ERROR: Missing tables: ${missing.join(', ')}`);
        } else {
            console.log('SUCCESS: All required tables found.');
        }

    } catch (err) {
        console.error('ERROR: Failed to access Base.', err.message);
    }
}

verify();
