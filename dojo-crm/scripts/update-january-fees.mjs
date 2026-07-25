import { createClient } from '@supabase/supabase-js';

const url = 'https://ewiwprhhrbiydccfqeoy.supabase.co';
const key = 'sb_publishable_Dc0slfg2xNY1T_j0AUNOXA_8-xlimwQ';

const supabase = createClient(url, key);

async function run() {
  console.log('Fetching students...');
  const { data: students, error: studentError } = await supabase.from('students').select('*');
  if (studentError) {
    console.error('Error fetching students:', studentError);
    return;
  }

  console.log(`Found ${students.length} students:`);
  for (const s of students) {
    console.log(` - [${s.id}] ${s.full_name}`);
  }

  const januaryMonthKey = '2026-01-01';

  // Find Vishruth
  const vishruth = students.find((s) => s.full_name.toLowerCase().includes('vishruth'));
  if (vishruth) {
    console.log(`\nIdentified Vishruth: [${vishruth.id}] ${vishruth.full_name}`);
  } else {
    console.warn('\nWarning: Vishruth not found in students list!');
  }

  console.log('\nFetching existing January 2026 fees...');
  const { data: existingFees, error: feeFetchError } = await supabase
    .from('fees')
    .select('*')
    .eq('month_year', januaryMonthKey);

  if (feeFetchError) {
    console.error('Error fetching fees:', feeFetchError);
    return;
  }

  console.log(`Found ${existingFees.length} fee records for January 2026.`);

  // Update or insert fee records
  for (const s of students) {
    const isVishruth = s.full_name.toLowerCase().includes('vishruth');
    const shouldBePaid = !isVishruth;

    const existing = existingFees.find((f) => f.student_id === s.id);

    if (existing) {
      if (existing.paid !== shouldBePaid) {
        const { error: updateError } = await supabase
          .from('fees')
          .update({
            paid: shouldBePaid,
            paid_date: shouldBePaid ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Failed to update fee for ${s.full_name}:`, updateError);
        } else {
          console.log(`Updated ${s.full_name}: paid = ${shouldBePaid}`);
        }
      } else {
        console.log(`No change needed for ${s.full_name}: paid = ${shouldBePaid}`);
      }
    } else {
      // Upsert fee record
      const { error: insertError } = await supabase.from('fees').insert({
        student_id: s.id,
        month_year: januaryMonthKey,
        paid: shouldBePaid,
        amount: s.monthly_fee || 1000,
        paid_date: shouldBePaid ? new Date().toISOString() : null,
      });

      if (insertError) {
        console.error(`Failed to insert fee for ${s.full_name}:`, insertError);
      } else {
        console.log(`Inserted January fee for ${s.full_name}: paid = ${shouldBePaid}`);
      }
    }
  }

  console.log('\n--- VERIFYING JANUARY 2026 FEES ---');
  const { data: finalFees } = await supabase
    .from('fees')
    .select('*, students(full_name)')
    .eq('month_year', januaryMonthKey);

  console.log('Final January 2026 Fee Records:');
  for (const f of finalFees || []) {
    console.log(` - ${f.students?.full_name || f.student_id}: paid = ${f.paid}`);
  }
}

run().catch(console.error);
