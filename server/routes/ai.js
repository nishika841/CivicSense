const express = require('express');
const router = express.Router();
const { analyzeComplaint, generateSummary, textSimilarity, chatWithGemini, analyzeImageWithGemini } = require('../utils/aiEngine');
const supabase = require('../utils/supabase');
const { formatComplaintResponse } = require('../controllers/complaintController');

// POST /api/ai/analyze — analyze complaint text for category + severity (Gemini-powered)
router.post('/analyze', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title && !description) {
      return res.status(400).json({ success: false, message: 'Title or description required' });
    }
    const result = await analyzeComplaint(title, description);
    res.json({ success: true, ai: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/duplicates — find similar complaints nearby
router.post('/duplicates', async (req, res) => {
  try {
    const { title, description, coordinates } = req.body;
    if (!title && !description) {
      return res.status(400).json({ success: false, message: 'Title or description required' });
    }

    const fullText = `${title || ''} ${description || ''}`;

    // Fetch recent unresolved complaints
    let query = supabase
      .from('complaints')
      .select('id, title, description, category, location_lng, location_lat, location_address, status, created_at, images')
      .neq('status', 'Resolved')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: candidates, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    let filteredCandidates = candidates || [];

    // Filter by location proximity if coordinates provided
    if (coordinates && coordinates.length === 2) {
      const [lng, lat] = coordinates;
      const maxDist = 2000; // 2km

      function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      filteredCandidates = filteredCandidates.filter(c => {
        if (!c.location_lat || !c.location_lng) return false;
        return haversineDistance(lat, lng, c.location_lat, c.location_lng) <= maxDist;
      });
    }

    const similar = filteredCandidates
      .map(c => {
        const candidateText = `${c.title} ${c.description}`;
        const similarity = textSimilarity(fullText, candidateText);
        // Format complaint for response
        const complaint = {
          _id: c.id,
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          location: {
            type: 'Point',
            coordinates: [c.location_lng, c.location_lat],
            address: c.location_address
          },
          status: c.status,
          createdAt: c.created_at,
          images: c.images || []
        };
        return { complaint, similarity: Math.round(similarity * 100) };
      })
      .filter(s => s.similarity >= 25)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    res.json({
      success: true,
      duplicates: similar,
      count: similar.length,
      hasDuplicates: similar.length > 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/image-analyze — analyze image using Gemini with fallback
router.post('/image-analyze', async (req, res) => {
  try {
    const { filename, category, title, description } = req.body;

    // Try Gemini first
    const geminiResult = await analyzeImageWithGemini(filename, title, description);
    if (geminiResult) {
      return res.json({
        success: true,
        imageAnalysis: {
          detectedTypes: [{ type: geminiResult.detectedType, confidence: geminiResult.confidence }],
          contextCategory: geminiResult.detectedType,
          isRelevant: geminiResult.isRelevant,
          tips: geminiResult.tips || [],
          message: geminiResult.message,
          poweredBy: 'gemini'
        }
      });
    }

    // Fallback to keyword matching
    const fname = (filename || '').toLowerCase();
    const context = `${title || ''} ${description || ''}`.toLowerCase();
    const imageHints = [];
    if (fname.match(/pothole|hole|road|crack|pit/)) imageHints.push({ type: 'pothole', confidence: 80 });
    if (fname.match(/garbage|trash|waste|dump|litter/)) imageHints.push({ type: 'garbage', confidence: 80 });
    if (fname.match(/water|leak|pipe|flood|sewage/)) imageHints.push({ type: 'water_leakage', confidence: 80 });
    if (fname.match(/light|lamp|street|dark|bulb/)) imageHints.push({ type: 'streetlight', confidence: 80 });
    if (fname.match(/drain|sewer|gutter|manhole/)) imageHints.push({ type: 'drainage', confidence: 80 });

    const tips = [];
    if (!filename) tips.push('Upload a clear photo of the issue for faster resolution');
    if (context.length < 20) tips.push('Add more details in the description for better AI analysis');

    res.json({
      success: true,
      imageAnalysis: {
        detectedTypes: imageHints,
        contextCategory: (await analyzeComplaint(title, description)).suggestedCategory,
        isRelevant: imageHints.length > 0 || context.length > 10,
        tips,
        message: imageHints.length > 0
          ? `Image appears to show: ${imageHints.map(h => h.type.replace(/_/g, ' ')).join(', ')}`
          : 'Photo uploaded — AI will use complaint text for analysis',
        poweredBy: 'fallback'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/summary — generate smart summary (Gemini-powered)
router.post('/summary', async (req, res) => {
  try {
    const { title, description, category, address } = req.body;
    const summary = await generateSummary(title, description, category, address);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/chat — Gemini-powered chatbot
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const reply = await chatWithGemini(message);
    res.json({ success: true, reply, poweredBy: reply ? 'gemini' : 'fallback' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
