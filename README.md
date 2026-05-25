# 灵感管理｜本地离线版

一个本地运行的灵感管理应用，支持：

- 新建 / 删除 / 重命名数据空间
- 灵感块添加、拖拽、编辑、删除
- 灵感块自由连线，重复点击同一对删除连线
- 皇冠高亮属性
- 标签添加、编辑、删除和绑定
- 灵感面板统计
- 鼠标滚轮缩放灵感空间
- 鼠标左键拖动画布
- “全部清空”：删除当前空间内普通灵感块，保留皇冠高亮灵感块
- 本地 JSON 数据保存，不依赖服务器

## 本地运行

先安装 Node.js，然后在项目根目录执行：

```bash
npm install
npm run start
```

## 打包 Windows EXE

在 Windows 电脑上执行：

```bash
npm install
npm run dist:win
```

生成文件会出现在：

```text
release/
```

通常会生成安装版 `.exe` 和便携版 `.exe`。

## 上传 GitHub 后自动构建 EXE

项目已包含 GitHub Actions：

```text
.github/workflows/build-windows.yml
```

上传到 GitHub 后，可以在 Actions 页面手动运行 `Build Windows EXE`，或者推送到 `main/master` 分支后自动构建。构建完成后，在该次 Action 的 Artifacts 里下载 EXE 文件。

## 数据保存位置

应用会把数据保存到 Electron 的 `userData` 目录，文件名：

```text
inspiration-data.json
```

该目录由系统决定，通常位于当前用户的应用数据目录中。应用不需要联网，数据不会主动上传。

## 数据安全建议

这个版本是本地离线保存，不会主动联网，但没有做文件级加密。重要数据建议定期备份 `inspiration-data.json`。如果后续需要更高安全性，可以增加“启动密码 + 本地加密存储”。
