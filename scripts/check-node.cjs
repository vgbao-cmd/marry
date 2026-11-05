const major=Number(process.versions.node.split('.')[0]);
if(![22,24].includes(major)){console.error('[ERROR] Install Node.js 24 LTS (22 LTS is also supported): https://nodejs.org/');process.exit(1)}
console.log('Node.js '+process.versions.node);
