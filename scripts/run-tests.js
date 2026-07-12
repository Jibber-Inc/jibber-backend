const { spawnSync } = require('child_process');

const run = (command, args) =>
  spawnSync(command, args, {
    env: process.env,
    stdio: 'inherit',
  });

const exitStatus = result => {
  if (result.error) {
    console.error(result.error);
    return 1;
  }
  return result.status === null ? 1 : result.status;
};

let status = 1;

try {
  const mongo = run('mongodb-runner', [
    'start',
    '--version',
    '7.0.x',
    '--',
    '--port',
    '27017',
  ]);
  status = exitStatus(mongo);

  if (status === 0) {
    const jest = run('jest', ['--detectOpenHandles', '--no-cache']);
    status = exitStatus(jest);
  }
} finally {
  run('mongodb-runner', ['stop', '--all']);
}

process.exit(status);
