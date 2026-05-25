# GitHub Actions 生成 Windows EXE 说明

如果 Actions 页面显示 “Get started with GitHub Actions”，说明仓库根目录没有识别到 workflow 文件。

请确认仓库根目录必须是这样的结构：

```text
.github/workflows/build-windows.yml
package.json
src/main.js
src/preload.js
src/index.html
src/styles.css
src/app.js
README.md
SECURITY.md
```

注意：`.github` 文件夹必须在仓库根目录，不可以放在 `inspiration-manager-exe/.github` 这种二级目录里。

## 推荐上传方式

1. 解压这个压缩包。
2. 进入解压后的文件夹。
3. 只上传里面的文件和文件夹到 GitHub 仓库根目录。
4. 不要再额外套一层 `inspiration-manager-exe` 文件夹。

## 触发构建

上传完成后，进入 GitHub：

Actions → Build Windows EXE → Run workflow

或者直接提交一次代码，也会自动构建。

## 下载 EXE

构建完成后，点进成功的 workflow 运行记录，在页面底部找到：

Artifacts → inspiration-manager-windows

下载后解压，里面就是 Windows EXE 文件。
