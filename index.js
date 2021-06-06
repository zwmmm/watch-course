const watch = require('./watch');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('输入你的用户信息:', c => watch(c, rl))