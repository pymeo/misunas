import { execFileSync } from 'node:child_process';

if (!process.argv.includes('--yes-local-only')) {
  console.error(
    'Operación cancelada. Repite con: npm run db:reset:local -- --yes-local-only',
  );
  process.exit(1);
}

const tables = [
  'wear_reports',
  'affiliate_click_events',
  'recommendation_events',
];
for (const table of tables) {
  execFileSync(
    'npx',
    [
      'wrangler',
      'd1',
      'execute',
      'tus-unas',
      '--local',
      '--command',
      `DROP TABLE IF EXISTS ${table}`,
    ],
    { stdio: 'inherit' },
  );
}
execFileSync('npm', ['run', 'db:migrate:local'], { stdio: 'inherit' });
execFileSync('npm', ['run', 'db:seed:local'], { stdio: 'inherit' });
