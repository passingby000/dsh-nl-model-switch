# dsh-nl-model-switch

用一句自然语言切换当前 DSH 会话的模型（独立于任何 IM 桥），例如：

- `切换到 deepseek-v4-flash 模型`
- `切到 deepseek-v4-pro`
- `换到 glm-5.3 模型做 xxx 任务`
- `switch to deepseek-v4-flash model`

## 原理

- 注册一个模型可调用的工具 `switch_model(provider, model)`。
- 工具内部调用与原生 `/model` 相同的公开面
  `ctx.apiProxy.sessions.selectModel({ sessionId, provider, model })`，
  设置会话级模型选择，**在下次 prompt 组装边界生效，并保留同一会话/上下文**。
- 系统提示词段指导模型：当用户用自然语言请求换模型时调用 `switch_model`，
  切换后明确确认（如「已从 xxx 切换到 xxx」）并继续用户的请求。
- `tools/result` 处理器在 `switch_model` 成功后结束旧模型当前回合，并为**新模型**
  开启一个新回合，由其发送确认并接续处理原请求。外部看到仍是普通的一问一答。

## 依赖注入

`inject: ['tools', 'systemPrompt', 'llm', 'apiProxy']`（`tools`、`systemPrompt`
与 `apiProxy` 由 DSH 宿主提供；`llm` 保留以备未来校验调用）。

## 安装位置（重要：必须放在 profile 内，不能用 link:）

- **运行副本（实目录）**：`C:\Users\PC\.dsh\profiles\web\node_modules\dsh-nl-model-switch\`
  - 这是 DSH 实际加载的目录，必须是**真实目录**，不能是指向外部路径的
    `link:` / junction。
  - 原因：本插件 import `@deepseek-ai/dsh-tools` / `@deepseek-ai/dsh-llm`，
    它们只能从 realpath 位于 `C:\Users\PC\.dsh\profiles\...` 之下的文件解析到
    （向上可找到 `C:\Users\PC\.dsh\profiles\node_modules\@deepseek-ai`）。
    若用 `link:` 指向 `D:\...`，realpath 在 D 盘，找不到 `@deepseek-ai` →
    开机报 `ERR_MODULE_NOT_FOUND`。
- **编辑用源码镜像**：`D:\DeepSeekTools\dsh-nl-model-switch\`
  修改后请把 `lib\`、`package.json`、`cordis.patch.yml` 同步复制回上面的运行副本。
- 注册方式：只加入 `dsh.profile.bundles` 列表，**不要**加入 `dependencies`
  （`dsh plugin add <dir>` 会产生 `link:` 依赖，正是上面的坑）。

## 使用前提 / 重启

1. 重启 `dsh web` 使新 bundle 激活（本 Agent 不会杀掉运行中的 dsh web）。
2. 确认目标模型已在 `settings.yaml` 的 `llm-pi-ai.providers.*.models` 里注册
   （当前：`deepseek-v4-flash` / `deepseek-v4-pro` / `glm-5.3`）。

## 已知限制

- 切换指令先作为一次普通用户消息发给当前模型，由模型决定调用 `switch_model`；
  依赖模型正确识别 `switch_model` 工具（系统提示词已引导）。
- 若模型未调用工具，只用一句话描述「已切换」，切换不会真正发生。
- 与原生 `/model` 共享同一会话级选择机制；两者互补。
- 普通消息不受影响（只有模型决定调用 `switch_model` 时才走切换路径）。
