/**
 * One-time bulk portal account setup.
 * Usage (from dojo-crm folder):
 *   set SUPABASE_SERVICE_ROLE_KEY=your_key_here
 *   node scripts/create-portal-accounts.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ewiwprhhrbiydccfqeoy.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it from Supabase → Project Settings → API → service_role key.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const accountsPath = process.env.PORTAL_ACCOUNTS_FILE || join(__dirname, 'portal-accounts.local.json');

/** @type {{ email: string; password: string; students: { id: string; name: string }[] }[]} */
let accounts;
try {
  accounts = JSON.parse(readFileSync(accountsPath, 'utf8'));
} catch {
  console.error(`Missing or invalid accounts file: ${accountsPath}`);
  console.error('Copy scripts/portal-accounts.example.json to scripts/portal-accounts.local.json and fill in student details.');
  process.exit(1);
}

async function ensureAuthUser(email, password, primaryStudentId) {
  const { data: listed, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new Error(`listUsers: ${listError.message}`);

  const existing = listed.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    return { created: false, userId: existing.id };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { student_id: primaryStudentId },
  });

  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return { created: true, userId: data.user?.id };
}

async function main() {
  console.log('Creating portal accounts...\n');

  for (const account of accounts) {
    const primaryStudentId = account.students[0].id;
    const result = await ensureAuthUser(account.email, account.password, primaryStudentId);

    for (const student of account.students) {
      const { error } = await supabaseAdmin
        .from('students')
        .update({ email: account.email.toLowerCase() })
        .eq('id', student.id);

      if (error) throw new Error(`update student ${student.name}: ${error.message}`);
    }

    const studentNames = account.students.map((s) => s.name).join(' & ');
    console.log(`${result.created ? 'Created' : 'Already exists'}: ${studentNames}`);
    console.log(`  Email:    ${account.email}`);
    console.log(`  Password: ${account.password}\n`);
  }

  console.log('Done. Share each password privately with the parent/student.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
