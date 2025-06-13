import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue('\n🚀 Starting ImageInf client...'));
console.log(
  chalk.yellow('⚠️  Access at:'),
  chalk.green('http://localhost:8080'),
  chalk.gray('(not 5173 which is listed by Vite below)\n')
);

const vite = spawn('vite', ['--force'], { stdio: 'inherit' });

vite.on('error', (error) => {
  console.error(chalk.red('Failed to start Vite:'), error);
  process.exit(1);
});
