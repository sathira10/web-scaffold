# Add a module to an existing project

```sh
node "$SCAFFOLD/create.mjs" add <module> [<module>...] --dir <project>
```

- Check `list --json` first: the module must support the project's framework, and its
  `requires` and `conflicts` must fit the installed modules (`.scaffold.json`).
- The script replaces files the project never changed (it compares hashes in `.scaffold.json`)
  and keeps edited ones, listing them. Read each listed file, then either merge the module's
  version in by hand or rerun with `--force` if the change doesn't matter.
- If it warns that the project came from an older scaffold major, read `CHANGELOG.md` in the
  scaffold before going on.
- Run `pnpm check`, then pass on the module's manual steps and doc links.
