import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chdir } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

chdir(join(__dirname, 'server'));
spawn('node', ['src/index.js'], { stdio: 'inherit' });