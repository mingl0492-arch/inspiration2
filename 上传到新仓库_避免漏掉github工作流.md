# 上传到新仓库：避免漏掉 `.github` 文件夹

GitHub Actions 必须依赖这个文件：

```text
.github/workflows/build-windows.yml
```

如果 Actions 页面一直显示 “Get started with GitHub Actions”，就说明这个文件没有上传成功。

## 最推荐方式：用 GitHub Desktop 上传

1. 安装并登录 GitHub Desktop。
2. 解压本项目压缩包。
3. 在 GitHub Desktop 里选择：
   File → Add local repository
4. 选择解压后的项目文件夹。
5. 如果提示不是 Git 仓库，选择创建仓库。
6. Commit all。
7. Publish repository。

GitHub Desktop 会正常提交 `.github` 这种点开头文件夹，不容易漏。

## 命令行方式

在解压后的项目文件夹里执行：

```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

`git add -A` 会包含 `.github` 文件夹。

## 如果你必须网页上传

网页上传后，进入仓库 Code 页面检查是否有：

```text
.github/workflows/build-windows.yml
```

如果没有：

1. 点 Add file → Create new file
2. 文件名输入：
   `.github/workflows/build-windows.yml`
3. 把根目录里的 `build-windows.workflow.yml` 内容复制进去
4. Commit changes

然后进入 Actions，就会出现 Build Windows EXE。
