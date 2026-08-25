/**
 * Conventional Commits (Tech Spec §8.3).
 *
 * `scope` để trống được, nhưng khi có thì nên là tên feature ở §2.1 để
 * `git log --grep` theo feature còn dùng được.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      [
        'auth',
        'group',
        'dish',
        'rule',
        'session',
        'selection',
        'meal',
        'history',
        'shared',
        'app',
        'db',
        'ci',
        'deps',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
}
