const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function check() {
  const prisma = new PrismaClient();
  const dbPerms = await prisma.permission.findMany({ select: { kode: true } });
  const dbSet = new Set(dbPerms.map(p => p.kode));

  const appShell = fs.readFileSync('src/components/layout/AppShell.tsx', 'utf8');
  const menuPerms = new Set();
  const matches = appShell.matchAll(/perm:\s*"([^"]+)"/g);
  for (const m of matches) {
    menuPerms.add(m[1]);
  }
  menuPerms.add('dashboard:view');

  const missingInDb = [];
  for (const p of menuPerms) {
    if (!dbSet.has(p)) {
      missingInDb.push(p);
    }
  }

  console.log('AppShell perms count:', menuPerms.size);
  console.log('DB perms count:', dbSet.size);
  console.log('Missing in DB (' + missingInDb.length + '):', missingInDb);

  await prisma.$disconnect();
}

check();
