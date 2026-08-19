const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRawUnsafe(
  "select column_name from information_schema.columns where table_name='tenants' order by ordinal_position",
)
  .then((r) => { console.log(r.map((x) => x.column_name).join(', ')); return p.$disconnect(); })
  .catch((e) => { console.error(e.message); process.exit(1); });