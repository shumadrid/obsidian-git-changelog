import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';

import { FILE_CHANGELOG_VIEW_CONFIG } from 'Views/FileChangelog/FileChangelog.ts';
import { VAULT_CHANGELOG_VIEW_CONFIG } from 'Views/VaultChangelog/VaultChangelog.ts';

export function addCommands(plugin: GitChangelogPlugin): void {
  const app = plugin.app;

  plugin.addCommand({
    callback: async () => {
      await app.workspace.ensureSideLeaf(
        VAULT_CHANGELOG_VIEW_CONFIG.type,
        'left',
        { reveal: true }
      );
    },
    id: `open-${VAULT_CHANGELOG_VIEW_CONFIG.type}`,
    name: `Open ${VAULT_CHANGELOG_VIEW_CONFIG.name} view`
  });

  plugin.addCommand({
    callback: async () => {
      await app.workspace.ensureSideLeaf(
        FILE_CHANGELOG_VIEW_CONFIG.type,
        'right',
        { reveal: true }
      );
    },
    id: `open-${FILE_CHANGELOG_VIEW_CONFIG.type}`,
    name: `Open ${FILE_CHANGELOG_VIEW_CONFIG.name} view`
  });
}
