import EventSource from 'eventsource';

const projectRoot = 'C:\\Users\\Zenchant\\codex\\beadboard';
const url = `http://localhost:3001/api/events?projectRoot=${encodeURIComponent(projectRoot)}`;

console.log(`Connecting to ${url}...`);
const es = new EventSource(url);

es.on('open', () => console.log('OPEN'));
es.on('error', (e) => {
    console.error('ERROR');
    console.error(e);
});

['message', 'issues', 'telemetry', 'activity'].forEach(event => {
    es.addEventListener(event, (e) => {
        console.log(`[${event.toUpperCase()}]`, e.data);
    });
});

setTimeout(() => {
    console.log('Closing after 30s');
    es.close();
}, 60000);
