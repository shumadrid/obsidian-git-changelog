# CHANGELOG

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
