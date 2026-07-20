import process from 'node:process';

const argumentsByName = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/u, '').split('=');
    return [key, value.join('=')];
  }),
);

const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const previousDigest = argumentsByName['previous-digest'];
const candidateDigest = argumentsByName['candidate-digest'];
const migrationPhase = argumentsByName['migration-phase'];

const errors = [];
if (!digestPattern.test(previousDigest ?? '')) {
  errors.push('previous-digest must be an immutable sha256 digest');
}
if (!digestPattern.test(candidateDigest ?? '')) {
  errors.push('candidate-digest must be an immutable sha256 digest');
}
if (!['none', 'expand'].includes(migrationPhase ?? '')) {
  errors.push('rollback rehearsal only permits none or expand migration phase');
}
if (previousDigest === candidateDigest) {
  errors.push('previous and candidate digests must differ');
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    JSON.stringify(
      {
        candidateDigest,
        checks: {
          immutableDigests: 'PASS',
          migrationCompatibility: 'PASS',
          rollbackTarget: 'PASS',
        },
        migrationPhase,
        previousDigest,
        status: 'PASS',
      },
      null,
      2,
    ) + '\n',
  );
}
