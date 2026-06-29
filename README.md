# 投资估值分析台

一个静态部署的投资估值分析网站，支持 DCF、估值倍数、安全边际和情景对比。当前版本不拉取实时行情，所有输入都由用户手动填写，避免引入金融数据 API 密钥和额外后端。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Actions 部署到 Vercel

仓库需要配置三个 GitHub Secrets：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

获取方式：

```bash
npm i -g vercel
vercel login
vercel link
cat .vercel/project.json
```

`project.json` 里有 `orgId` 和 `projectId`。`VERCEL_TOKEN` 在 Vercel Account Settings 的 Tokens 页面创建。

配置完成后，push 到 `main` 会触发 `.github/workflows/deploy.yml` 自动构建并部署到 Vercel Production。
