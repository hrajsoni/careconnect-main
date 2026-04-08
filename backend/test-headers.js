async function test() {
  const reqRes = await fetch("http://localhost:8000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@careconnect.com", password: "admin123" })
  });
  console.log("Headers:");
  console.log([...reqRes.headers.entries()]);
  const setCookie = reqRes.headers.getSetCookie ? reqRes.headers.getSetCookie() : reqRes.headers.get('set-cookie');
  console.log("Set-Cookie:", setCookie);
}
test();
