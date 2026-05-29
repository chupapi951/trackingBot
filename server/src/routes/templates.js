import express from 'express';
import Template from '../models/Template.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();
router.use(rateLimit({ windowMs: 60000, max: 60 }));

/**
 * GET /api/templates
 */
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find({ owner: req.user._id }).sort('-updatedAt');
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/templates
 */
router.post('/', async (req, res) => {
  try {
    const { name, priceCurrency, deliveryCurrency, deliveryPriceType, stages } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название шаблона обязательно' });
    }
    const cleanStages = Array.isArray(stages)
      ? stages
          .filter((s) => s && s.title && s.title.trim())
          .map((s) => ({
            title: s.title.trim(),
            description: s.description ? s.description.trim() : '',
          }))
      : [];

    const template = await Template.create({
      owner: req.user._id,
      name: name.trim(),
      priceCurrency: priceCurrency || '₽',
      deliveryCurrency: deliveryCurrency || '₽',
      deliveryPriceType: deliveryPriceType || 'total',
      stages: cleanStages,
    });

    res.status(201).json(template);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /api/templates/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Шаблон не найден' });
    if (String(template.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const { name, priceCurrency, deliveryCurrency, deliveryPriceType, stages } = req.body;
    if (name !== undefined) template.name = String(name).trim();
    if (priceCurrency !== undefined) template.priceCurrency = priceCurrency;
    if (deliveryCurrency !== undefined) template.deliveryCurrency = deliveryCurrency;
    if (deliveryPriceType !== undefined) template.deliveryPriceType = deliveryPriceType;
    if (Array.isArray(stages)) {
      template.stages = stages
        .filter((s) => s && s.title && s.title.trim())
        .map((s) => ({
          title: s.title.trim(),
          description: s.description ? s.description.trim() : '',
        }));
    }

    await template.save();
    res.json(template);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/templates/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Шаблон не найден' });
    if (String(template.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    await template.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
