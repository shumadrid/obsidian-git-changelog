# CHANGELOG

## 0.5.0

#### Features

- New "Compare Two Vault States in History" and "Show Vault Changes since the Last Checkpoint" commands. The results of these commands are shown in a temporary side view.
- Add validation to settings tab UI and polish the layout.
- Display a message in the file changelog view when the opened file is ignored by Git.
- Mention unusual scenarios that can lead to the "File has no git history" state in the file changelog view. (#3 Thanks to @AMC-Albert for the suggestion!)
- Option to convert ExcludeFilesAndFolders to an include list.
- Option to temporarily disable the ExcludeFilesAndFolders list.
- Reorganized the settings internally. Users that are updating from a previous version will need to reconfigure all settings that have been affected.

#### Bug Fixes

- Clear the file changelog view if no DiffViews are visible.
- Improved conditional changelog recalculation logic on settings changes.
- Fix an issue where the date labels of the changelog versions were sometimes staying outdated.
- Prevent excluding the git root folder from the vault changelog.
- Prevent adding paths above git root folder to the exclude list to avoid git errors.
- Apply the "Day start time" setting only when the day interval for a changelog is active (to avoid confusion).
- Update the minimum required Obsidian version to 1.8.9.

## 0.4.0

### Features

- Add options for ignoring whitespace changes.
- Expand "Copy commit hash" context menu option to also copy the file path when possible.

### Bug Fixes

- Make the plugin load faster by reducing file size.
- Disable "Change interval" button for the file changelog when no file is opened.
- Don't forget the collapsed state of the first version when chaining recomputes.
- Make the status bar stats recognize renamed files once they're committed instead of treating them as new.
- Ensure version labels are displayed in the user's specified timezone.
- Remove redundant Git plugin initialization check on startup.
- Add more detail to incompatibility notices about the installed Git plugin version.
- Prevent expanding large number of versions in the vault changelog view as a temporary workaround for performance degradations.

## 0.3.0

### Features

- Add "Copy commit hash" context menu item.
- Add "Git changelog: Exclude/Reinclude" context menu item.

### Bug Fixes

- Show loading state when status bar stats are computing.
- Improve ExcludeFilesAndFolders parsing logic.
- Fix faulty status bar's queue logic that was sabotaging other tasks.
- Revert faulty "is binary file" check.

## 0.2.1

### Bug Fixes

- Convert text to sentence case
- Fix changelog list items getting shifted, leading to the stats representing the wrong versions.
- Rename "Rename detection sensitivity" to "Rename detection strictness".
- Fix file changelog failing on file names with quotes.
- Handle file changelog versions in which the file was deleted.
- Don't disable "Change interval" button while the stats are loading.
- Make tiny improvements to "Exclude files and folders" logic.

## 0.2.0

### Features

- Add a custom locale setting.
- Add support for showing the stats of initial versions.
- Ability to open the live version of a file from the File changelog view.
- More consistent UI in the changelog views.
- More accurate interval labels.

### Bug Fixes

- Fix scroll not working in views.
- Fix the changelog showing duplicate versions.
- Remember latest version's collapsed state between recomputes.
- Optimize changelog generation performance, stop it from freezing the UI.
- Correctly implement the "Day start time" setting, now limited to hours.
- Stop the File changelog from clearing the stats when a commit happens and the markdown view isn't in focus.
- Prevent status bar stats from becoming outdated.
- Prevent outdated Vault changelog version labels on new days.
- Removed "Git plugin missing" warning flash in views during startup.
- Don't reopen closed views on startup.

## 0.1.0

- Initial release
