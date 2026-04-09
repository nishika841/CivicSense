/**
 * CivicSense AI Engine — Powered by Google Gemini
 * Uses Gemini 1.5 Flash for intelligent category detection, severity scoring,
 * summary generation, and chatbot responses.
 * Falls back to keyword matching if Gemini API is unavailable.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const VALID_CATEGORIES = ['pothole', 'garbage', 'water_leakage', 'streetlight', 'drainage', 'road_damage', 'other'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

let genAI = null;
let geminiModel = null;

function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  GEMINI_API_KEY not set — AI will use keyword fallback');
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('✅ Google Gemini AI initialized');
    return true;
  } catch (err) {
    console.error('❌ Gemini init failed:', err.message);
    return false;
  }
}

// Initialize on load
initGemini();

// ─── GEMINI-POWERED FUNCTIONS ───────────────────────────────────────

/**
 * Analyze complaint using Gemini AI
 */
async function analyzeComplaintWithGemini(title, description) {
  if (!geminiModel) return null;

  const prompt = `You are a civic complaint analysis AI. Analyze this complaint and respond ONLY with valid JSON (no markdown, no code blocks).

Complaint Title: "${title || ''}"
Complaint Description: "${description || ''}"

Respond with this exact JSON structure:
{
  "category": "<one of: pothole, garbage, water_leakage, streetlight, drainage, road_damage, other>",
  "categoryConfidence": <number 0-100>,
  "severity": "<one of: low, medium, high, critical>",
  "severityScore": <number 1-10>,
  "reasoning": "<brief 1-line explanation of why this category and severity>",
  "allCategorySuggestions": [{"category": "<name>", "score": <number>}]
}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();
    // Clean any markdown code block wrapping
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate
    if (!VALID_CATEGORIES.includes(parsed.category)) parsed.category = 'other';
    if (!VALID_SEVERITIES.includes(parsed.severity)) parsed.severity = 'medium';

    return {
      suggestedCategory: parsed.category,
      categoryConfidence: Math.min(Math.max(parsed.categoryConfidence || 80, 0), 100),
      severity: parsed.severity,
      severityScore: parsed.severityScore || 5,
      severityFactors: [{ keyword: parsed.reasoning || 'AI analysis', level: parsed.severity, score: parsed.severityScore || 5 }],
      allCategorySuggestions: parsed.allCategorySuggestions || [{ category: parsed.category, score: parsed.categoryConfidence || 80 }],
      poweredBy: 'gemini'
    };
  } catch (err) {
    console.error('Gemini analyze error:', err.message);
    return null;
  }
}

/**
 * Generate smart summary using Gemini
 */
async function generateSummaryWithGemini(title, description, category, address) {
  if (!geminiModel) return null;

  const prompt = `Summarize this civic complaint in exactly ONE short sentence (max 120 chars). Be concise and factual.

Title: "${title || ''}"
Description: "${description || ''}"
Category: ${category || 'unknown'}
Location: ${address || 'unknown'}

Respond with ONLY the summary sentence, nothing else.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    return result.response.text().trim().substring(0, 150);
  } catch (err) {
    console.error('Gemini summary error:', err.message);
    return null;
  }
}

/**
 * AI Chatbot response using Gemini
 */
async function chatWithGemini(userMessage) {
  if (!geminiModel) return null;

  const prompt = `You are CivicSense AI Assistant — a helpful chatbot for a civic complaint management platform. The platform allows citizens to report issues like potholes, garbage, water leakage, streetlight problems, drainage issues, and road damage.

Features of the platform:
- Report complaints with photos and location
- AI auto-detects category and severity
- Interactive map with heatmap
- Analytics dashboard with area search
- Comment threads on complaints
- Leaderboard with badges
- Dark mode

User message: "${userMessage}"

Respond helpfully in 2-3 short sentences. Be friendly and concise. If the question is not about the platform, politely redirect.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('Gemini chat error:', err.message);
    return null;
  }
}

/**
 * Analyze image context using Gemini
 */
async function analyzeImageWithGemini(filename, title, description) {
  if (!geminiModel) return null;

  const prompt = `A user is filing a civic complaint and uploaded an image file named "${filename || 'unknown'}".
Complaint title: "${title || ''}"
Complaint description: "${description || ''}"

Based on the filename and complaint context, respond ONLY with valid JSON:
{
  "detectedType": "<one of: pothole, garbage, water_leakage, streetlight, drainage, road_damage, other>",
  "confidence": <number 0-100>,
  "message": "<brief description of what the image likely shows>",
  "isRelevant": <true/false>,
  "tips": ["<tip1>", "<tip2>"]
}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini image error:', err.message);
    return null;
  }
}

