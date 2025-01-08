import { Hono } from "hono";
import { handle } from "hono/vercel";
import fetch from "node-fetch";

const app = new Hono().basePath("/api");

// 中间件：CORS 配置
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "https://www.milkywayidle.com");
  c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 如果是预检请求（OPTIONS），立即返回成功响应
  if (c.req.method === "OPTIONS") {
    return c.text("", 204);
  }

  await next();
});

// 测试路由
app.get("/", (c) => {
  return c.json({ message: "Congrats! You've deployed Hono to Vercel" });
});

// 上传并更新市场书籍的路由
app.post("/upload_market_book", async (c) => {
  try {
    const data = await c.req.json();

    // 获取 base market book
    const baseMarketBookResponse = await fetch(
      "https://raw.githubusercontent.com/holychikenz/MWIApi/main/milkyapi.json"
    );

    if (!baseMarketBookResponse.ok) {
      return c.json({ message: "Error fetching the base market book." }, 500);
    }
    const baseMarketBook = await baseMarketBookResponse.json();

    // 更新 base market book
    const updatedMarketBook = { ...baseMarketBook, ...data };

    // 获取 GitHub 环境变量
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_FILE_PATH } = process.env;
    if (!GITHUB_TOKEN || !GITHUB_REPO || !GITHUB_FILE_PATH) {
      return c.json(
        { message: "GitHub environment variables are not set." },
        500
      );
    }

    // GitHub API URL
    const apiUrl = `https://api.github.com/repos/JO-WTF/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    // 获取文件 SHA 值
    const getFileResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!getFileResponse.ok) {
      return c.json({ message: "Error fetching the file from GitHub." }, 500);
    }

    const fileData = await getFileResponse.json();

    // 更新文件内容
    const updatedContent = btoa(JSON.stringify(updatedMarketBook, null, 2));

    // 提交到 GitHub 的请求体
    const commitData = {
      message: "Update file via Vercel API",
      content: updatedContent,
      sha: fileData.sha,
    };

    // 更新文件到 GitHub
    const updateFileResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(commitData),
    });

    if (updateFileResponse.ok) {
      return c.json({ message: "File updated successfully." });
    } else {
      return c.json({ message: "Failed to update file on GitHub." }, 500);
    }
  } catch (err) {
    console.error(err);
    return c.json(
      { message: "An unexpected error occurred.", error: err.message },
      500
    );
  }
});

// 适配 Hono 到 Vercel
export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
export const OPTIONS = handle(app);
