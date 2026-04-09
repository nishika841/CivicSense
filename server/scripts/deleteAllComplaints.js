require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteAllComplaints() {
  try {
    console.log('🗑️  Starting deletion of all complaints...\n');

    // Delete all complaints
    const { data: deletedComplaints, error: complaintError } = await supabase
      .from('complaints')
      .delete()
      .neq('id', null);

    if (complaintError) {
      console.error('ERROR deleting complaints:', complaintError.message);
      return;
    }

    // Delete all status history
    const { data: deletedHistory, error: historyError } = await supabase
      .from('status_history')
      .delete()
      .neq('id', null);

    if (historyError) {
      console.error('ERROR deleting status history:', historyError.message);
      return;
    }

    // Delete all comments
    const { data: deletedComments, error: commentsError } = await supabase
      .from('comments')
      .delete()
      .neq('id', null);

    if (commentsError) {
      console.error('ERROR deleting comments:', commentsError.message);
      return;
    }

    // Delete all assignments
    const { data: deletedAssignments, error: assignmentError } = await supabase
      .from('assignments')
      .delete()
      .neq('id', null);

    if (assignmentError) {
      console.error('ERROR deleting assignments:', assignmentError.message);
      return;
    }

    console.log('✅ Successfully deleted all complaints');
    console.log('✅ Successfully deleted all status history');
    console.log('✅ Successfully deleted all comments');
    console.log('✅ Successfully deleted all assignments');
    console.log('\n🎉 Database cleaned! Ready for fresh complaints.\n');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

deleteAllComplaints();
