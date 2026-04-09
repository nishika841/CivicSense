function safe(v) {
  return String(v || '').trim();
}

function categoryLabel(category) {
  const map = {
    pothole: 'Pothole',
    garbage: 'Garbage Overflow',
    water_leakage: 'Water Leakage',
    streetlight: 'Streetlight Issue',
    drainage: 'Drainage Issue',
    road_damage: 'Road Damage',
    other: 'Other'
  };
  return map[category] || 'Issue';
}

function buildCommonVars({ complaint }) {
  const coords = Array.isArray(complaint.location?.coordinates) ? complaint.location.coordinates : [];
  const lng = coords[0];
  const lat = coords[1];

  return {
    title: safe(complaint.title),
    description: safe(complaint.description),
    category: safe(complaint.category),
    categoryLabel: categoryLabel(complaint.category),
    address: safe(complaint.location?.address) || 'Unknown location',
    city: safe(complaint.city),
    pincode: safe(complaint.pincode),
    lat: typeof lat === 'number' ? String(lat) : '',
    lng: typeof lng === 'number' ? String(lng) : '',
    complaintId: String(complaint._id || '')
  };
}

function renderEmailEnFormal(v) {
  const lines = [
    'Dear Team,',
    '',
    'A new civic issue has been reported on CivicSense and appears relevant to your department/organization.',
    '',
    `Issue: ${v.categoryLabel}`,
    `Title: ${v.title}`,
    `Description: ${v.description}`,
    `Location: ${v.address}${v.city ? `, ${v.city}` : ''}${v.pincode ? ` (${v.pincode})` : ''}`,
    `Coordinates: ${v.lat && v.lng ? `${v.lat}, ${v.lng}` : 'N/A'}`,
    `Reference ID: ${v.complaintId}`,
    '',
    'Please review and take appropriate action. If this is not under your purview, please ignore this message.',
    '',
    'Regards,',
    'CivicSense'
  ];
  return lines.join('\n');
}

function renderEmailEnNeutral(v) {
  const lines = [
    'Hello,',
    '',
    'New issue reported on CivicSense:',
    `- Category: ${v.categoryLabel}`,
    `- Title: ${v.title}`,
    `- Location: ${v.address}${v.city ? `, ${v.city}` : ''}${v.pincode ? ` (${v.pincode})` : ''}`,
    `- Ref: ${v.complaintId}`,
    '',
    'Please take a look when possible.',
    '',
    'CivicSense'
  ];
  return lines.join('\n');
}

function renderEmailHiFormal(v) {
  const lines = [
    'प्रिय टीम,',
    '',
    'CivicSense पर एक नया नागरिक मुद्दा रिपोर्ट किया गया है जो आपके विभाग/संगठन से संबंधित हो सकता है।',
    '',
    `मुद्दा: ${v.categoryLabel}`,
    `शीर्षक: ${v.title}`,
    `विवरण: ${v.description}`,
    `स्थान: ${v.address}${v.city ? `, ${v.city}` : ''}${v.pincode ? ` (${v.pincode})` : ''}`,
    `निर्देशांक: ${v.lat && v.lng ? `${v.lat}, ${v.lng}` : 'उपलब्ध नहीं'}`,
    `संदर्भ आईडी: ${v.complaintId}`,
    '',
    'कृपया उचित कार्रवाई करें। यदि यह आपके क्षेत्र में नहीं आता है तो कृपया इसे अनदेखा करें।',
    '',
    'धन्यवाद,',
    'CivicSense'
  ];
  return lines.join('\n');
}

function renderEmailHiNeutral(v) {
  const lines = [
    'नमस्ते,',
    '',
    'CivicSense पर नया मुद्दा रिपोर्ट हुआ है:',
    `- श्रेणी: ${v.categoryLabel}`,
    `- शीर्षक: ${v.title}`,
    `- स्थान: ${v.address}${v.city ? `, ${v.city}` : ''}${v.pincode ? ` (${v.pincode})` : ''}`,
    `- रेफ: ${v.complaintId}`,
    '',
    'कृपया समय मिलने पर देखें।',
    '',
    'CivicSense'
  ];
  return lines.join('\n');
}

function renderSmsEn(v) {
  return `CivicSense: ${v.categoryLabel} reported. ${v.title}. Loc: ${v.address}${v.pincode ? ` (${v.pincode})` : ''}. Ref: ${v.complaintId}`;
}

function renderSmsHi(v) {
  return `CivicSense: ${v.categoryLabel} रिपोर्ट हुआ। ${v.title}. स्थान: ${v.address}${v.pincode ? ` (${v.pincode})` : ''}. Ref: ${v.complaintId}`;
}

function renderNotification({ complaint, channel, language = 'en', tone = 'formal' }) {
  const v = buildCommonVars({ complaint });

  const templateId = `${channel}:${language}:${tone}`;

  if (channel === 'email') {
    const subject = language === 'hi'
      ? `[CivicSense] नया मुद्दा: ${v.categoryLabel}`
      : `[CivicSense] New ${v.categoryLabel} reported`;

    let body;
    if (language === 'hi' && tone === 'formal') body = renderEmailHiFormal(v);
    else if (language === 'hi') body = renderEmailHiNeutral(v);
    else if (tone === 'formal') body = renderEmailEnFormal(v);
    else body = renderEmailEnNeutral(v);

    return { subject, body, templateId };
  }

  const body = language === 'hi' ? renderSmsHi(v) : renderSmsEn(v);
  return { subject: '', body, templateId };
}

module.exports = {
  renderNotification
};
