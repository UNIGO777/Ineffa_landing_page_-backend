import mongoose from "mongoose";
import createZoomMeeting from "../Meeting.js";

const consultationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    },
    slotDate: {
        type: Date,
        required: true
    },
    slotStartTime: {
        type: String,
        required: true
    },
    slotEndTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'booked', 'completed', 'cancelled', 'scheduled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    meetingLink: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create Zoom meeting when consultation is created
consultationSchema.pre('save', async function(next) {
    try {
        if (this.isNew) {
            // Convert date and time to timestamp
           
            const startTime = new Date(this.slotDate);
            const [hours, minutes] = this.slotStartTime.split(':');
            startTime.setHours(parseInt(hours), parseInt(minutes));
            
            const endTime = new Date(this.slotDate);
            const [endHours, endMinutes] = this.slotEndTime.split(':');
            endTime.setHours(parseInt(endHours), parseInt(endMinutes));

            // Create Zoom meeting
            const meeting = await createZoomMeeting({
                topic: `Consultation with ${this.name}`,
                start_time: startTime.toISOString(),
                duration: Math.round((endTime - startTime) / (1000 * 60)), // Duration in minutes
                timezone: 'Asia/Kolkata', // Changed to IST timezone
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: true,
                    waiting_room: false
                },
            });

            if (!meeting) {
                throw new Error('Failed to generate Zoom meeting link');
            }

            this.meetingLink = meeting;
        }
        next();
    } catch (error) {
        console.error('Error creating Zoom meeting:', error);
        next(error);
    }
});

export default mongoose.model('Consultation', consultationSchema);
