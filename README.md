# Git Changelog

A new [Obsidian](https://obsidian.md) plugin that utilizes Git commit history to display dynamic changelogs in your sidebar.

## Installation

This plugin is currently in early beta. To install the plugin, follow these steps:

1. Make sure to have the [BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat) installed and enabled.
2. Paste this link in your browser and press enter: 

    `obsidian://brat?plugin=https://github.com/shumadrid/obsidian-git-changelog`
3. An Obsidian pop-up window should appear. In the window, click the 'Add plugin' button once and wait a few seconds for the plugin to install.

The plugin is NOT yet available in [the official Community Plugins repository](https://obsidian.md/plugins).

> [!IMPORTANT]
> Requires the [Git plugin](https://github.com/Vinzent03/obsidian-git) to be installed. Installing it and maintaining a Git repository can be beneficial, even if you rely on other sync or backup services.

## Features

### Vault Changelog View

- Detects renamed and moved files separately.
- Shows the total count of lines added and deleted.
- Displays counts of files added, modified, deleted, and moved/renamed (total or text and non-text separately).
- Lists per file lines added and deleted, along with file statuses (**M**odified, **A**dded, **R**enamed/moved, or **D**eleted).
- **Exclude Files and Folders**:

  Usually you specify files and folders you want to exclude from your Git repository in the `.gitignore` file.

  But this setting is useful if you want to keep some files in your repository but exclude them from appearing in the vault changelog.

  Common examples for this: `.trash` and `.obsidian` folders, `.canvas` files, or syncing service conflict files that can clutter the changelog stats.

![Vault Changelog View](.github/vault-changelog-view.webp)

### File Changelog View

- Shows the count of added and deleted lines for all previous versions of the active note.
- Only Markdown files are currently supported.

![File Changelog View](.github/file-changelog-view.webp)

> [!WARNING]
> Expect poor view performance on scrolling. If scrolling the changelogs doesn't work, restart Obsidian. This will be fixed soon.

### Changelog Settings

- Set a custom day start time (if you're a night owl and want to track your actual days).
- Set a custom timezone to base the intervals on or detect it automatically.
- Choose to view hourly, daily, weekly, or monthly intervals.

### Live Stats in the Status Bar for the Current Note

- Set any interval for the status bar stats. Ensure this interval isn't more frequent than the [Git plugin's](https://github.com/Vinzent03/obsidian-git) auto-commit interval to maintain accuracy.

### Integration with Git Plugin's Diff View

- Click on any file version in the changelog views to open the corresponding diff view showing the changes.

## Data Loss Monitoring

This plugin can also serve as a tool for detecting data loss: if the displayed changelog stats look incorrect, **unintended** vault changes might have occurred.

### Common Causes of Data Loss

- Sync conflicts
- Faulty plugins
- Device malfunction
- Accidental text overwrites and other user errors
- **AI Tools**: They have a tendency to overwrite or delete random content.
  Using this plugin you can experiment with AI with less anxiety, knowing that you can notice most data loss.

### How to Use

This plugin was not designed to accumulate all changes made inside an interval.

For example, if you add a block of text, delete it, re-add it, then delete it again in the same day, the changelog will show zero modifications instead of a bunch of additions and deletions.

This is because this plugin only compares neighboring versions (intervals) directly, and if a block of text didn't exist in the previous interval and is also absent in the latest interval, zero changes have occurred.

Consequently, if you add text that gets lost within the same interval, you can detect this data loss **not** by seeing a high 'lines deleted' count, but by noticing a lack of expected additions.

If some lost data was never committed, it won't be recoverable by Git. So it's recommended to configure a frequent (< 5 minutes) auto-commit interval (no need to manually stage and commit files).

But if some version of a file wasn't committed, you can still rely on the [File Recovery](https://help.obsidian.md/plugins/file-recovery) plugin, or the [Version history](https://help.obsidian.md/Obsidian+Sync/Version+history) feature to recover it.

## Limitations

- No meaningful way of tracking changes to canvas files.
- No mobile support yet.
- File changelog doesn't clear if opening a diff view but keeps showing stats for the previous note. This is intentional for quickly switching between versions but may result in showing stats for a closed note. This will be fixed in the future.
- Only status bar counts update live; other views refresh on each commit because of performance reasons.
- It doesn't show stats for the initial version of a file/vault (will be fixed in a future update).
- Assumes linear Git commit history—unexpected branching or merging may produce unexpected results.
- Git does not track changes inside other nested Git repositories—you should use proper Git submodules instead if you want to track changes for multiple repositories inside your vault.
- By Git design, files/folders specified in `.gitignore` aren't watched for changes.
- Git decides if a file is binary (non-text) or a text file by analyzing the file contents rather than looking at the file extension. If you rename a text file to have a `.png` extension, Git will still count its lines and treat it as a text file.
- If some data loss is only a few words/lines in a heavily edited file, you probably won't notice it. Even though those few lines could have been important.

## Roadmap

- [ ] Partial mobile support.
- [ ] Better view performance.
- [ ] Stable and consistent styling.
- [ ] Dedicated moved lines/words detection.
- [ ] File changelog support for all text files.
- [ ] Add a word counting option (currently defaults to line counting).
- [ ] Syncthing integration (better conflict file handling).
- [ ] Visual representation of repo history.
- [ ] Code cleanup and refactoring.
- [ ] Improve README.
- [ ] Folder stats in the vault changelog view.
- [ ] Compare the current state of the vault (repo) to any point in history.
- [ ] Extensive per-file type stats.
- [ ] Optimize performance.
- [ ] Integrate the status bar with the [Git plugin's](https://github.com/Vinzent03/obsidian-git) diff views.
- [ ] Notify if the amount of changes between neighboring commits exceeds a threshold.
- [ ] File & folder stats inside the File explorer view.

## Alternatives

If you don't want to depend on Git, check out the [Obsidian Vault Changelog](https://github.com/philoserf/obsidian-vault-changelog) plugin.

## FAQ

### Will this plugin alter my Git repository/config?

- No. This plugin is intended to be read-only and does not alter any Git configurations.
  However, it's in early beta, so bugs are possible.

### I have been using Obsidian for a long time but don't have a Git repo set up. Can I still use this plugin to see my vault history?

- No. 😔

## Debugging

By default, debug messages for this plugin are hidden. They aren't intended for the user.

To show them, enable `Verbose` mode in the console and run the following command:

```js
window.DEBUG.enable('git-changelog');
```

For more details, refer to [this guide](https://github.com/mnaoumov/obsidian-dev-utils?tab=readme-ov-file#debugging).

## Contributing

Feel free to submit a PR or a feature request. I'd especially appreciate help with styling and restructuring the code.

This plugin is in early beta, so please do report all bugs that you find.

For easier development, [define](https://github.com/mnaoumov/generator-obsidian-plugin?tab=readme-ov-file#build-development-version) a `OBSIDIAN_CONFIG_DIR` variable and run `npm run dev`.

## Credits

- [FlorianWoelki](https://github.com/FlorianWoelki/obsidian-iconize) for settings code inspiration.

- Plugin template was generated with [generator-obsidian-plugin](https://github.com/mnaoumov/generator-obsidian-plugin), a modern Obsidian plugin template.

- A lot of functions are adapted from the [Git plugin](https://github.com/Vinzent03/obsidian-git).
