

async function test() {
    console.log("Testing POST to /api/forms without token...");
    try {
        const res = await fetch('http://localhost:5000/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: `form_test_${Date.now()}`,
                title: "Test Form",
                questions: [],
                theme: {}
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
