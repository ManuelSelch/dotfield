import { createDefaultProject } from '@/bot-editor/default-project';
import type { BlockState, BotProject } from '@/bot-editor/types';

/** Test-only literal/direct equivalent of the existing expansion.mdsl.
 * Reusable tactic expansion intentionally remains slice 4.
 */
export function directProject(): BotProject {
  const project = createDefaultProject();
  const capture = project.tabs[1],
    template = capture.workspace.blocks.blocks[0].inputs!.BODY.block!;
  const main = project.tabs[0];
  main.slots = [];
  function branch(kind: string, prefix: string): BlockState {
    const root: BlockState = structuredClone(template);
    const slotMap = Object.fromEntries(capture.slots.map((s) => [s.id, `${prefix}${s.id}`]));
    main.slots.push(
      ...capture.slots.map((s) => ({ ...s, id: slotMap[s.id], name: slotMap[s.id] })),
    );
    function visit(b: BlockState) {
      b.id = `${prefix}${b.id}`;
      for (const [field, value] of Object.entries(b.fields ?? {}))
        if (typeof value === 'string' && slotMap[value]) b.fields![field] = slotMap[value];
      if (b.type === 'df_parameter') {
        b.type = 'df_query';
        b.fields = { VALUE: kind };
        delete b.extraState;
      }
      for (const c of Object.values(b.inputs ?? {})) {
        if (c.block) visit(c.block);
        if (c.shadow) visit(c.shadow);
      }
      if (b.next?.block) visit(b.next.block);
    }
    visit(root);
    return root;
  }
  const neutral = branch('neutral', 'n-'),
    enemy = branch('enemy', 'e-');
  neutral.next = { block: enemy };
  main.workspace.blocks.blocks[0].inputs!.BODY.block!.inputs!.BODY = { block: neutral };
  project.tabs = [main];
  project.procedures = [];
  return project;
}
