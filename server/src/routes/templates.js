import express from 'express';
import Template from '../models/Template.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();
router.use(rateLimit({ windowMs: 60000, max: 60 }));

/**
 * GET /api/templates
 * Get all templates owned by the current user.
 */
router.get('/', async (req, res) => {
  const templates = await Template.find({ owner: req.user._id }).sort('-updatedAt');
  res.json(templates);
});

/**
 * POST /api/templates
 * Create a new template.
 */
router.post('/', async (req, res) => {
  const { name, priceCurrency, deliveryCurrency, deliveryPriceType, stages } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Название шаблона обязательно' });
  }
  const cleanStages = Array.isArray(stages)
    ? stages
        .filter((s) => s && s.title && s.title.trim())
        .map((s) => ({
          title: s.title.trim(),
          description: s.description?.trim() || '',
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
});

/**
 * PUT /api/templates/:id
 * Update a template (owner only).
 */
router.put('/:id', async (req, res) => {
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
        description: s.description?.trim() || '',
      }));
  }

  await template.save();
  res.json(template);
});

/**
 * DELETE /api/templates/:id
 * Delete a template (owner only).
 */
router.delete('/:id', async (req, res) => {
  const template = await Template.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Шаблон не найден' });
  if (String(template.owner) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  await template.deleteOne();
  res.json({ ok: true });
});

export default router;
