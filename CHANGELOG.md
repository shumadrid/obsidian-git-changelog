# CHANGELOG

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
