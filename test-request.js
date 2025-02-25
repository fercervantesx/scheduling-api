const axios = require('axios');

async function testAppointmentCreation() {
  try {
    const response = await axios.post('http://localhost:3005/api/appointments', {
      serviceId: "74B1FEF7-AB2A-4A92-A04C-4CDC10F11427",
      locationId: "B8F77F03-22F5-40CA-85F7-82D28E3185B3",
      employeeId: "2D4A1ECA-6401-4CC6-BFCF-50B920651F38",
      startTime: "2025-02-25T20:00:00.000Z"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'itinaritravel',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAppointmentCreation();