// ─── KEYWORD FALLBACK FUNCTIONS ─────────────────────────────────────

const CATEGORY_KEYWORDS = {
  pothole: ['pothole', 'pot hole', 'hole in road', 'crater', 'ditch', 'bump', 'uneven road', 'road pit', 'gaddha'],
  garbage: ['garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'filth', 'dirty', 'stink', 'kachra', 'dustbin', 'rotting'],
  water_leakage: ['water leak', 'leakage', 'pipe burst', 'flooding', 'waterlog', 'sewage', 'water pipe', 'paani', 'broken pipe', 'leaking'],
  streetlight: ['streetlight', 'street light', 'lamp', 'bulb', 'dark', 'no light', 'broken light', 'bijli', 'flickering'],
  drainage: ['drain', 'drainage', 'sewer', 'gutter', 'nala', 'clogged', 'blocked', 'manhole', 'stagnant water', 'naali'],
  road_damage: ['road damage', 'broken road', 'crack', 'road repair', 'footpath', 'speed breaker', 'cave in', 'sinkhole', 'sadak']
};

function detectCategoryFallback(text) {
  if (!text) return { category: 'other', confidence: 0, allSuggestions: [] };
  const lower = text.toLowerCase();
  let best = 'other', bestScore = 0;
  const suggestions = [];

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.split(' ').length;
    }
    if (score > 0) suggestions.push({ category: cat, score });
    if (score > bestScore) { bestScore = score; best = cat; }
  }

  return {
    category: best,
    confidence: Math.min(Math.round((bestScore / 3) * 100), 100),
    allSuggestions: suggestions.sort((a, b) => b.score - a.score)
  };
}

function detectSeverityFallback(text) {
  if (!text) return { severity: 'medium', score: 4, factors: [] };
  const lower = text.toLowerCase();
  const levels = {
    critical: { words: ['urgent', 'emergency', 'danger', 'accident', 'collapse', 'flood', 'fire', 'death', 'injury'], score: 10 },
    high: { words: ['major', 'severe', 'big', 'large', 'deep', 'massive', 'children', 'school', 'daily'], score: 7 },
    medium: { words: ['moderate', 'growing', 'several', 'frequent', 'problem', 'issue'], score: 4 },
    low: { words: ['minor', 'small', 'slight', 'cosmetic', 'occasional', 'rare'], score: 2 }
  };
  let total = 0, count = 0, factors = [];
  for (const [level, cfg] of Object.entries(levels)) {
    for (const w of cfg.words) {
      if (lower.includes(w)) { total += cfg.score; count++; factors.push({ keyword: w, level, score: cfg.score }); }
    }
  }
  const avg = count > 0 ? total / count : 4;
  const severity = avg >= 8 ? 'critical' : avg >= 6 ? 'high' : avg >= 3 ? 'medium' : 'low';
  return { severity, score: Math.round(avg * 10) / 10, factors: factors.slice(0, 5) };
}

// ─── PUBLIC API (Gemini first, fallback to keywords) ────────────────

async function analyzeComplaint(title, description) {
  // Try Gemini first
  const geminiResult = await analyzeComplaintWithGemini(title, description);
  if (geminiResult) return geminiResult;

  // Fallback to keywords
  const fullText = `${title || ''} ${description || ''}`;
  const cat = detectCategoryFallback(fullText);
  const sev = detectSeverityFallback(fullText);
  return {
    suggestedCategory: cat.category,
    categoryConfidence: cat.confidence,
    allCategorySuggestions: cat.allSuggestions,
    severity: sev.severity,
    severityScore: sev.score,
    severityFactors: sev.factors,
    poweredBy: 'fallback'
  };
}

async function generateSummary(title, description, category, address) {
  // Try Gemini first
  const geminiSummary = await generateSummaryWithGemini(title, description, category, address);
  if (geminiSummary) return geminiSummary;

  // Fallback
  if (!description) return title || '';
  const catLabels = { pothole: 'Pothole', garbage: 'Garbage', water_leakage: 'Water Leakage', streetlight: 'Streetlight', drainage: 'Drainage', road_damage: 'Road Damage', other: 'Issue' };
  const loc = address ? ` near ${address.split(',')[0]}` : '';
  const first = description.split(/[.!?\n]+/).filter(s => s.trim().length > 10)[0]?.trim() || description.substring(0, 100);
  const summary = `${catLabels[category] || 'Issue'} reported${loc}: ${first}`;
  return summary.length > 150 ? summary.substring(0, 147) + '...' : summary;
}

function textSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

module.exports = {
  analyzeComplaint,
  generateSummary,
  textSimilarity,
  chatWithGemini,
  analyzeImageWithGemini,
  initGemini
};
