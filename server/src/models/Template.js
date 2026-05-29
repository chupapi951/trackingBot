import mongoose from 'mongoose';

const templateStageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1000 },
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    priceCurrency: { type: String, default: '₽', maxlength: 5 },
    deliveryCurrency: { type: String, default: '₽', maxlength: 5 },
    deliveryPriceType: { type: String, enum: ['total', 'perKg'], default: 'total' },
    stages: [templateStageSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Template', templateSchema);
