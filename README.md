<p align="center">
  <strong>dsh-nl-model-switch</strong>
  <br/>
  <sub>用自然语言切换 DSH 会话模型，不用离开对话界面，不用记命令。</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-nl-model-switch"><img src="https://img.shields.io/npm/v/dsh-nl-model-switch?color=blue" alt="npm"></a>
  <a href="https://github.com/passingby000/dsh-nl-model-switch/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
</p>

---

## 这是什么？

DSH 原生支持 `/model` 弹窗切换模型，但每次都要中断思路去点选。**dsh-nl-model-switch** 让你在对话中直接说一句「切到 xxx 模型」，模型自动切换，会话上下文完整保留，新模型无缝接续当前任务。

它是一个**纯宿主插件、零客户端 UI 依赖**，因此与你用哪种界面无关：Web 面板、TUI，还是通过 IM 桥接的微信 / 飞书等聊天对话框，都能在对话里直接切换当前会话的模型。在不方便操作面板（比如只用手机 IM）时，用一句话就能切模型并继续任务。

有问题或想开发的功能？[提个 Issue](https://github.com/passingby000/dsh-nl-model-switch/issues)。

## 特性

- **自然语言一句话切换** — 说「切到 deepseek-v4-flash」「换到 glm-5.3 做翻译」「switch to deepseek-v4-pro」即可
- **跨界面生效** — Web、TUI、IM 机器人（微信、飞书等）都能用，因为切换发生在会话层，不依赖面板
- **上下文完整保留** — 切换在同一会话内完成，对话历史不丢失
- **新模型无缝接续** — 切换后新模型会确认切换并继续处理你刚才的请求
- **与原生 /model 互补** — 底层走同一个会话级模型选择接口（`sessions.selectModel`），两者共存
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

## 工作原理

- 向模型注册一个 `switch_model(provider, model)` 工具，其执行体调用与原生 `/model` 相同的公开接口 `ctx.apiProxy.sessions.selectModel`，设置会话级模型选择，并在下次 prompt 组装时生效，保留同一会话与上下文。
- 通过 system prompt 引导模型：当用户用自然语言要求换模型时调用 `switch_model`，切换后明确确认并继续用户的请求。
- `tools/result` 处理器在 `switch_model` 成功后结束旧模型当前回合，并以新模型开启一个新回合来发送确认、接续处理原请求。外部看来仍是普通的一问一答。

因为切换发生在**会话层**而非界面层，所以它天然适用于 Web、TUI 以及 IM 桥接的各类聊天界面。

## 故障排查

- 说话后模型没有真的切换：可能是当前模型未正确调用 `switch_model` 工具（只会口头说「已切换」）。可换一个对工具调用支持更好的模型重试。
- 提示模型未注册：确认目标模型 id 已写在 `settings.yaml` 的对应 provider 下。
- 安装后不生效：重启 `dsh web` 让新 bundle 加载。

## 贡献者

<p align="left">
  <a href="https://github.com/passingby000"><img src="https://avatars.githubusercontent.com/passingby000" width="40" height="40" style="border-radius:50%" alt="passingby000"/></a>
  <a href="https://github.com/deepseek-ai"><img src="https://avatars.githubusercontent.com/deepseek-ai" width="40" height="40" style="border-radius:50%" alt="DeepSeek"/></a>
</p>

## 许可

MIT