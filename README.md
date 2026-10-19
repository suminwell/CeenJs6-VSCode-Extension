# CeenJs6

在 VSCode 中连接 Android 上的 [CeenJs6](https://github.com/suminwell/CeenJs6)，运行、停止、保存脚本，同步项目并查看设备日志。

- 插件 ID：`yeceen.ceenjs6`
- 当前发行号：`1.0.14.1`；市场版本：`1.0.14001`
- VSCode：1.85.0 或更高版本
- Android 客户端：CeenJs6 6.7.0，内部版本号 3804 或更高版本
- [Marketplace](https://marketplace.visualstudio.com/items?itemName=yeceen.ceenjs6) · [下载 VSIX](https://github.com/suminwell/CeenJs6-VSCode-Extension/releases) · [反馈问题](https://github.com/suminwell/CeenJs6-VSCode-Extension/issues)

## 安装

在 VSCode 扩展中搜索 `@id:yeceen.ceenjs6` 并安装，或执行：

```sh
code --install-extension yeceen.ceenjs6
```

也可在扩展菜单中选择“从 VSIX 安装”。CeenJs6 与原 AutoJs6 扩展使用相同的设备端口，请禁用原扩展，并只在一个 VSCode 窗口启用设备监听。

## 连接设备

打开命令面板，执行 **CeenJs6: 建立设备连接 (Connect)**，选择以下方式之一：

1. **CeenJs6 客户端 / 局域网**：在设备侧拉菜单开启“客户端模式”，输入扩展显示的电脑 IP。电脑监听 TCP 6347。
2. **CeenJs6 服务端 / 局域网**：在设备侧拉菜单开启“服务端模式”，在扩展中输入设备 IP。设备监听 TCP 7347。
3. **CeenJs6 服务端 / ADB**：电脑安装并配置 `adb`，通过 USB 连接设备并授权 USB 调试；在 CeenJs6 开启“服务端模式”后选择 ADB 设备。

连接成功后，设备日志显示在“输出”面板。支持多个设备同时运行、停止及保存脚本，也可使用“指定设备运行”和“保存到指定设备”。

## 常用操作

| 命令 | 快捷键 |
| --- | --- |
| 运行脚本 | F6 |
| 停止当前脚本 | Ctrl+F6 |
| 停止所有脚本 | Ctrl+Shift+F6 |
| 建立设备连接 | Ctrl+Alt+F6；macOS 为 Ctrl+Cmd+F6 |
| 运行项目 | Alt+F6；macOS 为 Cmd+F6 |
| 新建项目 | Ctrl+Alt+6 N；macOS 为 Ctrl+Cmd+6 N |
| 保存项目 | Ctrl+Alt+6 S；macOS 为 Ctrl+Cmd+6 S |

支持编辑器标题按钮和资源管理器右键菜单。运行项目时需要根目录的 `project.json`。插件提供远程运行、日志和同步功能，尚未实现 VSCode 断点调试或“命令层级”功能。

## 新建项目与智能补全

执行“CeenJs6: 新建项目”，选择目录，然后在生成的目录运行：

```sh
npm install
```

模板使用 `app.ceenjs`、`org.ceenjs.ceenjs6`，并从你自己的 [CeenJs6 声明文件仓库](https://github.com/suminwell/CeenJs6-TypeScript-Declarations) 固定提交 `f0cf7b1b5ad493fe1bcb8d909d1abc9b3bb0d875` 安装 `ceenjs6` 声明，不依赖未发布的 npm 版本。`npm run dts` 等同于安装项目依赖；`npm run dts-link` 可选择全局安装并创建声明目录软链接，不会删除已有的普通目录。

声明文件包含较新的扩展 API，补全提示不代表当前 6.7.0 客户端已经支持该能力，详见声明仓库的 [兼容性说明](https://github.com/suminwell/CeenJs6-TypeScript-Declarations/blob/f0cf7b1b5ad493fe1bcb8d909d1abc9b3bb0d875/docs/COMPATIBILITY.md)。

## 本机 HTTP 控制（可选）

默认关闭。启用设置 `ceenjs6.enableHttpControl` 并重新加载窗口后，可从本机访问：

```sh
curl 'http://127.0.0.1:10347/exec?cmd=stopAll'
```

支持现有命令名称和可选 `path` 参数；接口只监听本机回环地址。设备连接仍通过上述 TCP 或 ADB 方式建立。

## 开发

```sh
npm ci
npm test
npm run package
```

发行号使用“上游三段版本 + CEEN 修订号”：`1.0.14.1`、`1.0.14.2`；合并上游 `1.0.15` 后从 `1.0.15.1` 重新开始。Marketplace 仅接受三段版本，因此第三段按 `上游补丁号 × 1000 + 修订号` 自动生成，例如 `1.0.15.1 → 1.0.15001`。

发布流程见 [PUBLISHING.md](PUBLISHING.md)，版本记录见 [CHANGELOG.md](CHANGELOG.md)。

## 来源与许可证

本项目 fork 自 [SuperMonster003/AutoJs6-VSCode-Extension](https://github.com/SuperMonster003/AutoJs6-VSCode-Extension)，上游源自 [hyb1996/Auto.js-VSCode-Extension](https://github.com/hyb1996/Auto.js-VSCode-Extension)。保留上游作者署名与历史记录，遵循仓库中的 [GPL-3.0 许可证](LICENSE)。本扩展由 yeceen 发布，服务于 suminwell/CeenJs6，独立于上游项目。
