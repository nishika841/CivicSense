const supabase = require('../utils/supabase');
const bcrypt = require('bcryptjs');

exports.createOrgUser = async (req, res) => {
  try {
    const { name, email, password, phone, organizationId } = req.body;

    if (!name || !email || !password || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, organizationId are required'
      });
    }

    // Check org exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Check email unique
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase().trim(),
        password_hash,
        phone: phone || null,
        role: 'org_user',
        organization_id: org.id
      })
      .select('id, name, email, role, organization_id')
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: 'Error creating org user', error: error.message });
    }

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization_id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating org user',
      error: error.message
    });
  }
};
