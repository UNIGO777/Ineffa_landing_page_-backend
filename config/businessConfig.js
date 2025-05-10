// Configuration for business hours and time slots

export const businessConfig = {
  // Business hours in 24-hour format
  businessHours: {
    startTime: '10:00', // 10 AM
    endTime: '17:00',   // 5 PM
    lunchStartTime: '14:00', // 2 PM
    lunchEndTime: '15:00'    // 3 PM
  },
  
  // Time slot duration in minutes
  slotDuration: 30,
  
  // Days of week when business is open (0 = Sunday, 1 = Monday, etc.)
  // Now open all week including weekends
  workingDays: [0, 1, 2, 3, 4, 5, 6],
  
  // Function to generate time slots for a given date
  generateTimeSlots: function(date) {
    const { startTime, endTime, lunchStartTime, lunchEndTime } = this.businessHours;
    
    // Check if the day is a working day
    const dayOfWeek = new Date(date).getDay();
    if (!this.workingDays.includes(dayOfWeek)) {
      return [];
    }
    
    const slots = [];
    
    // Convert time strings to minutes for easier calculation
    const startMinutes = convertTimeToMinutes(startTime);
    const endMinutes = convertTimeToMinutes(endTime);
    const lunchStartMinutes = convertTimeToMinutes(lunchStartTime);
    const lunchEndMinutes = convertTimeToMinutes(lunchEndTime);
    
    // Generate slots from start time to lunch time
    for (let time = startMinutes; time < lunchStartMinutes; time += this.slotDuration) {
      const slotStartTime = convertMinutesToTimeString(time);
      const slotEndTime = convertMinutesToTimeString(time + this.slotDuration);
      
      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime
      });
    }
    
    // Generate slots from lunch end time to end time
    for (let time = lunchEndMinutes; time < endMinutes; time += this.slotDuration) {
      const slotStartTime = convertMinutesToTimeString(time);
      const slotEndTime = convertMinutesToTimeString(time + this.slotDuration);
      
      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime
      });
    }
    
    return slots;
  }
};

// Helper function to convert time string (HH:MM) to minutes since start of day
const convertTimeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes to time string (HH:MM)
const convertMinutesToTimeString = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};