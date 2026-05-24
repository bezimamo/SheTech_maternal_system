const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// You need a valid token to run the tests
const email = 'doctor@test.com'; // assuming this exists
const password = 'password123'; // assuming this is the password

async function runTests() {
  try {
    console.log('--- Starting Workflow Verification Tests ---');

    // 1. Login to get token
    console.log('Logging in...');
    let token = '';
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password
      });
      token = loginRes.data.token;
      console.log('Login successful.');
    } catch (e) {
      console.log('Login failed, we will skip the automated test and ask the user to verify manually.', e.message);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // --- Mother & Td Testing ---
    // 2. Create a Mother
    console.log('Creating a test mother...');
    const motherRes = await axios.post(`${API_BASE}/mothers`, {
      name: `Test Mother ${Date.now()}`,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      dateOfBirth: '1995-01-01',
      bloodType: 'O+',
      medicalHistory: []
    }, { headers });
    const motherId = motherRes.data._id;
    console.log(`Created mother: ${motherId}`);

    // 3. Record Td1
    console.log('Recording Td1 (Baseline)...');
    await axios.post(`${API_BASE}/pregnancy/maternal-vaccines`, {
      motherId,
      vaccineName: 'Td1',
      doseNumber: 1,
      givenDate: new Date().toISOString().split('T')[0],
      givenBy: motherRes.data.createdBy || '000000000000000000000000',
      givenAt: motherRes.data.registeredAtHospital || '000000000000000000000000'
    }, { headers });
    console.log('Td1 recorded successfully.');

    // 4. Try Recording Td2 (2 weeks later) -> Should fail
    console.log('Attempting to record Td2 two weeks after Td1 (Should fail)...');
    try {
      const givenDate2Weeks = new Date();
      givenDate2Weeks.setDate(givenDate2Weeks.getDate() + 14);
      await axios.post(`${API_BASE}/pregnancy/maternal-vaccines`, {
        motherId,
        vaccineName: 'Td2',
        doseNumber: 2,
        givenDate: givenDate2Weeks.toISOString().split('T')[0],
        givenBy: motherRes.data.createdBy || '000000000000000000000000',
        givenAt: motherRes.data.registeredAtHospital || '000000000000000000000000'
      }, { headers });
      console.error('❌ Td2 (2 weeks) succeeded when it should have failed!');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`✅ Td2 (2 weeks) failed correctly: ${err.response.data.message}`);
      } else {
        console.error('❌ Td2 (2 weeks) failed with unexpected error', err.message);
      }
    }

    // 5. Try Recording Td2 (5 weeks later) -> Should succeed
    console.log('Attempting to record Td2 five weeks after Td1 (Should succeed)...');
    try {
      const givenDate5Weeks = new Date();
      givenDate5Weeks.setDate(givenDate5Weeks.getDate() + 35);
      await axios.post(`${API_BASE}/pregnancy/maternal-vaccines`, {
        motherId,
        vaccineName: 'Td2',
        doseNumber: 2,
        givenDate: givenDate5Weeks.toISOString().split('T')[0],
        givenBy: motherRes.data.createdBy || '000000000000000000000000',
        givenAt: motherRes.data.registeredAtHospital || '000000000000000000000000'
      }, { headers });
      console.log('✅ Td2 (5 weeks) succeeded correctly.');
    } catch (err) {
      console.error('❌ Td2 (5 weeks) failed when it should have succeeded!', err.response?.data || err.message);
    }

    // --- Child & Vaccine Block Testing ---
    console.log('\nCreating a test child...');
    const childRes = await axios.post(`${API_BASE}/children`, {
      name: `Test Child ${Date.now()}`,
      birthDate: new Date().toISOString().split('T')[0],
      gender: 'MALE',
      motherId: motherId
    }, { headers });
    const childId = childRes.data._id;
    console.log(`Created child: ${childId}`);

    console.log('Generating vaccine schedule...');
    await axios.post(`${API_BASE}/vaccinations/schedule/${childId}`, {}, { headers });
    console.log('Vaccine schedule generated.');

    console.log('Fetching vaccines list...');
    const vaccinesRes = await axios.get(`${API_BASE}/vaccinations/vaccines`, { headers });
    const vaccines = vaccinesRes.data;
    
    // Find a Block 2 vaccine record (e.g. OPV Dose 1)
    console.log('Fetching child vaccination records...');
    const recordsRes = await axios.get(`${API_BASE}/vaccinations/records/child/${childId}`, { headers });
    const records = recordsRes.data;

    const opv1Record = records.find(r => r.vaccineId.code === 'OPV' && r.doseNumber === 1);
    
    if (opv1Record) {
      console.log('Attempting to administer Block 2 vaccine (OPV 1) without Block 1 completion...');
      try {
        await axios.patch(`${API_BASE}/vaccinations/records/${opv1Record._id}/administer`, {
          administeredDate: new Date().toISOString().split('T')[0],
        }, { headers });
        console.error('❌ Block 2 administration succeeded when it should have failed!');
      } catch (err) {
        if (err.response && err.response.status === 400) {
          console.log(`✅ Block 2 administration failed correctly: ${err.response.data.message}`);
        } else {
          console.error('❌ Block 2 administration failed with unexpected error', err.response?.data || err.message);
        }
      }
    } else {
      console.log('OPV1 record not found, skipping block test.');
    }

    console.log('\n--- Automated Tests Complete ---');
  } catch (err) {
    console.error('Test execution failed:', err.message);
  }
}

runTests();
