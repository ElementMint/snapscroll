export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',    // new feature
      'fix',     // bug fix
      'docs',    // documentation only
      'style',   // formatting, no logic change
      'refactor',// restructure without feature/fix
      'perf',    // performance improvement
      'test',    // adding/fixing tests
      'chore',   // tooling, deps, config
      'ci',      // CI/CD changes
      'revert',  // revert a commit
    ]],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
