import { execFile } from 'node:child_process';

const GitCommand = 'git';
const GitCommitHashArgs = ['rev-parse', 'HEAD'];

export const getGitCommitHash = (rootDir: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = execFile(GitCommand, GitCommitHashArgs, {
      cwd: rootDir,
      shell: false,
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 10_000,
    }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      if (child.exitCode !== 0) {
        reject(
          new Error(`Git exited with code ${child.exitCode}: ${stderr}`)
        );
        return;
      }

      stdout = stdout.trim();
      if (/^[0-9a-f]+$/i.test(stdout)) {
        resolve(stdout);
      } else {
        reject(new Error(`Invalid commit hash: ${stdout}`));
      }
    });
  });
