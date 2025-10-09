class GeoAdapter {
	parse(input) {
		if (typeof input !== 'string') {
			return { latitude: 'INVALID', longitude: 'INVALID' };
		}
		const parts = input.split(',');
		if (parts.length !== 2) {
			return { latitude: 'INVALID', longitude: 'INVALID' };
		}
		const lat = Number(parts[0].trim());
		const lng = Number(parts[1].trim());
		const okLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
		const okLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;
		return {
			latitude: okLat ? lat : 'INVALID',
			longitude: okLng ? lng : 'INVALID'
		};
	}
}

const input = document.getElementById('geo-input');
const output = document.getElementById('output');
const btn = document.getElementById('convert');
const adapter = new GeoAdapter();

btn.addEventListener('click', () => {
	const lines = input.value.split('\n').map(s => s.trim()).filter(Boolean);
	const results = lines.map(line => adapter.parse(line));
	output.textContent = JSON.stringify(results, null, 2);
});


