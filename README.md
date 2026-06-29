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

## Cloudflare Pages

当前生产地址：

```text
https://seachat-5ux.pages.dev
```

## GitHub Actions 部署到 Cloudflare Pages

仓库需要配置两个 GitHub Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

当前 Cloudflare account id：

```text
13f20cec526e8dc571fa05993ec667be
```

手动部署：

```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=13f20cec526e8dc571fa05993ec667be npx wrangler@3 pages deploy dist --project-name seachat --branch main
```

配置完成后，push 到 `main` 会触发 `.github/workflows/deploy.yml` 自动构建并部署到 Cloudflare Pages Production。
