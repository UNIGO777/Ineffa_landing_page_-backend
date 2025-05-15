import mongoose from "mongoose";

const emailReminderSchema = new mongoose.Schema({
  consultationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation',
    required: true
  },
  reminders: [
    {
      subject: {
        type: String,
        required: true,
        trim: true
      },
      heading: {
        type: String,
        required: true,
        trim: true
      },
      subheading: {
        type: String,
        trim: true
      },
      scheduledTime: {
        type: Date,
        required: true
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date
      }
    }
  ]
}, {
  timestamps: true
});

const EmailReminder = mongoose.model('EmailReminder', emailReminderSchema);

export default EmailReminder;
