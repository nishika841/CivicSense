require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteAllComplaints() {
  try {
    console.log('🗑️  Starting deletion of all complaints...\n');

    // First, get all complaint IDs to delete related records
    const { data: allComplaints, error: fetchError } = await supabase
      .from('complaints')
      .select('id');

    if (fetchError) {
      console.error('ERROR fetching complaints:', fetchError.message);
      return;
    }

    const complaintIds = allComplaints.map(c => c.id);

    if (complaintIds.length === 0) {
      console.log('✅ No complaints to delete');
      return;
    }

    console.log(`Found ${complaintIds.length} complaints to delete...\n`);

    // Delete related records first
    if (complaintIds.length > 0) {
      // Delete status history
      await supabase
        .from('status_history')
        .delete()
        .in('complaint_id', complaintIds);

      // Delete comments
      await supabase
        .from('comments')
        .delete()
        .in('complaint_id', complaintIds);

      // Delete assignments
      await supabase
        .from('assignments')
        .delete()
        .in('complaint_id', complaintIds);

      // Delete complaints
      const { error: complaintError } = await supabase
        .from('complaints')
        .delete()
        .in('id', complaintIds);

      if (complaintError) {
        console.error('ERROR deleting complaints:', complaintError.message);
        return;
      }
    }

    console.log(`✅ Deleted ${complaintIds.length} complaints`);
    console.log('✅ Deleted all related status history');
    console.log('✅ Deleted all related comments');
    console.log('✅ Deleted all related assignments');
    console.log('\n🎉 Database cleaned! Ready for fresh complaints.\n');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

deleteAllComplaints();
