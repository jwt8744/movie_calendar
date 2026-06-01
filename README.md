# 2026 Movie Calendar Site

这是一个可直接部署到 Cloudflare Pages 的静态站目录。

## 目录

- `index.html` 页面入口
- `styles.css` 样式
- `movies.js` 片单快照数据
- `script.js` 页面渲染逻辑

## 部署到 Cloudflare Pages

如果使用 Direct Upload：

1. 在 Cloudflare Pages 新建项目
2. 选择 `Upload assets`
3. 上传 `calendar-site` 目录内的全部文件
4. 绑定自定义域名 `calendar.captainland.icu`

如果使用 Git：

1. 把本项目推到 Git 仓库
2. Pages 项目连接该仓库
3. Build command 留空
4. Output directory 设为 `calendar-site`
