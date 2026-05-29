import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Telegram user id (numeric, stored as string for safety)
    telegramId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },
    photoUrl: { type: String, default: '' },

    // Telegram chat_id for sending notifications (same as telegramId for private chats)
    chatId: { type: String, default: '' },

    // Whether user wants to receive notifications
    notificationsEnabled: { type: Boolean, default: true },

    // Trackers this user follows (subscribed to) but did not create
    connectedTrackers: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Tracker' },
    ],
  },
  { timestamps: true }
);

userSchema.virtual('displayName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.username || 'User';
});

userSchema.set('toJSON', { virtuals: true });

export default mongoose.model('User', userSchema);
