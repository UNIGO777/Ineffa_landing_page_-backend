const getUnixTimestampFromLocal = (slotDate, slotStartTime) => {
    if (!slotDate || !slotStartTime) {
      throw new Error('Both slotDate and slotStartTime are required.');
    }
  
    const date = new Date(slotDate);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid slotDate format. Expected 'YYYY-MM-DD'.");
    }
  
    const [hour, minute] = slotStartTime.split(':').map(Number);
    if (
      isNaN(hour) || isNaN(minute) ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59
    ) {
      throw new Error("Invalid slotStartTime format. Expected 'HH:mm'.");
    }
  
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const day = date.getDate();
  
    const localDate = new Date(year, month, day, hour, minute, 0);
    
    return Math.floor(localDate.getTime() / 1000);
};


export default getUnixTimestampFromLocal;
