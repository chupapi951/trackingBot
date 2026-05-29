import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

// Human-friendly share code, e.g. "A1B2C3"
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const stageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1000 },
    date: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    photos: [photoSchema],
  },
  { _id: true }
);

const trackerSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      index: true,
      default: () => generateCode(),
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    price: { type: Number, default: 0, min: 0 },
    deliveryPrice: { type: Number, default: null, min: 0 },
    deliveryPriceType: { type: String, enum: ['total', 'perKg'], default: 'total' },
    currency: { type: String, default: '₽', maxlength: 5 },
    weight: { type: Number, default: null, min: 0 },
    stages: [stageSchema],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

trackerSchema.virtual('totalPrice').get(function () {
  return (this.price || 0) + (this.deliveryPrice || 0);
});

trackerSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Tracker', trackerSchema);
