export async function getMemberWeeklyHours() {
    const current = getStartOfWeek();
    const end = new Date();
    end.setDate(end.getDate() + 1);

    const fetches = [];

    while (current <= end) {
        const dateStr = formatLocalDate(current);
        for (let hour = 0; hour <= 23; hour++) {
            const hourStr = String(hour).padStart(2, '0');
            const url = `https://naabou.github.io/41BIS/login_log/${dateStr}/${hourStr}.json`;

            fetches.push(
                fetch(url)
                    .then(r => r.ok ? r.json() : [])
                    .catch(() => [])
            );
        }
        current.setDate(current.getDate() + 1);
    }

    const results = await Promise.all(fetches);
    return results.flat();
}

function formatLocalDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getStartOfWeek() {
    const d = new Date();
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    return new Date(new Date(d.setDate(diff)).setHours(0, 0, 0, 0));
}