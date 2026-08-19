<p align="center">
  <strong>dsh-nl-model-switch</strong>
  <br/>
  <sub>用自然语言切换 DSH 会话模型，不用离开对话界面，不用记命令。</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-nl-model-switch"><img src="https://img.shields.io/npm/v/dsh-nl-model-switch?color=blue" alt="npm"></a>
  <a href="https://github.com/passingby000/dsh-nl-model-switch/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
</p>

---

## 这是什么？

DSH 原生支持 `/model` 弹窗切换模型，但每次都要中断思路去点选。**dsh-nl-model-switch** 让你在对话中直接说一句「切到 xxx 模型」，模型自动切换，会话上下文完整保留，新模型无缝接续当前任务。

有问题或想开发的功能？[提个 Issue](https://github.com/passingby000/dsh-nl-model-switch/issues)。

## 特性

- **自然语言一句话切换** — 说「切到 deepseek-v4-flash」「换到 glm-5.3 做翻译」「switch to deepseek-v4-pro」即可
- **上下文完整保留** — 切换在同一会话内完成，对话历史不丢失
- **新模型无缝接续** — 切换后新模型会确认切换并继续处理你刚才的请求
- **与原生 /model 互补** — 底层走同一个会话级模型选择接口，两者共存
- **零 UI 依赖** — 纯宿主插件，不修改客户端界面

## 安装

```bash
dsh plugin add dsh-nl-model-switch
```

安装后重启 `dsh web` 即可生效。

## 使用

在对话中直接用自然语言说：

```
切换到 deepseek-v4-flash 模型
切到 deepseek-v4-pro
换到 glm-5.3，帮我翻译这段文字
用 deepseek-v4-flash 模型重新回答
switch to deepseek-v4-flash model
```

模型会调用 `switch_model` 工具完成切换，新模型确认后继续你的请求。

## 前提

- 目标模型已在 DSH 的 `settings.yaml` 中注册（`providers.*.models` 列表里）
- 模型需要能识别并调用 `switch_model` 工具（主流模型均支持）

## 贡献者

<p align="left">
  <a href="https://github.com/passingby000"><img src="https://avatars.githubusercontent.com/passingby000" width="40" height="40" style="border-radius:50%" alt="passingby000"/></a>
  <a href="https://github.com/deepseek-ai"><img src="https://avatars.githubusercontent.com/deepseek-ai" width="40" height="40" style="border-radius:50%" alt="DeepSeek"/></a>
</p>

## 许可

MIT