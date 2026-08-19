/**
 * dsh-nl-model-switch
 *
 * Switch the current DSH session's model using a natural-language sentence
 * (e.g. "切换�?deepseek-v4-flash 模型�?X 任务"), independent of any IM bridge.
 *
 * Design:
 *  - A model-facing `switch_model(provider, model)` tool whose execute calls the
 *    SAME public `session.selectModel` surface the native `/model` popup uses
 *    (`ctx.apiProxy.sessions.selectModel`). This sets the agent-level model
 *    selection, which takes effect at the next prompt-assembly boundary while
 *    preserving the current session/context.
 *  - A system-prompt section that tells every model: when the user asks to
 *    switch models, call `switch_model`, then the session continues on the new
 *    model for the confirmation and any requested task.
 *  - A `tools/result` handler that, right after `switch_model` succeeds, ends the
 *    current in-flight run on the old model and queues a fresh turn so the NEW
 *    model sends the "已从 A 切换�?B" confirmation and continues the user's task.
 *
 * Host plugin (node), no client UI required.
 */

import { randomUUID } from 'node:crypto';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { createUserMessage } from '@deepseek-ai/dsh-llm';

export const name = 'dsh-nl-model-switch';
export const inject = ['tools', 'systemPrompt', 'llm', 'apiProxy'];

const SWITCH_TOOL_NAME = 'switch_model';

/** Extract plain text from a user message content-block array. */
function messageText(content) {
  return (content ?? [])
    .filter((block) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/** Most recent user request text in the agent's session. */
function lastUserRequestText(agent) {
  if (!agent?.session) return '';
  for (const event of [...agent.session.events].reverse()) {
    if (event?.type !== 'user/message') continue;
    const text = messageText(event.data?.content);
    if (text) return text;
  }
  return '';
}

export function apply(ctx) {
  // Per-agent record of the latest in-flight switch so the tools/result handler
  // knows what to confirm once the native selection is applied.
  const pendingSwitch = new Map();

  ctx.on('tools/result', (exec, result) => {
    if (exec?.name !== SWITCH_TOOL_NAME || result?.isError) return;
    const agent = exec.agent;
    if (!agent) return;
    const record = pendingSwitch.get(agent);
    if (!record) return;
    pendingSwitch.delete(agent);

    const requestText = record.requestText || lastUserRequestText(agent);
    const continuation = createUserMessage({
      content: [{
        type: 'text',
        text: [
          '[系统] 本会话模型已切换�?' +
            record.model +
            (record.fromModel ? `（从 ${record.fromModel} 切换）` : '') +
            '，同一会话、上下文完整保留�?,
          '请先一句话确认切换，然后继续完成用户刚刚的请求�?,
          requestText || '（无附加请求�?,
        ].join('\n'),
      }],
      source: { kind: 'continuation' },
    });

    // End the current run on the old model and open a fresh turn so the new
    // model assembles the next request (selection already applied by
    // selectModel). Cancel FIRST, then followup so the continuation turn opens.
    try {
      agent.cancel({ kind: 'hook', reason: 'nl-model-switch' }, { keepInbox: true });
    } catch (_error) {
      // best-effort: followup below still opens the next turn.
    }
    agent.followup(continuation);
  });

  // The model-facing tool: performs the actual switch via the native surface.
  const switchModelTool = defineTool({
    name: SWITCH_TOOL_NAME,
    description:
      'Switch the current conversation to a different model. Call this when the ' +
      'user asks to change/switch/use a different model in natural language ' +
      '(e.g. "切换�?deepseek-v4-flash 模型", "切到 xxx", "换到 xxx �?Y", "switch to xxx model"). ' +
      'Pass the exact registered model id; provider is optional and defaults to the current one. ' +
      'After the switch resolves, confirm the switch and continue any task the user requested.',
    parameters: {
      model: {
        type: 'string',
        required: true,
        description: 'The exact registered model id to switch to (e.g. deepseek-v4-flash, deepseek-v4-pro, glm-5.3).',
      },
      provider: {
        type: 'string',
        description: 'Optional provider id; defaults to the current session provider when omitted.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          switched: { type: 'boolean' },
          provider: { type: 'string' },
          model: { type: 'string' },
          note: { type: 'string' },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: typeof value?.note === 'string' ? value.note : `模型已切换为 ${value?.model ?? ''}`,
      }],
    },
    async execute(args, exec) {
      const agent = exec?.agent;
      if (!agent?.session) throw new Error('switch_model requires an agent session');
      const sessionId = agent.session.id;

      const modelsResponse = await ctx.apiProxy.sessions.models({
        rpcId: randomUUID(),
        payload: { sessionId },
      });
      if (!modelsResponse?.result?.ok) {
        const error = modelsResponse?.result?.error;
        throw new Error(\session.models failed: \: \\);
      }
      const current = modelsResponse.result.value?.current ?? {};
      const provider = args.provider || current.provider;
      if (!provider) throw new Error('could not determine the provider for the requested model');

      const fromModel = current.model ?? '';
      const selectResponse = await ctx.apiProxy.sessions.selectModel({
        rpcId: randomUUID(),
        payload: {
          sessionId,
          provider,
          model: args.model,
        },
      });
      if (!selectResponse?.result?.ok) {
        const error = selectResponse?.result?.error;
        throw new Error(session.selectModel failed: : );
      }

      pendingSwitch.set(agent, {
        fromModel,
        provider,
        model: args.model,
        requestText: lastUserRequestText(agent),
      });

      return {
        switched: true,
        provider,
        model: args.model,
        note: `模型已切换为 ${args.model}（provider ${provider}），会话上下文保留。`,
      };
    },
  });

  const disposeTool = ctx.tools.register(switchModelTool);

  // Tell every model about the switch tool and the intended UX.
  ctx.get('systemPrompt').section({
    name: 'dsh-nl-model-switch',
    order: 10000,
    text: [
      'You have a `switch_model` tool that switches this conversation to a different model',
      '(same session, full context preserved, applies from the next step).',
      'When the user asks to switch/change/use a different model in natural language',
      '(e.g. "切换�?xxx 模型", "切到 xxx", "换到 xxx �?Y", "�?xxx 模型", "switch to xxx model", "use model xxx"),',
      'call `switch_model` with the requested (registered) model id, then continue with any task the user asked for.',
      'After the switch resolves, explicitly confirm the switch (e.g. "已从 xxx 切换�?xxx") and continue the original request.',
    ].join(' '),
  });

  return () => {
    disposeTool();
    pendingSwitch.clear();
  };
}
