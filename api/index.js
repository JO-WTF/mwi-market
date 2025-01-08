import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import fs from 'fs';
import fetch from 'node-fetch';

const app = new Hono().basePath('/api')

// 允许来自 https://www.milkywayidle.com 的 CORS 请求
app.use((c, next) => {
  c.res.headers.append('Access-Control-Allow-Origin', 'https://www.milkywayidle.com');
  c.res.headers.append('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
  c.res.headers.append('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return next();
});

app.get('/', (c) => {
  return c.json({ message: "Congrats! You've deployed Hono to Vercel" })
})

app.post('/upload_market_book', async (c) => {
  const data = await c.req.json();
  
  // 获取 base market book
  const baseMarketBookResponse = await fetch('https://raw.githubusercontent.com/holychikenz/MWIApi/main/milkyapi.json');
  if (!baseMarketBookResponse.ok) {
    return c.json({ message: 'Error fetching the base market book.' }, 500);
  }
  const baseMarketBook = await baseMarketBookResponse.json();

  // 更新 base market book
  const updatedMarketBook = { ...baseMarketBook, ...data };

  // 获取 GitHub 仓库和文件的路径
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_FILE_PATH } = process.env;

  // GitHub API 端点
  const apiUrl = `https://api.github.com/repos/JO-WTF/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

  // 获取当前文件的内容和 SHA 值
  const getFileResponse = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });

  if (!getFileResponse.ok) {
    return c.json({ message: 'Error fetching the file from GitHub.' }, 500);
  }

  const fileData = await getFileResponse.json();

  // 更新文件内容
  const updatedContent = Buffer.from(JSON.stringify(updatedMarketBook, null, 2)).toString('base64');
  
  // 提交到 GitHub 的请求体
  const commitData = {
    message: 'Update file via Vercel API',
    content: updatedContent,
    sha: fileData.sha,  // 必须提供文件的 SHA 值，表示你要更新的文件
  };

  // 发送更新请求到 GitHub
  const updateFileResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(commitData),
  });

  if (updateFileResponse.ok) {
    return c.json({ message: 'File updated successfully.' });
  } else {
    return c.json({ message: 'Failed to update file on GitHub.' }, 500);
  }
});

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const OPTIONS = handler;