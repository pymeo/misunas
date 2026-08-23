import { execFileSync } from 'node:child_process';

const [id, status] = process.argv
  .slice(2)
  .filter((argument) => !argument.startsWith('--'));
const remote = process.argv.includes('--remote');
if (
  !id ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
) {
  console.error('Indica un UUID de review válido.');
  process.exit(1);
}
if (status !== 'approved' && status !== 'rejected') {
  console.error('El estado debe ser approved o rejected.');
  process.exit(1);
}
if (remote && !process.argv.includes('--yes-remote')) {
  console.error(
    'Operación remota cancelada. Añade --remote --yes-remote de forma explícita.',
  );
  process.exit(1);
}
const approvedAt =
  status === 'approved'
    ? "CAST(strftime('%s','now') AS INTEGER) * 1000"
    : 'NULL';
const sql = `UPDATE reviews SET status = '${status}', approved_at = ${approvedAt} WHERE id = '${id}' AND status = 'pending'`;
execFileSync(
  'npx',
  [
    'wrangler',
    'd1',
    'execute',
    'tus-unas',
    remote ? '--remote' : '--local',
    '--command',
    sql,
  ],
  { stdio: 'inherit' },
);
