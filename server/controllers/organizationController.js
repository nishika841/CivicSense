const supabase = require('../utils/supabase');

exports.createOrganization = async (req, res) => {
  try {
    const { name, type, categories, contacts, coverage, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({
        name,
        type: type || 'department',
        categories: Array.isArray(categories) ? categories : [],
        contacts: contacts || { emails: [] },
        coverage: coverage || { cities: [], pincodes: [] },
        is_active: typeof isActive === 'boolean' ? isActive : true
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: 'Error creating organization', error: error.message });
    }

    res.status(201).json({
      success: true,
      organization: formatOrgResponse(org)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating organization',
      error: error.message
    });
  }
};

exports.listOrganizations = async (req, res) => {
  try {
    const { active } = req.query;
    let query = supabase.from('organizations').select('*');
    if (active === 'true') query = query.eq('is_active', true);
    if (active === 'false') query = query.eq('is_active', false);
    query = query.order('created_at', { ascending: false });

    const { data: orgs, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: 'Error fetching organizations', error: error.message });
    }

    res.status(200).json({
      success: true,
      organizations: (orgs || []).map(formatOrgResponse)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching organizations',
      error: error.message
    });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.categories !== undefined) updates.categories = Array.isArray(req.body.categories) ? req.body.categories : [];
    if (req.body.contacts !== undefined) updates.contacts = req.body.contacts;
    if (req.body.coverage !== undefined) updates.coverage = req.body.coverage;
    if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.status(200).json({
      success: true,
      organization: formatOrgResponse(org)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating organization',
      error: error.message
    });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    await supabase.from('organizations').delete().eq('id', req.params.id);

    res.status(200).json({
      success: true,
      message: 'Organization deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting organization',
      error: error.message
    });
  }
};

function formatOrgResponse(org) {
  return {
    _id: org.id,
    id: org.id,
    name: org.name,
    type: org.type,
    categories: org.categories || [],
    contacts: org.contacts || { emails: [], phones: [], whatsappNumbers: [] },
    coverage: org.coverage || { cities: [], pincodes: [] },
    isActive: org.is_active,
    createdAt: org.created_at
  };
}

exports.formatOrgResponse = formatOrgResponse;
