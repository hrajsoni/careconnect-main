const fs = require('fs');

const BASE_URL = 'http://localhost:8000';

let currentCookies = {};
let csrfToken = '';

async function fetchCsrf() {
  const res = await fetch(`${BASE_URL}/api/auth/csrf-token`);
  const data = await res.json();
  csrfToken = data.csrfToken;
}

function getCookieStr(cookiesList) {
  const arr = [];
  for (const c of cookiesList) {
    if (currentCookies[c]) arr.push(`${c}=${currentCookies[c]}`);
  }
  return arr.join('; ');
}

async function req(method, path, body = null, token = null, authCookies = []) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`; // Just in case it's still Bearer
  
  if (authCookies.length > 0) {
    headers['Cookie'] = getCookieStr(authCookies);
  }

  if (method !== 'GET' && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  // Extract Set-Cookie
  const setCookieHeaders = res.headers.get('set-cookie');
  if (setCookieHeaders) {
     const match = setCookieHeaders.match(/authToken=([^;]+)/);
     if (match) currentCookies['authToken'] = match[1];
  }

  // Update csrf token if new one is in body... but actually, its from api/auth/csrf-token
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { ok: res.ok, status: res.status, data };
}

async function run() {
  await fetchCsrf();

  console.log('--- PHASE 1: CREATE USERS');
  
  async function createOrLogin(name, email, password, role, extra) {
    let res = await req('POST', '/api/auth/signup', {
      name, email, password, role, ...extra
    });
    console.log(`Create ${name}: ${res.ok ? 'PASS' : 'FAIL'}`, res.data);
    
    if (!res.ok && res.data?.error === 'User already exists') {
      res = await req('POST', '/api/auth/login', { email, password });
    }
    return res.data?.data?.user?.id || res.data?.data?.user?._id || res.data?.data?._id || res.data?.user?.id || res.data?.user?._id || res.data?._id;
  }

  const nurseId = await createOrLogin('Demo Nurse Priya', 'nurse@demo.com', 'Nurse@123', 'nurse', {
    phone: '9876543210', location: 'Mumbai', qualification: 'BSc Nursing',
    experience: '5', registrationNumber: 'MH-NURSE-2024'
  });

  const patientId = await createOrLogin('Demo Patient Raj', 'patient@demo.com', 'Patient@123', 'patient', {
    phone: '9876543211', location: 'Mumbai'
  });

  const assistantId = await createOrLogin('Demo Care Assistant Amit', 'assistant@demo.com', 'Assistant@123', 'care_assistant', {
    phone: '9876543212', location: 'Mumbai', qualification: 'Diploma in Healthcare',
    experience: '3', registrationNumber: 'MH-CA-2024'
  });

  const nurse2Id = await createOrLogin('Demo Nurse Sunita', 'nurse2@demo.com', 'Nurse@123', 'nurse', {
    phone: '9876543213', location: 'Mumbai', qualification: 'GNM Nursing',
    experience: '8', registrationNumber: 'MH-NURSE-2025'
  });

  console.log('\n--- PHASE 2: ADMIN');
  const aLogin = await req('POST', '/api/auth/login', { email: 'admin@careconnect.com', password: 'admin123' });
  const adminToken = aLogin.data?.data?.token || aLogin.data?.token;
  currentCookies['adminToken'] = currentCookies['authToken'];
  console.log(`Admin Login: ${aLogin.ok ? 'PASS' : 'FAIL'}`);

  // Approve nurses
  const pNurses = await req('GET', '/api/admin/nurses?status=pending', null, adminToken, ['adminToken']);
  console.log(`Fetch pending nurses: ${pNurses.ok ? 'PASS' : 'FAIL'}`, pNurses.data?.data?.length);

  for (const n of pNurses.data?.data || []) {
    const aRes = await req('PUT', `/api/admin/approve/${n._id}`, { isApproved: true, verificationStatus: "approved" }, adminToken, ['adminToken']);
    console.log(`Approve nurse ${n._id}: ${aRes.ok ? 'PASS' : 'FAIL'}`);
  }

  // Approve care assistants
  const pAssts = await req('GET', '/api/admin/care-assistants?status=pending', null, adminToken, ['adminToken']);
  console.log(`Fetch pending CA: ${pAssts.ok ? 'PASS' : 'FAIL'}`, pAssts.data?.data?.length);

  for (const a of pAssts.data?.data || []) {
    const aRes = await req('PUT', `/api/admin/approve/${a._id}`, { isApproved: true, verificationStatus: "approved" }, adminToken, ['adminToken']);
    console.log(`Approve CA ${a._id}: ${aRes.ok ? 'PASS' : 'FAIL'}`);
  }

  // Also make sure newly created ones are approved if not returned in `pending` just in case
  await req('PUT', `/api/admin/approve/${nurseId}`, { isApproved: true, verificationStatus: "approved" }, adminToken, ['adminToken']);
  await req('PUT', `/api/admin/approve/${nurse2Id}`, { isApproved: true, verificationStatus: "approved" }, adminToken, ['adminToken']);
  await req('PUT', `/api/admin/approve/${assistantId}`, { isApproved: true, verificationStatus: "approved" }, adminToken, ['adminToken']);

  const aStats = await req('GET', '/api/admin/stats', null, adminToken, ['adminToken']);
  console.log(`Admin stats: ${aStats.ok ? 'PASS' : 'FAIL'}`, aStats.data);

  console.log('\n--- PHASE 3: NURSE');
  const nLogin = await req('POST', '/api/auth/login', { email: 'nurse@demo.com', password: 'Nurse@123' });
  const nurseToken = nLogin.data?.data?.token || nLogin.data?.token;
  currentCookies['nurseToken'] = currentCookies['authToken'];
  console.log(`Nurse Login: ${nLogin.ok ? 'PASS' : 'FAIL'}`);

  const s1 = await req('PUT', '/api/auth/save-services', {
    id: nurseId,
    services: ["Blood Pressure Monitoring", "Blood Sugar Check", "Wound Dressing", "Injection (IV / IM)", "Temperature Check"]
  }, nurseToken, ['nurseToken']);
  console.log(`Save services: ${s1.ok ? 'PASS' : 'FAIL'}`, s1.data);

  const s2 = await req('PUT', '/api/auth/save-service-prices', {
    id: nurseId,
    servicePrices: { "Blood Pressure Monitoring": 500, "Blood Sugar Check": 400, "Wound Dressing": 800, "Injection (IV / IM)": 600, "Temperature Check": 300 }
  }, nurseToken, ['nurseToken']);
  console.log(`Save service prices: ${s2.ok ? 'PASS' : 'FAIL'}`, s2.data);

  const s3 = await req('PUT', '/api/auth/save-availability', {
    id: nurseId,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "09:00", endTime: "18:00", slotDuration: 60, isAvailableForBooking: true
  }, nurseToken, ['nurseToken']);
  console.log(`Save availability: ${s3.ok ? 'PASS' : 'FAIL'}`, s3.data);


  console.log('\n--- PHASE 4: PATIENT');
  const pLogin = await req('POST', '/api/auth/login', { email: 'patient@demo.com', password: 'Patient@123' });
  const patientToken = pLogin.data?.data?.token || pLogin.data?.token;
  currentCookies['patientToken'] = currentCookies['authToken'];
  console.log(`Patient Login: ${pLogin.ok ? 'PASS' : 'FAIL'}`);

  const bNurses = await req('GET', '/api/nurses/approved?location=Mumbai', null, patientToken, ['patientToken']);
  console.log(`Browse nurses: ${bNurses.ok ? 'PASS' : 'FAIL'} count: ${bNurses.data?.data?.length}`);

  const cBook = await req('POST', '/api/bookings/create', {
    nurseId, service: "Blood Pressure Monitoring", date: "2026-04-10", time: "10:00", location: "Mumbai", notes: "Please bring BP monitor"
  }, patientToken, ['patientToken']);
  console.log(`Create booking: ${cBook.ok ? 'PASS' : 'FAIL'}`, cBook.data);
  const bookingId = cBook.data?.data?.booking?._id || cBook.data?.data?._id || cBook.data?._id;

  const cPay = await req('POST', '/api/payments', {
    bookingId, amount: 500, service: "Blood Pressure Monitoring", nurseId
  }, patientToken, ['patientToken']);
  console.log(`Create payment: ${cPay.ok ? 'PASS' : 'FAIL'}`, cPay.data);
  const paymentId = cPay.data?.data?.payment?._id || cPay.data?.data?._id || cPay.data?._id;

  if (paymentId) {
    const mPay = await req('PUT', `/api/payments/mark-paid/${paymentId}`, { method: "online", reference: "DEMO-PAY-001" }, patientToken, ['patientToken']);
    console.log(`Mark payment paid: ${mPay.ok ? 'PASS' : 'FAIL'}`, mPay.data);
  }

  const gRep = await req('GET', `/api/reports/patient-reports/${patientId}`, null, patientToken, ['patientToken']);
  console.log(`Fetch patient reports: ${gRep.ok ? 'PASS' : 'FAIL'}`, gRep.data);

  const gBook = await req('GET', `/api/bookings/patient/${patientId}`, null, patientToken, ['patientToken']);
  console.log(`Fetch patient bookings: ${gBook.ok ? 'PASS' : 'FAIL'}`);

  const fPay = await req('GET', `/api/payments/patient/${patientId}`, null, patientToken, ['patientToken']);
  console.log(`Fetch patient payments: ${fPay.ok ? 'PASS' : 'FAIL'}`, fPay.data);


  console.log('\n--- PHASE 5: NURSE WORKFLOW');
  const nbGet = await req('GET', `/api/bookings/nurse/${nurseId}`, null, nurseToken, ['nurseToken']);
  console.log(`Fetch nurse bookings: ${nbGet.ok ? 'PASS' : 'FAIL'} size ${nbGet.data?.data?.length}`);

  if (bookingId) {
    const nAccept = await req('PUT', `/api/bookings/status/${bookingId}`, { status: "accepted" }, nurseToken, ['nurseToken']);
    console.log(`Accept booking: ${nAccept.ok ? 'PASS' : 'FAIL'}`, nAccept.data);

    const nCompl = await req('PUT', `/api/bookings/visit-summary/${bookingId}`, {
      bloodPressure: "120/80", temperature: "98.6", sugarLevel: "110", oxygenLevel: "98",
      pulseRate: "72", treatmentProvided: "BP monitoring done, readings normal",
      notes: "Patient is stable.", followUpRequired: false, followUpNotes: "", status: "completed"
    }, nurseToken, ['nurseToken']);
    console.log(`Submit summary: ${nCompl.ok ? 'PASS' : 'FAIL'}`, nCompl.data);
  }

  const nPay = await req('GET', `/api/payments/nurse/${nurseId}`, null, nurseToken, ['nurseToken']);
  console.log(`Nurse payments: ${nPay.ok ? 'PASS' : 'FAIL'}`, nPay.data);

  if (bookingId) {
    const invTrans = await req('PUT', `/api/bookings/status/${bookingId}`, { status: "cancelled" }, nurseToken, ['nurseToken']);
    console.log(`Invalid transition test (expect FAIL): ${!invTrans.ok ? 'PASS' : 'FAIL'}`, invTrans.data);
  }

  console.log('\n--- PHASE 6: CARE ASSISTANT');
  const cAsstLogin = await req('POST', '/api/auth/login', { email: 'assistant@demo.com', password: 'Assistant@123' });
  const caToken = cAsstLogin.data?.data?.token || cAsstLogin.data?.token;
  currentCookies['caToken'] = currentCookies['authToken'];

  const crReq = await req('POST', '/api/care-assistant-requests', {
    requestType: "doctor_visit", scheduledDate: "2026-04-11", scheduledTime: "11:00",
    pickupLocation: "Andheri East, Mumbai", destination: "Kokilaben Hospital", notes: "Wheelchair assistance"
  }, patientToken, ['patientToken']);
  console.log(`Create CA request (Patient): ${crReq.ok ? 'PASS' : 'FAIL'}`, crReq.data);
  const reqId = crReq.data?.data?.request?._id || crReq.data?.data?._id || crReq.data?._id || crReq.data?.request?._id;

  const cOpn = await req('GET', '/api/care-assistant-requests/open', null, caToken, ['caToken']);
  console.log(`CA open requests: ${cOpn.ok ? 'PASS' : 'FAIL'} count: ${cOpn.data?.data?.length}`);

  if (reqId) {
    const cAcc = await req('PUT', `/api/care-assistant-requests/accept/${reqId}`, null, caToken, ['caToken']);
    console.log(`CA accept request: ${cAcc.ok ? 'PASS' : 'FAIL'}`, cAcc.data);

    const cInp = await req('PUT', `/api/care-assistant-requests/status/${reqId}`, { status: "in_progress" }, caToken, ['caToken']);
    console.log(`CA status in_progress: ${cInp.ok ? 'PASS' : 'FAIL'}`, cInp.data);

    const cCom = await req('PUT', `/api/care-assistant-requests/status/${reqId}`, { status: "completed" }, caToken, ['caToken']);
    console.log(`CA status completed: ${cCom.ok ? 'PASS' : 'FAIL'}`, cCom.data);

    const cInv = await req('PUT', `/api/care-assistant-requests/status/${reqId}`, { status: "cancelled" }, caToken, ['caToken']);
    console.log(`CA invalid transition test (expect FAIL): ${!cInv.ok ? 'PASS' : 'FAIL'}`, cInv.data);
  }

  const pcReq = await req('GET', `/api/care-assistant-requests/patient/${patientId}`, null, patientToken, ['patientToken']);
  console.log(`Patient CA requests: ${pcReq.ok ? 'PASS' : 'FAIL'} count ${pcReq.data?.data?.length}`);

}

run().catch(console.error);
