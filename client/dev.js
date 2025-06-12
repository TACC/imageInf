const { spawn } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('\n🚀 Starting development server...'));
console.log(chalk.yellow('\n⚠️  IMPORTANT:'));
console.log(
  chalk.white(
    '   The Vite dev server will start on port 5173, but you should access the ImageInf application at:'
  )
);
console.log(chalk.green('   http://localhost:8080'));
console.log(
  chalk.white('\n   The port 5173 is proxied through nginx (so no need to use it).\n')
);

const vite = spawn('vite', [], { stdio: 'inherit' });

vite.on('error', (error) => {
  console.error(chalk.red('Failed to start Vite:'), error);
  process.exit(1);
});
