class CurrencyAdapter {
	normalize(x) {
		if (typeof x === 'string') {
			const s = x.trim();
			const colon = s.split(':');
			if (colon.length === 2) {
				const cur = colon[0].trim();
				const rate = Number(colon[1].trim());
				return Number.isFinite(rate) ? { currency: cur, rate } : null;
			}
			const space = s.split(/\s+/);
			if (space.length === 2) {
				const cur = space[0].trim();
				const rate = Number(space[1].trim());
				return Number.isFinite(rate) ? { currency: cur, rate } : null;
			}
			return null;
		}
		if (Array.isArray(x) && x.length === 2) {
			const cur = String(x[0]);
			const rate = Number(x[1]);
			return Number.isFinite(rate) ? { currency: cur, rate } : null;
		}
		if (x && typeof x === 'object') {
			if ('currency' in x && 'rate' in x) {
				const cur = String(x.currency);
				const rate = Number(x.rate);
				return Number.isFinite(rate) ? { currency: cur, rate } : null;
			}
			if ('code' in x && 'value' in x) {
				const cur = String(x.code);
				const rate = Number(x.value);
				return Number.isFinite(rate) ? { currency: cur, rate } : null;
			}
		}
		return null;
	}
}

const input = document.getElementById('currency-input');
const output = document.getElementById('currency-output');
const normalizeBtn = document.getElementById('normalize');
const currencyAdapter = new CurrencyAdapter();

normalizeBtn.addEventListener('click', () => {
	const lines = input.value.split('\n').map(s => s.trim()).filter(Boolean);
	const parsed = lines.map(line => {
		try {
			const val = (line.startsWith('{') || line.startsWith('[')) ? JSON.parse(line) : line;
			return currencyAdapter.normalize(val);
		} catch {
			return null;
		}
	});
	output.textContent = JSON.stringify(parsed, null, 2);
});


