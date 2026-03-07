async function test() {
    console.log("Testing POST to /api/generate...");
    try {
        const res = await fetch('http://localhost:5000/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: "create a simple welcome feedback form"
            })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.error(e);
    }
}

test();
